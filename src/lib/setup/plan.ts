import { budgetSummary } from "@/lib/calc/budget";

/**
 * The first month's plan as shown on the review step (PRD US-16). The app-managed lines match what
 * public.setup_complete() writes: debt payments = Σ minimums, sinking funds / savings goals = Σ monthly amounts.
 */
export type SetupData = {
  income: { name: string; cents: number }[];
  bills: { name: string; cents: number }[];
  spending: { name: string; cents: number }[];
  debts: { minPayment: number }[];
  goals: { kind: "goal" | "sinking_fund"; monthly: number }[];
};

const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function setupPlan(d: SetupData) {
  const sections = [
    {
      key: "income",
      label: "Income",
      count: d.income.length,
      cents: total(d.income.map((i) => i.cents)),
      step: "income",
    },
    {
      key: "bills",
      label: "Fixed bills",
      count: d.bills.length,
      cents: total(d.bills.map((i) => i.cents)),
      step: "bills",
    },
    {
      key: "spending",
      label: "Everyday spending",
      count: d.spending.length,
      cents: total(d.spending.map((i) => i.cents)),
      step: "spending",
    },
    {
      key: "debts",
      label: "Debt payments",
      count: d.debts.length,
      cents: total(d.debts.map((x) => x.minPayment)),
      step: "debts-goals",
    },
    {
      key: "sinking",
      label: "Sinking funds",
      count: d.goals.filter((g) => g.kind === "sinking_fund").length,
      cents: total(d.goals.filter((g) => g.kind === "sinking_fund").map((g) => g.monthly)),
      step: "debts-goals",
    },
    {
      key: "goals",
      label: "Savings goals",
      count: d.goals.filter((g) => g.kind === "goal").length,
      cents: total(d.goals.filter((g) => g.kind === "goal").map((g) => g.monthly)),
      step: "debts-goals",
    },
  ] as const;
  const [income, ...planned] = sections;
  const summary = budgetSummary({
    income: d.income.map((i) => ({ planned: i.cents })),
    lines: planned.map((s) => ({ category: s.key, planned: s.cents })),
    tx: [],
  });
  return {
    income,
    planned,
    plannedTotal: summary.plannedTotal,
    leftToBudget: summary.leftToBudget,
    overPlanned: summary.overPlanned,
  };
}
