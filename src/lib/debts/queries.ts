import { currentPeriod } from "@/lib/budget/current";
import "server-only";
import { projectDebts, type DebtMethod } from "@/lib/calc/debts";

import { isUuid } from "@/lib/budget/schemas";
import { createClient } from "@/lib/supabase/server";

const DEBT_COLUMNS =
  "id, name, balance_cents, opening_balance_cents, rate_bp, min_payment_cents, note, paid_off_on, created_at";

/**
 * Debts with the payoff estimate for the chosen method and an optional extra monthly amount (L4 §6).
 * Paid-off debts are listed separately and left out of the estimate. RLS limits every query to the household.
 */
export async function loadDebts(extra = 0) {
  const supabase = await createClient();
  const [household, debts, planned] = await Promise.all([
    supabase.from("households").select("month_start_day, debt_method").single(),
    supabase.from("debts").select(DEBT_COLUMNS).is("archived_at", null).order("created_at"),
    supabase
      .from("budget_lines")
      .select("planned_cents, categories!inner(system_key), budgets!inner(period)")
      .eq("categories.system_key", "debt_payments"),
  ]);
  if (household.error || !household.data || debts.error)
    throw new Error("Could not load your debts");
  const period = await currentPeriod(household.data.month_start_day);
  const method: DebtMethod = household.data.debt_method === "avalanche" ? "avalanche" : "snowball";
  const rows = (debts.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance_cents,
    rateBp: d.rate_bp,
    minPayment: d.min_payment_cents,
    paidOffOn: d.paid_off_on,
    created: Date.parse(d.created_at),
  }));
  const open = rows.filter((d) => d.balance > 0);
  const projection = projectDebts({
    debts: open.map((d) => ({ ...d, rateBp: d.rateBp ?? 0 })),
    method,
    extra,
    currentPeriod: period,
  });
  const plannedLine = (planned.data ?? []).find((l) => l.budgets?.period === period);
  return {
    period,
    method,
    extra,
    open,
    paidOff: rows.filter((d) => d.balance === 0),
    projection,
    totalOwed: open.reduce((a, d) => a + d.balance, 0),
    totalMinimums: open.reduce((a, d) => a + d.minPayment, 0),
    plannedThisMonth: plannedLine?.planned_cents ?? null,
  };
}

export async function getDebt(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const [debt, history] = await Promise.all([
    supabase.from("debts").select(DEBT_COLUMNS).eq("id", id).is("archived_at", null).maybeSingle(),
    supabase
      .from("debt_payments")
      .select("id, kind, amount_cents, new_balance_cents, happened_on, note, created_at")
      .eq("debt_id", id)
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (debt.error || history.error) throw new Error("Could not load this debt");
  if (!debt.data) return null;
  const d = debt.data;
  return {
    debt: {
      id: d.id,
      name: d.name,
      balance: d.balance_cents,
      opening: d.opening_balance_cents,
      rateBp: d.rate_bp,
      minPayment: d.min_payment_cents,
      note: d.note,
      paidOffOn: d.paid_off_on,
    },
    history: (history.data ?? []).map((h) => ({
      id: h.id,
      kind: h.kind as "payment" | "balance_adjustment",
      cents: h.amount_cents,
      newBalance: h.new_balance_cents,
      date: h.happened_on,
      note: h.note,
    })),
  };
}
