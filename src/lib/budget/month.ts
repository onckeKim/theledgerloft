import { currentPeriod } from "@/lib/budget/current";
import "server-only";
import { budgetSummary } from "@/lib/calc/budget";
import { projectDebts, type DebtMethod } from "@/lib/calc/debts";
import { addMonths, monthsBetween } from "@/lib/calc/period";
import { withProgress } from "@/lib/goals/progress";
import { createClient } from "@/lib/supabase/server";
import { isPeriod } from "./schemas";

export type CategoryGroup = "fixed" | "everyday" | "debts" | "saving";
export const GROUP_LABELS: Record<CategoryGroup, string> = {
  fixed: "Fixed bills",
  everyday: "Everyday spending",
  debts: "Debts",
  saving: "Saving",
};

/**
 * One budget month, computed with the L4 rules. Called only from pages that already ran verifySession();
 * every query runs as the signed-in user, so RLS limits it to their household.
 *
 * A budget is created (copying the last plan) only for months from the first budget up to next month,
 * so browsing far back or ahead never invents plans.
 */
export async function loadMonth(requested?: string | string[]) {
  const supabase = await createClient();
  const { data: household, error } = await supabase
    .from("households")
    .select("id, month_start_day, budget_style, debt_method, setup_completed_at, checklist_hidden")
    .single();
  if (error || !household) throw new Error("Could not load your household");

  const current = await currentPeriod(household.month_start_day);
  const period = typeof requested === "string" && isPeriod(requested) ? requested : current;

  const { data: first } = await supabase
    .from("budgets")
    .select("period")
    .order("period")
    .limit(1)
    .maybeSingle();
  const firstPeriod = first?.period ?? current;
  const plannable =
    monthsBetween(firstPeriod, period) >= 0 && monthsBetween(period, addMonths(current, 1)) >= 0;

  let budgetId: string | null = null;
  if (plannable) {
    const { data, error: ensureError } = await supabase.rpc("ensure_budget", { p_period: period });
    if (ensureError) throw new Error("Could not open this month");
    budgetId = data;
  }

  const [budget, lines, tx, income, goals, contributions, debts] = await Promise.all([
    budgetId
      ? supabase
          .from("budgets")
          .select("id, starts_on, ends_on, checklist")
          .eq("id", budgetId)
          .single()
      : Promise.resolve({ data: null, error: null }),
    budgetId
      ? supabase
          .from("budget_lines")
          .select(
            "category_id, planned_cents, categories(name, category_group, system_key, archived_at, sort_order)",
          )
          .eq("budget_id", budgetId)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("transactions_manual")
      .select("kind, amount_cents, category_id")
      .eq("period", period)
      .is("deleted_at", null),
    supabase.from("income_items").select("monthly_cents").is("archived_at", null),
    supabase
      .from("goals")
      .select("id, kind, name, target_cents, monthly_cents, starting_cents, due_period")
      .is("archived_at", null)
      .order("created_at"),
    supabase.from("goal_contributions").select("goal_id, direction, amount_cents"),
    supabase
      .from("debts")
      .select("id, name, balance_cents, rate_bp, min_payment_cents, created_at")
      .is("archived_at", null)
      .order("created_at"),
  ]);
  for (const r of [budget, lines, tx, income, goals, contributions, debts])
    if (r.error) throw new Error("Could not load this month");

  const lineRows = (lines.data ?? [])
    .filter((l) => l.categories)
    .map((l) => ({
      categoryId: l.category_id,
      planned: l.planned_cents,
      name: l.categories!.name,
      group: l.categories!.category_group as CategoryGroup,
      system: l.categories!.system_key,
      archived: Boolean(l.categories!.archived_at),
      sort: l.categories!.sort_order,
    }))
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  const summary = budgetSummary({
    income: (income.data ?? []).map((i) => ({ planned: i.monthly_cents })),
    lines: lineRows.map((l) => ({ category: l.categoryId, planned: l.planned })),
    tx: (tx.data ?? []).map((t) => ({
      kind: t.kind as "income" | "outflow" | "refund",
      category: t.category_id ?? undefined,
      amount: t.amount_cents,
    })),
  });
  const byCategory = new Map(summary.categories.map((c) => [c.category, c]));
  const categories = lineRows.map((l) => ({ ...l, ...byCategory.get(l.categoryId)! }));

  const goalRows = withProgress(goals.data ?? [], contributions.data ?? [], current);

  const debtRows = (debts.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance_cents,
    rateBp: d.rate_bp,
    minPayment: d.min_payment_cents,
    created: Date.parse(d.created_at),
  }));
  const method = (household.debt_method === "avalanche" ? "avalanche" : "snowball") as DebtMethod;
  const projection = projectDebts({
    debts: debtRows.map((d) => ({
      id: d.id,
      balance: d.balance,
      rateBp: d.rateBp ?? 0,
      minPayment: d.minPayment,
      created: d.created,
    })),
    method,
    currentPeriod: current,
  });
  const debtPaymentsCategory = categories.find((c) => c.system === "debt_payments");

  const checklist = (budget.data?.checklist ?? {}) as { done?: Record<string, boolean> };

  return {
    period,
    current,
    next: addMonths(period, 1),
    prev: addMonths(period, -1),
    plannable,
    isCurrent: period === current,
    budgetStyle: household.budget_style as "flexible" | "zero_based",
    setupComplete: Boolean(household.setup_completed_at),
    budget: budget.data
      ? { id: budget.data.id, startsOn: budget.data.starts_on, endsOn: budget.data.ends_on }
      : null,
    summary,
    categories,
    goals: goalRows,
    debts: {
      rows: debtRows,
      method,
      projection,
      totalOwed: debtRows.reduce((a, d) => a + d.balance, 0),
      // Paid-off debts have no minimum to pay.
      totalMinimums: debtRows.filter((d) => d.balance > 0).reduce((a, d) => a + d.minPayment, 0),
      paidThisMonth: debtPaymentsCategory?.actual ?? 0,
    },
    checklistDone: checklist.done ?? {},
    checklistHidden: household.checklist_hidden ?? [],
  };
}

export type Month = Awaited<ReturnType<typeof loadMonth>>;
