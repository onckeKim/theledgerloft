import { budgetSummary } from "@/lib/calc/budget";
import { addDays } from "@/lib/calc/period";
import { formatZAR } from "@/lib/money";

/**
 * Monthly review (PRD US-38, L4 §4 worked example B2). Pure, so the page and the PDF show the same numbers.
 * Differences are in words: spending lines are planned − actual ("under", "over"), income is actual − planned
 * ("more", "less"). Nothing here judges or recommends.
 */

/** The check-in opens 3 days before the period ends (the last three days) and stays open afterwards. */
export const checkinOpensOn = (endsOn: string) => addDays(endsOn, -2);

export function spendingDifference(planned: number, actual: number): string {
  const d = planned - actual;
  if (d === 0) return "On plan";
  return d > 0 ? `${formatZAR(d)} under` : `${formatZAR(-d)} over`;
}

export function incomeDifference(planned: number, actual: number): string {
  const d = actual - planned;
  if (d === 0) return "On plan";
  return d > 0 ? `${formatZAR(d)} more` : `${formatZAR(-d)} less`;
}

export type ReviewInput = {
  incomePlanned: { planned: number }[];
  lines: { categoryId: string; name: string; planned: number; sort: number }[];
  categoryNames: Map<string, string>;
  tx: { kind: "income" | "outflow" | "refund"; categoryId: string | null; amount: number }[];
  saved: { name: string; cents: number }[];
  debtPayments: { name: string; cents: number }[];
};

export function buildReview(input: ReviewInput) {
  const s = budgetSummary({
    income: input.incomePlanned,
    lines: input.lines.map((l) => ({ category: l.categoryId, planned: l.planned })),
    tx: input.tx.map((t) => ({
      kind: t.kind,
      category: t.categoryId ?? undefined,
      amount: t.amount,
    })),
  });
  const byId = new Map(s.categories.map((c) => [c.category, c]));
  const rows = [...input.lines]
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    .map((l) => {
      const c = byId.get(l.categoryId)!;
      return {
        name: l.name,
        planned: c.planned,
        actual: c.actual,
        difference: spendingDifference(c.planned, c.actual),
        over: c.actual > c.planned,
      };
    });
  const notPlanned = s.unbudgeted.map((u) => ({
    name: input.categoryNames.get(u.category) ?? "Other",
    planned: 0,
    actual: u.actual,
    difference: "Not in your plan",
    over: u.actual > 0,
  }));
  const sumBy = (items: { name: string; cents: number }[]) => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.name, (m.get(i.name) ?? 0) + i.cents);
    return [...m].map(([name, cents]) => ({ name, cents })).filter((i) => i.cents !== 0);
  };
  return {
    income: {
      planned: s.incomePlanned,
      actual: s.incomeActual,
      difference: incomeDifference(s.incomePlanned, s.incomeActual),
    },
    spent: s.actualTotal,
    leftOver: s.actualBalance,
    rows: [...rows, ...notPlanned],
    total: {
      planned: s.plannedTotal,
      actual: s.actualTotal,
      difference: spendingDifference(s.plannedTotal, s.actualTotal),
    },
    saved: sumBy(input.saved),
    debtPayments: sumBy(input.debtPayments),
    empty: input.lines.length === 0 && input.tx.length === 0,
  };
}

export type Review = ReturnType<typeof buildReview>;

/** Neutral copy for a negative left-over (L4 §4 zero and negative cases). */
export function leftOverNote(leftOver: number): string | null {
  return leftOver < 0
    ? `You've spent ${formatZAR(-leftOver)} more than the income recorded this month.`
    : null;
}
