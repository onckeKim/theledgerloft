"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireAccess } from "@/lib/auth/dal";
import { isUuid } from "@/lib/budget/schemas";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/budget/actions";
import { formatZAR } from "@/lib/money";
import { parseAmount, parseDebt, type AmountInput, type DebtInput } from "@/lib/goals/schemas";

export type PaymentResult = ActionResult & { confirm?: string };

const GENERIC: ActionResult = {
  status: "error",
  message: "We couldn't save that just now. Please try again.",
};
const refresh = () => revalidatePath("/app", "layout");

/** Add (id null) or edit a debt (PRD US-34). The balance changes only through payments and statement updates. */
export async function saveDebt(id: string | null, input: DebtInput): Promise<ActionResult> {
  await requireAccess("/app/debts");
  if (id !== null && !isUuid(id)) return GENERIC;
  // When editing, the balance field isn't shown; validate it with a placeholder.
  const parsed = parseDebt(id === null ? input : { ...input, balance: "1" });
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const d = parsed.data;
  const supabase = await createClient();
  if (id === null) {
    const { data, error } = await supabase.rpc("create_debt", {
      p_name: d.name,
      p_balance: d.balance,
      p_min: d.minPayment,
      p_rate: d.rateBp,
      p_note: d.note,
    });
    if (error || !data) return GENERIC;
    refresh();
    redirect(`/app/debts/${data}?notice=created` as Route);
  }
  const { data, error } = await supabase
    .from("debts")
    .update({ name: d.name, min_payment_cents: d.minPayment, rate_bp: d.rateBp, note: d.note })
    .eq("id", id)
    .is("archived_at", null)
    .select("id");
  if (error || !data?.length) return GENERIC;
  refresh();
  return { status: "ok", message: "Saved." };
}

/**
 * Record a payment (PRD US-35, P-4). A payment larger than the balance comes back with `confirm` set, and is
 * saved only when sent again with `confirmOver`.
 */
export async function recordPayment(
  id: string,
  input: AmountInput,
  confirmOver = false,
): Promise<PaymentResult> {
  await requireAccess("/app/debts");
  if (!isUuid(id)) return GENERIC;
  const parsed = parseAmount(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("debt_record_payment", {
    p_debt: id,
    p_cents: parsed.data.cents,
    p_on: parsed.data.date,
    p_note: parsed.data.note,
    p_confirm_over: confirmOver === true,
  });
  if (error?.hint === "over_balance") {
    const { data: debt } = await supabase
      .from("debts")
      .select("balance_cents")
      .eq("id", id)
      .single();
    return {
      status: "error",
      confirm: `That's more than the ${formatZAR(debt?.balance_cents ?? 0)} balance. The balance will be R 0,00 and the full ${formatZAR(parsed.data.cents)} is recorded as spending.`,
    };
  }
  if (error?.hint === "paid_off")
    return {
      status: "error",
      message: "This debt is paid off. Update the balance if that's changed.",
    };
  if (error) return GENERIC;
  refresh();
  return {
    status: "ok",
    message:
      data === 0
        ? "Payment recorded. This debt is paid off."
        : `Payment recorded. The balance is now ${formatZAR(data ?? 0)}.`,
  };
}

/** Update the balance from a statement (PRD US-36). Not a spending transaction. */
export async function setBalance(id: string, input: AmountInput): Promise<ActionResult> {
  await requireAccess("/app/debts");
  if (!isUuid(id)) return GENERIC;
  const parsed = parseAmount(input, { allowZero: true });
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("debt_set_balance", {
    p_debt: id,
    p_cents: parsed.data.cents,
    p_on: parsed.data.date,
    p_note: parsed.data.note,
  });
  if (error) return GENERIC;
  refresh();
  return { status: "ok", message: `Balance updated to ${formatZAR(parsed.data.cents)}.` };
}

export async function removeDebt(id: string, mode: "archive" | "delete"): Promise<ActionResult> {
  await requireAccess("/app/debts");
  if (!isUuid(id) || (mode !== "archive" && mode !== "delete")) return GENERIC;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_debt", { p_debt: id, p_mode: mode });
  if (error) return GENERIC;
  refresh();
  redirect(`/app/debts?notice=${data === "archived" ? "archived" : "deleted"}` as Route);
}

/** Snowball or avalanche (PRD US-37 AC1). Works as a plain form post, so it needs no JavaScript. */
export async function setDebtMethod(formData: FormData): Promise<void> {
  await requireAccess("/app/debts");
  const method = formData.get("method");
  if (method !== "snowball" && method !== "avalanche") return;
  const supabase = await createClient();
  const { data: household } = await supabase.from("households").select("id").single();
  if (!household) return;
  await supabase.from("households").update({ debt_method: method }).eq("id", household.id);
  refresh();
}
