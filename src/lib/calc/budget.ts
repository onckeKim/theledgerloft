/**
 * Budget calculations (docs/l4/calculation-spec.md §4). All money in integer cents.
 * Must pass L4 vectors B1–B6 (see budget.test.ts).
 */
export type TxKind = "income" | "outflow" | "refund";
export type BudgetLineInput = { category: string; planned: number };
export type TxInput = { kind: TxKind; category?: string; amount: number };
export type CategoryStatus = "under" | "spent" | "over" | "unplanned" | "empty";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function budgetSummary({
  income,
  lines,
  tx,
}: {
  income: { planned: number }[];
  lines: BudgetLineInput[];
  tx: TxInput[];
}) {
  const incomePlanned = sum(income.map((i) => i.planned));
  const incomeActual = sum(tx.filter((t) => t.kind === "income").map((t) => t.amount));
  const plannedTotal = sum(lines.map((l) => l.planned));
  const actualBy = new Map<string, number>();
  for (const t of tx) {
    if (t.kind === "income" || !t.category) continue;
    actualBy.set(
      t.category,
      (actualBy.get(t.category) ?? 0) + (t.kind === "refund" ? -t.amount : t.amount),
    );
  }
  const categories = lines.map((l) => {
    const actual = actualBy.get(l.category) ?? 0;
    const remaining = l.planned - actual;
    const status: CategoryStatus =
      l.planned === 0
        ? actual > 0
          ? "unplanned"
          : "empty"
        : remaining < 0
          ? "over"
          : remaining === 0
            ? "spent"
            : "under";
    const barPermille =
      l.planned === 0
        ? actual > 0
          ? 1000
          : 0
        : Math.min(1000, Math.floor((Math.max(actual, 0) * 1000) / l.planned));
    return {
      category: l.category,
      planned: l.planned,
      actual,
      remaining,
      over: Math.max(0, -remaining),
      status,
      barPermille,
    };
  });
  const lineNames = new Set(lines.map((l) => l.category));
  const unbudgeted = [...actualBy]
    .filter(([c]) => !lineNames.has(c))
    .map(([category, actual]) => ({ category, actual }));
  const actualTotal = sum([...actualBy.values()]);
  const plannedBalance = incomePlanned - plannedTotal;
  return {
    incomePlanned,
    incomeActual,
    plannedTotal,
    actualTotal,
    plannedBalance,
    leftToBudget: plannedBalance,
    overPlanned: Math.max(0, -plannedBalance),
    planRemaining: plannedTotal - actualTotal,
    actualBalance: incomeActual - actualTotal,
    categories,
    unbudgeted,
  };
}
