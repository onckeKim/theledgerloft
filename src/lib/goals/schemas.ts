import {
  isValidDate,
  parsePlannedCents,
  type FieldErrors,
  type Result,
} from "@/lib/budget/schemas";
import { parseDebtsGoals, type DebtRow, type GoalRow } from "@/lib/setup/schemas";
import { addMonths, monthsBetween } from "@/lib/calc/period";
import { parseRandToCents } from "@/lib/money";

/**
 * Validation for the goals and debts pages. Single goals and debts reuse the setup rules (one row keyed "x"),
 * so a goal is valid in exactly the same way wherever it's entered. Errors come back keyed by field name.
 */
export type GoalInput = {
  kind: string;
  name: string;
  target: string;
  monthly: string;
  starting: string;
  due: string;
};
export type DebtInput = {
  name: string;
  balance: string;
  minPayment: string;
  rate: string;
  note: string;
};

const unkey = (errors: FieldErrors): FieldErrors =>
  Object.fromEntries(Object.entries(errors).map(([k, v]) => [k.replace(/^x\./, ""), v]));

/** `keepDue`: an existing fund may keep its due month even once it's no longer in the future. */
export function parseGoal(
  input: GoalInput,
  currentPeriod: string,
  keepDue?: string | null,
): Result<Omit<GoalRow, "key" | "id">> {
  const kind = input.kind === "sinking_fund" ? "sinking_fund" : "goal";
  const due = (input.due ?? "").trim();
  // Validate the unchanged due month as if today were the month before it.
  const asOf =
    keepDue && due === keepDue && monthsBetween(currentPeriod, keepDue) < 1
      ? addMonths(keepDue, -1)
      : currentPeriod;
  const r = parseDebtsGoals([], [{ key: "x", ...input, kind }], asOf);
  if (!r.ok) return { ok: false, errors: unkey(r.errors) };
  const g = r.data.goals[0]!;
  return {
    ok: true,
    data: {
      kind: g.kind,
      name: g.name,
      target: g.target,
      monthly: g.monthly,
      starting: g.starting,
      due: g.due,
    },
  };
}

export function parseDebt(
  input: DebtInput,
): Result<Omit<DebtRow, "key" | "id"> & { note: string | null }> {
  const r = parseDebtsGoals([{ key: "x", ...input }], [], "2000-01");
  const errors: FieldErrors = r.ok ? {} : unkey(r.errors);
  const note = (input.note ?? "").trim().replace(/\s+/g, " ");
  if (note.length > 200) errors.note = "Use 200 characters or fewer";
  if (!r.ok || Object.keys(errors).length) return { ok: false, errors };
  const d = r.data.debts[0]!;
  return {
    ok: true,
    data: {
      name: d.name,
      balance: d.balance,
      minPayment: d.minPayment,
      rateBp: d.rateBp,
      note: note || null,
    },
  };
}

export type AmountInput = { amount: string; date: string; note?: string };

/** An amount (at least R 0,01, or R 0,00 when `allowZero`) on a date, with an optional short note. */
export function parseAmount(
  input: AmountInput,
  { allowZero = false } = {},
): Result<{ cents: number; date: string; note: string | null }> {
  const errors: FieldErrors = {};
  const cents = allowZero
    ? parsePlannedCents(input.amount ?? "")
    : parseRandToCents(input.amount ?? "");
  if (cents === null)
    errors.amount = allowZero
      ? "Enter an amount, like 8 450,00 (or 0)"
      : "Enter an amount between 0,01 and 99 999 999,99, like 500,00";
  if (!isValidDate(input.date ?? "")) errors.date = "Enter a real date, like 2026-09-24";
  const note = (input.note ?? "").trim().replace(/\s+/g, " ");
  if (note.length > 200) errors.note = "Use 200 characters or fewer";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { cents: cents!, date: input.date, note: note || null } };
}
