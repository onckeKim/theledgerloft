import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildReview } from "@/lib/review/review";
import type { LoadedReview } from "@/lib/review/queries";
import { DISCLAIMER, reviewPdf } from "./pdf";

/** Synthetic August 2026 review (L4 vector B2 numbers); no real data. */
function review(extraCategories = 0): LoadedReview {
  const lines = [
    ["Housing", 620_000, 620_000],
    ["Groceries", 340_000, 331_000],
    ["Transport", 140_000, 152_000],
    ...Array.from({ length: extraCategories }, (_, i) => [
      `Extra category ${i + 1}`,
      10_000,
      5_000,
    ]),
  ] as [string, number, number][];
  return {
    period: "2026-08",
    current: "2026-09",
    prev: "2026-07",
    next: "2026-09",
    start: "2026-08-01",
    end: "2026-08-31",
    opensOn: "2026-08-29",
    open: true,
    future: false,
    hasBudget: true,
    review: buildReview({
      incomePlanned: [{ planned: 2_174_000 }],
      lines: lines.map(([name, planned], i) => ({ categoryId: `c${i}`, name, planned, sort: i })),
      categoryNames: new Map(),
      tx: [
        { kind: "income", categoryId: null, amount: 2_238_000 },
        ...lines.map(([, , actual], i) => ({
          kind: "outflow" as const,
          categoryId: `c${i}`,
          amount: actual,
        })),
      ],
      saved: [{ name: "Emergency fund", cents: 80_000 }],
      debtPayments: [{ name: "Store card", cents: 45_000 }],
    }),
    checkin: {
      wentWell: "Meal planning on Sundays helped.",
      surprised: "Going out added up.",
      nextActions: ["Check the electricity reading mid-month"],
      completedAt: "2026-08-30T10:00:00Z",
    },
  };
}

async function read(bytes: Uint8Array) {
  const pdf = await getDocument({ data: bytes.slice(), useSystemFonts: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(
      content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .replace(/ /g, " "),
    );
  }
  const meta = await pdf.getMetadata();
  return { pages, text: pages.join("\n"), title: (meta.info as { Title?: string }).Title };
}

describe("monthly review PDF (US-39)", () => {
  it("has the month, the numbers, the disclaimer and the spec version", async () => {
    const started = Date.now();
    const bytes = await reviewPdf(review(), { reflections: false, createdOn: "24 September 2026" });
    expect(Date.now() - started).toBeLessThan(5000); // N3
    const { text, title, pages } = await read(bytes);
    expect(pages).toHaveLength(1);
    expect(title).toBe("Monthly review, August 2026");
    expect(text).toContain("August 2026");
    expect(text).toContain("R 22 380,00");
    expect(text).toContain("R 90,00 under");
    expect(text).toContain("R 120,00 over");
    expect(text).toContain("R 640,00 more");
    expect(text).toContain(DISCLAIMER);
    expect(text).toContain("Calculation spec v1.0");
    expect(text).toContain("Saved in August");
  });

  it("includes reflections only when chosen (AC2)", async () => {
    const without = await read(await reviewPdf(review(), { reflections: false, createdOn: "x" }));
    expect(without.text).not.toContain("Meal planning");
    expect(without.text).not.toContain("Your reflection");
    const withIt = await read(await reviewPdf(review(), { reflections: true, createdOn: "x" }));
    expect(withIt.text).toContain("Meal planning on Sundays helped.");
    expect(withIt.text).toContain("Check the electricity reading mid-month");
  });

  it("flows onto more pages with the footer on each", async () => {
    const { pages } = await read(
      await reviewPdf(review(60), { reflections: true, createdOn: "x" }),
    );
    expect(pages.length).toBeGreaterThan(1);
    pages.forEach((p, i) => {
      expect(p).toContain(DISCLAIMER);
      expect(p).toContain(`Page ${i + 1} of ${pages.length}`);
    });
  });
});
