import "server-only";
import { periodFor, todayInJohannesburg } from "@/lib/calc/period";
import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/** Everything the setup screens need, read as the signed-in user (RLS limits it to their household). */
export async function loadSetup() {
  await verifySession("/app/setup");
  const supabase = await createClient();

  const { data: household, error } = await supabase
    .from("households")
    .select("id, pay_frequency, month_start_day, budget_style, setup_step, setup_completed_at")
    .single();
  if (error || !household) throw new Error("Could not load your household");

  const [income, categories, debts, goals] = await Promise.all([
    supabase
      .from("income_items")
      .select("id, name, monthly_cents")
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("categories")
      .select("id, name, category_group, budget_lines(planned_cents)")
      .is("system_key", null)
      .is("archived_at", null)
      .in("category_group", ["fixed", "everyday"])
      .order("sort_order"),
    supabase
      .from("debts")
      .select("id, name, balance_cents, min_payment_cents, rate_bp")
      .is("archived_at", null)
      .order("created_at"),
    supabase
      .from("goals")
      .select("id, kind, name, target_cents, monthly_cents, starting_cents, due_period")
      .is("archived_at", null)
      .order("created_at"),
  ]);
  for (const r of [income, categories, debts, goals])
    if (r.error) throw new Error("Could not load your setup");

  const planned = (c: { budget_lines: { planned_cents: number }[] }) =>
    c.budget_lines[0]?.planned_cents ?? 0;
  const cats = categories.data ?? [];
  const today = todayInJohannesburg();

  return {
    household,
    currentPeriod: periodFor(today, household.month_start_day).label,
    income: (income.data ?? []).map((i) => ({ id: i.id, name: i.name, cents: i.monthly_cents })),
    bills: cats
      .filter((c) => c.category_group === "fixed")
      .map((c) => ({ id: c.id, name: c.name, cents: planned(c) })),
    spending: cats
      .filter((c) => c.category_group === "everyday")
      .map((c) => ({ id: c.id, name: c.name, cents: planned(c) })),
    debts: (debts.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      balance: d.balance_cents,
      minPayment: d.min_payment_cents,
      rateBp: d.rate_bp,
    })),
    goals: (goals.data ?? []).map((g) => ({
      id: g.id,
      kind: g.kind as "goal" | "sinking_fund",
      name: g.name,
      target: g.target_cents,
      monthly: g.monthly_cents,
      starting: g.starting_cents,
      due: g.due_period,
    })),
  };
}

export type SetupLoad = Awaited<ReturnType<typeof loadSetup>>;

/** Light-weight status for the dashboard (PRD US-20): has setup started or finished? */
export async function setupStatus() {
  await verifySession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("households")
    .select("setup_step, setup_completed_at")
    .single();
  return {
    started: Boolean(data?.setup_step),
    completed: Boolean(data?.setup_completed_at),
    step: data?.setup_step ?? null,
  };
}
