"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { verifySession } from "@/lib/auth/dal";
import { isUuid } from "@/lib/budget/schemas";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/budget/actions";
import { loadGoals, SYSTEM_KEY } from "./queries";
import { parseAmount, parseGoal, type AmountInput, type GoalInput } from "./schemas";

const GENERIC: ActionResult = {
  status: "error",
  message: "We couldn't save that just now. Please try again.",
};
const refresh = () => revalidatePath("/app", "layout");

/** Create (id null) or edit a goal or sinking fund (PRD US-30, US-31, US-33). The kind can't change. */
export async function saveGoal(id: string | null, input: GoalInput): Promise<ActionResult> {
  await verifySession("/app/goals");
  if (id !== null && !isUuid(id)) return GENERIC;
  const supabase = await createClient();
  const { period } = await loadGoals();

  if (id === null) {
    const parsed = parseGoal(input, period);
    if (!parsed.ok) return { status: "error", errors: parsed.errors };
    const g = parsed.data;
    const { data, error } = await supabase.rpc("create_goal", {
      p_kind: g.kind,
      p_name: g.name,
      p_target: g.target,
      p_monthly: g.monthly,
      p_starting: g.starting,
      p_due: g.due,
    });
    if (error || !data) return GENERIC;
    refresh();
    redirect(`/app/goals/${data}?notice=created` as Route);
  }

  const { data: existing } = await supabase
    .from("goals")
    .select("kind, due_period")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (!existing) return GENERIC;
  const parsed = parseGoal({ ...input, kind: existing.kind }, period, existing.due_period);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const g = parsed.data;
  const { error } = await supabase
    .from("goals")
    .update({
      name: g.name,
      target_cents: g.target,
      monthly_cents: g.monthly,
      starting_cents: g.starting,
      due_period: g.kind === "sinking_fund" ? g.due : null,
    })
    .eq("id", id);
  if (error) return GENERIC;
  refresh();
  return { status: "ok", message: "Saved." };
}

/** Add money to, or take money out of, a goal or fund (PRD US-32, P-3). */
export async function moveGoalMoney(
  id: string,
  direction: "in" | "out",
  input: AmountInput,
): Promise<ActionResult> {
  await verifySession("/app/goals");
  if (!isUuid(id) || (direction !== "in" && direction !== "out")) return GENERIC;
  const parsed = parseAmount(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("goal_move_money", {
    p_goal: id,
    p_direction: direction,
    p_cents: parsed.data.cents,
    p_on: parsed.data.date,
  });
  if (error?.hint === "insufficient")
    return { status: "error", errors: { amount: "That's more than is saved in it" } };
  if (error) return GENERIC;
  refresh();
  return {
    status: "ok",
    message:
      direction === "in"
        ? "Added. It's also in your transactions as spending in this category."
        : "Taken out. It's also in your transactions as a refund in this category.",
  };
}

/** Archive (keep history) or delete everything (PRD US-33 AC2). */
export async function removeGoal(id: string, mode: "archive" | "delete"): Promise<ActionResult> {
  await verifySession("/app/goals");
  if (!isUuid(id) || (mode !== "archive" && mode !== "delete")) return GENERIC;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_goal", { p_goal: id, p_mode: mode });
  if (error) return GENERIC;
  refresh();
  redirect(`/app/goals?notice=${data === "archived" ? "archived" : "deleted"}` as Route);
}

/** Set this month's plan for goals or sinking funds to the sum of their monthly amounts. Only on request. */
export async function applyGoalPlan(kind: "goal" | "sinking_fund"): Promise<ActionResult> {
  await verifySession("/app/goals");
  if (kind !== "goal" && kind !== "sinking_fund") return GENERIC;
  const supabase = await createClient();
  const { period, plan } = await loadGoals();
  const target = plan[kind].monthlyTotal;
  const [{ data: household }, { data: category }, { data: budgetId }] = await Promise.all([
    supabase.from("households").select("id").single(),
    supabase.from("categories").select("id").eq("system_key", SYSTEM_KEY[kind]).maybeSingle(),
    supabase.rpc("ensure_budget", { p_period: period }),
  ]);
  if (!household || !category || !budgetId) return GENERIC;
  const { error } = await supabase.from("budget_lines").upsert(
    {
      household_id: household.id,
      budget_id: budgetId,
      category_id: category.id,
      planned_cents: target,
    },
    { onConflict: "budget_id,category_id" },
  );
  if (error) return GENERIC;
  refresh();
  return { status: "ok", message: "This month's plan is updated." };
}
