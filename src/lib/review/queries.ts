import "server-only";
import {
  addMonths,
  monthsBetween,
  periodFor,
  periodRange,
  todayInJohannesburg,
} from "@/lib/calc/period";
import { isPeriod } from "@/lib/budget/schemas";
import { createClient } from "@/lib/supabase/server";
import { buildReview, checkinOpensOn } from "./review";

/**
 * Everything the monthly review shows for one period, read as the signed-in user (RLS: one household only).
 * Doesn't create a budget: a review reports what was planned and recorded, it never invents a plan.
 * Planned income is today's income items (income isn't stored per month yet).
 */
export async function loadReview(period: string) {
  if (!isPeriod(period)) return null;
  const supabase = await createClient();
  const { data: household, error } = await supabase
    .from("households")
    .select("month_start_day")
    .single();
  if (error || !household) throw new Error("Could not load your household");
  const today = todayInJohannesburg();
  const current = periodFor(today, household.month_start_day).label;
  const { start, end } = periodRange(period, household.month_start_day);
  const opensOn = checkinOpensOn(end);

  const { data: budget } = await supabase
    .from("budgets")
    .select("id, starts_on, ends_on")
    .eq("period", period)
    .maybeSingle();
  const [lines, categories, tx, income, contributions, payments, checkin] = await Promise.all([
    budget
      ? supabase
          .from("budget_lines")
          .select("category_id, planned_cents, categories(name, sort_order)")
          .eq("budget_id", budget.id)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("categories").select("id, name"),
    supabase
      .from("transactions_manual")
      .select("kind, amount_cents, category_id")
      .eq("period", period)
      .is("deleted_at", null),
    supabase.from("income_items").select("monthly_cents").is("archived_at", null),
    supabase
      .from("goal_contributions")
      .select("direction, amount_cents, goals(name)")
      .gte("happened_on", budget?.starts_on ?? start)
      .lte("happened_on", budget?.ends_on ?? end),
    supabase
      .from("debt_payments")
      .select("amount_cents, debts(name)")
      .eq("kind", "payment")
      .gte("happened_on", budget?.starts_on ?? start)
      .lte("happened_on", budget?.ends_on ?? end),
    supabase
      .from("monthly_checkins")
      .select("went_well, surprised, next_actions, completed_at")
      .eq("period", period)
      .maybeSingle(),
  ]);
  for (const r of [lines, categories, tx, income, contributions, payments, checkin])
    if (r.error) throw new Error("Could not load this review");

  const review = buildReview({
    incomePlanned: budget ? (income.data ?? []).map((i) => ({ planned: i.monthly_cents })) : [],
    lines: (lines.data ?? [])
      .filter((l) => l.categories)
      .map((l) => ({
        categoryId: l.category_id,
        name: l.categories!.name,
        planned: l.planned_cents,
        sort: l.categories!.sort_order,
      })),
    categoryNames: new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    tx: (tx.data ?? []).map((t) => ({
      kind: t.kind as "income" | "outflow" | "refund",
      categoryId: t.category_id,
      amount: t.amount_cents,
    })),
    saved: (contributions.data ?? []).map((c) => ({
      name: c.goals?.name ?? "Goal",
      cents: c.direction === "in" ? c.amount_cents : -c.amount_cents,
    })),
    debtPayments: (payments.data ?? []).map((p) => ({
      name: p.debts?.name ?? "Debt",
      cents: p.amount_cents ?? 0,
    })),
  });

  const actions = Array.isArray(checkin.data?.next_actions)
    ? (checkin.data.next_actions as unknown[]).filter((a): a is string => typeof a === "string")
    : [];
  return {
    period,
    current,
    prev: addMonths(period, -1),
    next: addMonths(period, 1),
    start: budget?.starts_on ?? start,
    end: budget?.ends_on ?? end,
    opensOn,
    open: today >= opensOn,
    future: monthsBetween(current, period) > 0,
    hasBudget: Boolean(budget),
    review,
    checkin: {
      wentWell: checkin.data?.went_well ?? "",
      surprised: checkin.data?.surprised ?? "",
      nextActions: actions,
      completedAt: checkin.data?.completed_at ?? null,
    },
  };
}

export type LoadedReview = NonNullable<Awaited<ReturnType<typeof loadReview>>>;

/** Months with a plan, newest first, with their check-in state (for the Reviews index). */
export async function listReviews() {
  const supabase = await createClient();
  const [{ data: household }, { data: budgets }, { data: checkins }] = await Promise.all([
    supabase.from("households").select("month_start_day").single(),
    supabase.from("budgets").select("period, ends_on").order("period", { ascending: false }),
    supabase.from("monthly_checkins").select("period, completed_at"),
  ]);
  const today = todayInJohannesburg();
  const current = periodFor(today, household?.month_start_day ?? 1).label;
  const done = new Map((checkins ?? []).map((c) => [c.period, c.completed_at]));
  return (budgets ?? [])
    .filter((b) => monthsBetween(b.period, current) >= 0)
    .map((b) => ({
      period: b.period,
      opensOn: checkinOpensOn(b.ends_on),
      open: today >= checkinOpensOn(b.ends_on),
      completedAt: done.get(b.period) ?? null,
    }));
}
