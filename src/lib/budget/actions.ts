"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  isChecklistKey,
  isUuid,
  parseNewCategory,
  parsePlannedCents,
  parseTransaction,
  type CategoryInput,
  type FieldErrors,
  type TransactionInput,
} from "./schemas";
import { parseRandToCents } from "@/lib/money";

export type ActionResult = {
  status: "ok" | "error";
  errors?: FieldErrors;
  message?: string;
  id?: string;
  removed?: "deleted" | "archived";
};

const GENERIC: ActionResult = {
  status: "error",
  message: "We couldn't save that just now. Please try again.",
};
const LINKED: ActionResult = {
  status: "error",
  message: "This one belongs to a goal or debt. Change it from the Goals or Debts page.",
};
const done = (extra: Partial<ActionResult> = {}): ActionResult => {
  revalidatePath("/app", "layout");
  return { status: "ok", ...extra };
};

export async function setPlanned(
  budgetId: string,
  categoryId: string,
  amount: string,
): Promise<ActionResult> {
  await requireAccess("/app/budget");
  if (!isUuid(budgetId) || !isUuid(categoryId)) return GENERIC;
  const cents = parsePlannedCents(amount);
  if (cents === null)
    return { status: "error", errors: { planned: "Enter an amount, like 3 400,00 (or 0)" } };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budget_lines")
    .update({ planned_cents: cents })
    .eq("budget_id", budgetId)
    .eq("category_id", categoryId)
    .select("id");
  if (error || !data?.length) return GENERIC;
  return done();
}

export async function addCategory(budgetId: string, input: CategoryInput): Promise<ActionResult> {
  await requireAccess("/app/budget");
  if (!isUuid(budgetId)) return GENERIC;
  const parsed = parseNewCategory(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_category", {
    p_budget: budgetId,
    p_name: parsed.data.name,
    p_group: parsed.data.group,
    p_planned: parsed.data.plannedCents,
  });
  if (error?.code === "23505")
    return {
      status: "error",
      errors: { name: `You already have a category called “${parsed.data.name}”` },
    };
  if (error) return GENERIC;
  return done();
}

export async function removeCategory(categoryId: string): Promise<ActionResult> {
  await requireAccess("/app/budget");
  if (!isUuid(categoryId)) return GENERIC;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_category", { p_category: categoryId });
  if (error?.hint === "system")
    return { status: "error", message: "This category is managed from your goals or debts." };
  if (error) return GENERIC;
  return done({ removed: data === "archived" ? "archived" : "deleted" });
}

export async function moveMoney(
  budgetId: string,
  fromId: string,
  toId: string,
  amount: string,
): Promise<ActionResult> {
  await requireAccess("/app/budget");
  if (!isUuid(budgetId) || !isUuid(fromId) || !isUuid(toId))
    return { status: "error", errors: { from: "Choose where to move money from and to" } };
  if (fromId === toId)
    return { status: "error", errors: { to: "Choose two different categories" } };
  const cents = parseRandToCents(amount);
  if (cents === null)
    return { status: "error", errors: { amount: "Enter an amount, like 250,00" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_budget_money", {
    p_budget: budgetId,
    p_from: fromId,
    p_to: toId,
    p_cents: cents,
  });
  if (error?.hint === "insufficient")
    return {
      status: "error",
      errors: { amount: "That's more than is planned in the category you're moving from" },
    };
  if (error) return GENERIC;
  return done();
}

/** Rename a category or move it to another group (PRD US-23). App-managed categories keep their name and group. */
export async function renameCategory(
  categoryId: string,
  input: { name: string; group: string },
): Promise<ActionResult> {
  await requireAccess("/app/budget");
  if (!isUuid(categoryId)) return GENERIC;
  const parsed = parseNewCategory({ ...input, planned: "0" });
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name, category_group: parsed.data.group })
    .eq("id", categoryId)
    .is("system_key", null)
    .is("archived_at", null)
    .select("id");
  if (error?.code === "23505")
    return {
      status: "error",
      errors: { name: `You already have a category called “${parsed.data.name}”` },
    };
  if (error || !data?.length) return GENERIC;
  return done({ message: "Saved." });
}

/** Show or hide a default checklist item in every month (PRD US-25 AC2). */
export async function setChecklistHidden(key: string, hidden: boolean): Promise<ActionResult> {
  await requireAccess("/app");
  if (!isChecklistKey(key)) return GENERIC;
  const supabase = await createClient();
  const { data: household } = await supabase
    .from("households")
    .select("id, checklist_hidden")
    .single();
  if (!household) return GENERIC;
  const next = new Set(household.checklist_hidden ?? []);
  if (hidden) next.add(key);
  else next.delete(key);
  const { error } = await supabase
    .from("households")
    .update({ checklist_hidden: [...next] })
    .eq("id", household.id);
  if (error) return GENERIC;
  return done();
}

export async function setChecklist(
  budgetId: string,
  key: string,
  checked: boolean,
): Promise<ActionResult> {
  await requireAccess("/app");
  if (!isUuid(budgetId) || !isChecklistKey(key)) return GENERIC;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("checklist")
    .eq("id", budgetId)
    .single();
  if (error || !data) return GENERIC;
  const current = (data.checklist ?? {}) as { done?: Record<string, boolean> };
  const next = { ...current, done: { ...(current.done ?? {}), [key]: checked } };
  const { error: updateError } = await supabase
    .from("budgets")
    .update({ checklist: next })
    .eq("id", budgetId);
  if (updateError) return GENERIC;
  return done();
}

/** Where an edit may return to: the transactions list for a month, nothing else (no open redirects). */
const RETURN_TO = /^\/app\/transactions(\?period=\d{4}-(0[1-9]|1[0-2]))?$/;

export async function saveTransaction(
  id: string | null,
  input: TransactionInput,
  returnTo?: string,
): Promise<ActionResult> {
  await requireAccess("/app/transactions");
  const parsed = parseTransaction(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { data: household } = await supabase.from("households").select("id").single();
  if (!household) return GENERIC;
  const row = {
    kind: parsed.data.kind,
    amount_cents: parsed.data.amountCents,
    description: parsed.data.description,
    category_id: parsed.data.categoryId,
    occurred_on: parsed.data.date,
  };
  const result =
    id === null
      ? await supabase
          .from("transactions_manual")
          .insert({ ...row, household_id: household.id })
          .select("id")
          .single()
      : isUuid(id)
        ? await supabase
            .from("transactions_manual")
            .update(row)
            .eq("id", id)
            .is("deleted_at", null)
            .select("id")
            .single()
        : null;
  if (!result) return GENERIC;
  if (result.error?.hint === "linked") return LINKED;
  if (result.error?.code === "23503")
    return { status: "error", errors: { categoryId: "Choose one of your categories" } };
  if (result.error || !result.data) return GENERIC;
  const ok = done({ id: result.data.id });
  if (returnTo && RETURN_TO.test(returnTo)) redirect(returnTo as Route);
  return ok;
}

/** Soft delete so it can be undone (PRD US-27). */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  await requireAccess("/app/transactions");
  if (!isUuid(id)) return GENERIC;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions_manual")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error?.hint === "linked") return LINKED;
  if (error || !data?.length) return GENERIC;
  // No revalidation here: the row stays on screen with its Undo button; the page refreshes when the undo window ends.
  return { status: "ok", id };
}

export async function restoreTransaction(id: string): Promise<ActionResult> {
  await requireAccess("/app/transactions");
  if (!isUuid(id)) return GENERIC;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions_manual")
    .update({ deleted_at: null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return GENERIC;
  return done({ id });
}
