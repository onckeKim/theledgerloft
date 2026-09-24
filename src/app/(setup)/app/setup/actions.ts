"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import type { PostgrestError } from "@supabase/supabase-js";
import { periodFor, todayInJohannesburg } from "@/lib/calc/period";
import { verifySession } from "@/lib/auth/dal";
import {
  parseBasics,
  parseDebtsGoals,
  parseMoneyRows,
  type BasicsInput,
  type DebtRowInput,
  type FieldErrors,
  type GoalRowInput,
  type MoneyRowInput,
} from "@/lib/setup/schemas";
import { stepInfo, type StepSlug } from "@/lib/setup/steps";
import { createClient } from "@/lib/supabase/server";

export type Intent = "autosave" | "continue";
export type SaveState = {
  status: "saved" | "error";
  errors?: FieldErrors;
  /** Database ids for rows that were new, keyed by the row's client key. */
  ids?: Record<string, string>;
};

const GENERIC = "We couldn't save that just now. Your earlier answers are safe. Please try again.";

function afterSave(step: StepSlug, intent: Intent): SaveState {
  if (intent === "continue") redirect(`/app/setup/${stepInfo(step).next}` as Route);
  return { status: "saved" };
}

function dbError(error: PostgrestError, rows: { key: string; name: string }[] = []): SaveState {
  if (error.code === "P0001" && error.hint === "setup_complete") redirect("/app" as Route);
  if (error.code === "23505" && error.details) {
    const row = rows.find((r) => r.name.toLowerCase() === error.details.toLowerCase());
    if (row)
      return {
        status: "error",
        errors: {
          [`${row.key}.name`]: `You already have a category called “${row.name}” in another step`,
        },
      };
  }
  console.error("setup save failed", error.code);
  return { status: "error", errors: { form: GENERIC } };
}

const idsByKey = (rows: { key: string }[], ids: string[] | null | undefined) =>
  Object.fromEntries(rows.map((r, i) => [r.key, ids?.[i] ?? ""]).filter(([, id]) => id));

export async function saveBasics(input: BasicsInput, intent: Intent): Promise<SaveState> {
  await verifySession("/app/setup/basics");
  const parsed = parseBasics(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("setup_save_basics", {
    p_pay_frequency: parsed.data.payFrequency,
    p_month_start_day: parsed.data.monthStartDay,
    p_budget_style: parsed.data.budgetStyle,
  });
  if (error) return dbError(error);
  return afterSave("basics", intent);
}

export async function saveMoneyStep(
  step: "income" | "bills" | "spending",
  rows: MoneyRowInput[],
  intent: Intent,
): Promise<SaveState> {
  await verifySession(`/app/setup/${step}`);
  const what = step === "income" ? "income" : step === "bills" ? "bill" : "spending category";
  const parsed = parseMoneyRows(rows, what);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { data, error } =
    step === "income"
      ? await supabase.rpc("setup_save_income", {
          p_items: parsed.data.map((r) => ({
            id: r.id ?? "",
            name: r.name,
            monthly_cents: r.cents,
          })),
        })
      : await supabase.rpc("setup_save_categories", {
          p_group: step === "bills" ? "fixed" : "everyday",
          p_items: parsed.data.map((r) => ({
            id: r.id ?? "",
            name: r.name,
            planned_cents: r.cents,
          })),
        });
  if (error) return dbError(error, parsed.data);
  const saved = afterSave(step, intent);
  return { ...saved, ids: idsByKey(parsed.data, data) };
}

export async function saveDebtsGoals(
  debts: DebtRowInput[],
  goals: GoalRowInput[],
  intent: Intent,
): Promise<SaveState> {
  await verifySession("/app/setup/debts-goals");
  const supabase = await createClient();
  const { data: household } = await supabase.from("households").select("month_start_day").single();
  const currentPeriod = periodFor(todayInJohannesburg(), household?.month_start_day ?? 1).label;
  const parsed = parseDebtsGoals(debts, goals, currentPeriod);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const { data, error } = await supabase.rpc("setup_save_debts_goals", {
    p_debts: parsed.data.debts.map((d) => ({
      id: d.id ?? "",
      name: d.name,
      balance_cents: d.balance,
      min_payment_cents: d.minPayment,
      rate_bp: d.rateBp ?? "",
    })),
    p_goals: parsed.data.goals.map((g) => ({
      id: g.id ?? "",
      kind: g.kind,
      name: g.name,
      target_cents: g.target,
      monthly_cents: g.monthly,
      starting_cents: g.starting,
      due_period: g.due ?? "",
    })),
  });
  if (error) return dbError(error);
  const saved = afterSave("debts-goals", intent);
  const ids = data as { debts?: string[]; goals?: string[] } | null;
  return {
    ...saved,
    ids: { ...idsByKey(parsed.data.debts, ids?.debts), ...idsByKey(parsed.data.goals, ids?.goals) },
  };
}

export async function finishSetup(): Promise<SaveState> {
  await verifySession("/app/setup/review");
  const supabase = await createClient();
  const { error } = await supabase.rpc("setup_complete");
  if (error) return dbError(error);
  redirect("/app?welcome=1" as Route);
}
