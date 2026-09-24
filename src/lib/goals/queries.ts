import "server-only";
import { periodFor, todayInJohannesburg } from "@/lib/calc/period";
import { isUuid } from "@/lib/budget/schemas";
import { createClient } from "@/lib/supabase/server";
import { withProgress } from "./progress";

const GOAL_COLUMNS = "id, kind, name, target_cents, monthly_cents, starting_cents, due_period";
export const SYSTEM_KEY = { goal: "savings_goals", sinking_fund: "sinking_funds" } as const;

async function currentPeriod() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("households").select("month_start_day").single();
  if (error || !data) throw new Error("Could not load your household");
  return periodFor(todayInJohannesburg(), data.month_start_day).label;
}

/** This month's planned amount for an app-managed category, or null when there's no line (or no budget) yet. */
async function plannedThisMonth(period: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("budget_lines")
    .select("planned_cents, budget_id, categories!inner(system_key), budgets!inner(period)")
    .eq("budgets.period", period)
    .not("categories.system_key", "is", null);
  const planned = new Map<string, { cents: number; budgetId: string }>();
  for (const l of data ?? [])
    if (l.categories?.system_key)
      planned.set(l.categories.system_key, { cents: l.planned_cents, budgetId: l.budget_id });
  return planned;
}

/**
 * Active goals and sinking funds with progress (L4 §5), plus how their monthly amounts compare with this month's
 * plan. Called only from pages that already ran verifySession(); RLS limits every query to the household.
 */
export async function loadGoals() {
  const supabase = await createClient();
  const period = await currentPeriod();
  const [goals, contributions, planned] = await Promise.all([
    supabase.from("goals").select(GOAL_COLUMNS).is("archived_at", null).order("created_at"),
    supabase.from("goal_contributions").select("goal_id, direction, amount_cents"),
    plannedThisMonth(period),
  ]);
  if (goals.error || contributions.error) throw new Error("Could not load your goals");
  const rows = withProgress(goals.data ?? [], contributions.data ?? [], period);
  const plan = (kind: "goal" | "sinking_fund") => {
    const line = planned.get(SYSTEM_KEY[kind]);
    return {
      monthlyTotal: rows.filter((g) => g.kind === kind).reduce((a, g) => a + g.monthly, 0),
      planned: line?.cents ?? null,
      budgetId: line?.budgetId ?? null,
    };
  };
  return {
    period,
    goals: rows.filter((g) => g.kind === "goal"),
    funds: rows.filter((g) => g.kind === "sinking_fund"),
    plan: { goal: plan("goal"), sinking_fund: plan("sinking_fund") },
  };
}

/** One goal with its history, newest first. Archived goals aren't shown. */
export async function getGoal(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const period = await currentPeriod();
  const [goal, contributions] = await Promise.all([
    supabase.from("goals").select(GOAL_COLUMNS).eq("id", id).is("archived_at", null).maybeSingle(),
    supabase
      .from("goal_contributions")
      .select("id, goal_id, direction, amount_cents, happened_on, created_at")
      .eq("goal_id", id)
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (goal.error || contributions.error) throw new Error("Could not load this goal");
  if (!goal.data) return null;
  const [row] = withProgress([goal.data], contributions.data ?? [], period);
  return {
    period,
    goal: row!,
    history: (contributions.data ?? []).map((c) => ({
      id: c.id,
      direction: c.direction as "in" | "out",
      cents: c.amount_cents,
      date: c.happened_on,
    })),
  };
}
