import { getSession } from "@/lib/auth/dal";
import { isUuid } from "@/lib/budget/schemas";
import { dataZip } from "@/lib/export/data";
import { reviewPdf } from "@/lib/export/pdf";
import { loadReview } from "@/lib/review/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Download an export (PRD US-39, US-43). The export row is read as the signed-in user, so only its own
 * household can download it, and only until it expires (10 minutes). The file is built now and never stored.
 */
const text = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));

export async function GET(_request: Request, ctx: RouteContext<"/api/exports/[id]">) {
  const session = await getSession();
  if (!session) return text("Please sign in to download this.", 401);
  const { id } = await ctx.params;
  if (!isUuid(id)) return text("Download not found.", 404);

  const supabase = await createClient();
  const { data: exp } = await supabase
    .from("exports")
    .select("id, kind, period, include_reflections, expires_at, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!exp) return text("Download not found.", 404);
  if (Date.parse(exp.expires_at) < Date.now())
    return text("This download link has expired. Make a new one from the page you came from.", 410);

  const createdOn = longDate(exp.created_at);
  let body: Uint8Array;
  let type: string;
  let filename: string;
  if (exp.kind === "pdf_summary" && exp.period) {
    const review = await loadReview(exp.period);
    if (!review) return text("Download not found.", 404);
    body = await reviewPdf(review, { reflections: exp.include_reflections, createdOn });
    type = "application/pdf";
    filename = `ledger-loft-review-${exp.period}.pdf`;
  } else if (exp.kind === "csv_all") {
    body = await dataZip(createdOn);
    type = "application/zip";
    filename = `ledger-loft-data-${exp.created_at.slice(0, 10)}.zip`;
  } else return text("Download not found.", 404);

  return new Response(body as unknown as BodyInit, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
