"use server";

import { verifySession } from "@/lib/auth/dal";
import type { ActionResult } from "@/lib/budget/actions";
import { isPeriod } from "@/lib/budget/schemas";
import { CALC_SPEC_VERSION } from "@/lib/calc/version";
import { loadReview } from "@/lib/review/queries";
import { createClient } from "@/lib/supabase/server";

export type ExportResult = ActionResult & { url?: string };

/** A download link works for 10 minutes (PRD US-39 AC4). Nothing is stored: the file is built when it's downloaded. */
const LINK_MINUTES = 10;
const MAX_PER_HOUR = 20;

async function createExport(
  kind: "pdf_summary" | "csv_all",
  period: string | null,
  includeReflections: boolean,
): Promise<ExportResult> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const [{ data: household }, { count }] = await Promise.all([
    supabase.from("households").select("id").single(),
    supabase.from("exports").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  if (!household)
    return { status: "error", message: "We couldn't create your download. Try again." };
  if ((count ?? 0) >= MAX_PER_HOUR)
    return {
      status: "error",
      message: "You've made a lot of downloads in the last hour. Please try again a little later.",
    };
  // The insert writes the audit event (trigger audit_export_created).
  const { data, error } = await supabase
    .from("exports")
    .insert({
      household_id: household.id,
      kind,
      period,
      include_reflections: includeReflections,
      spec_version: CALC_SPEC_VERSION,
      expires_at: new Date(Date.now() + LINK_MINUTES * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !data)
    return { status: "error", message: "We couldn't create your download. Try again." };
  return { status: "ok", url: `/api/exports/${data.id}` };
}

/** Monthly summary PDF (PRD US-39). Reflections only when the user ticks "Include my reflections". */
export async function createReviewPdf(
  period: string,
  includeReflections: boolean,
): Promise<ExportResult> {
  await verifySession(`/app/review/${period}`);
  if (!isPeriod(period)) return { status: "error", message: "Choose a month to download." };
  const review = await loadReview(period);
  if (!review?.open || review.review.empty)
    return { status: "error", message: "There's nothing to download for this month yet." };
  return createExport("pdf_summary", period, includeReflections === true);
}

/** All my data as a zip of CSVs (PRD US-43). Available to every signed-in user. */
export async function createDataExport(): Promise<ExportResult> {
  await verifySession("/app/settings/data");
  return createExport("csv_all", null, false);
}
