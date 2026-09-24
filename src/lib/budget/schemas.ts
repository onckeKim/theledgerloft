import { parseRandToCents } from "@/lib/money";

/** Validation for budget and transaction forms (PRD US-21…US-29). Pure, so the browser can pre-check too. */
export type FieldErrors = Record<string, string>;
export type Result<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isPeriod = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** Planned amounts may be R 0,00 (a category you're keeping but not funding this month). */
export function parsePlannedCents(input: string): number | null {
  const s = input.trim().replace(/^R/i, "").replace(/[\s ]/g, "");
  if (/^0+([.,]0{1,2})?$/.test(s)) return 0;
  return parseRandToCents(input);
}

export function isValidDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  const y = d.getUTCFullYear();
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && y >= 2000 && y <= 2100;
}

export type TxKind = "outflow" | "income" | "refund";
export type TransactionInput = {
  kind: string;
  amount: string;
  description: string;
  categoryId: string;
  date: string;
};
export type Transaction = {
  kind: TxKind;
  amountCents: number;
  description: string | null;
  categoryId: string | null;
  date: string;
};

export function parseTransaction(input: TransactionInput): Result<Transaction> {
  const errors: FieldErrors = {};
  const kind = (["outflow", "income", "refund"] as const).find((k) => k === input.kind);
  if (!kind) errors.kind = "Choose spending, income or refund";
  const amountCents = parseRandToCents(input.amount ?? "");
  if (amountCents === null)
    errors.amount = "Enter an amount between 0,01 and 99 999 999,99, like 642,15";
  const description = (input.description ?? "").trim().replace(/\s+/g, " ");
  if (description.length > 80) errors.description = "Use 80 characters or fewer";
  let categoryId: string | null = null;
  if (kind && kind !== "income") {
    if (!isUuid(input.categoryId)) errors.categoryId = "Choose a category";
    else categoryId = input.categoryId;
  }
  if (!isValidDate(input.date ?? "")) errors.date = "Enter a real date, like 2026-09-24";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      kind: kind!,
      amountCents: amountCents!,
      description: description || null,
      categoryId,
      date: input.date,
    },
  };
}

export type CategoryInput = { name: string; group: string; planned: string };
export function parseNewCategory(
  input: CategoryInput,
): Result<{ name: string; group: "fixed" | "everyday"; plannedCents: number }> {
  const errors: FieldErrors = {};
  const name = (input.name ?? "").trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Give the category a name";
  else if (name.length > 40) errors.name = "Use 40 characters or fewer";
  const group = input.group === "fixed" || input.group === "everyday" ? input.group : null;
  if (!group) errors.group = "Choose fixed bills or everyday spending";
  const plannedCents = parsePlannedCents(input.planned ?? "");
  if (plannedCents === null) errors.planned = "Enter a planned amount, like 500,00 (or 0)";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { name, group: group!, plannedCents: plannedCents! } };
}

/** Escape a search term for PostgREST ilike (so % and _ are matched literally). */
export function likePattern(q: string): string {
  return `%${q
    .trim()
    .slice(0, 60)
    .replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Default monthly checklist (PRD US-25). */
export const CHECKLIST = [
  { key: "income", label: "Record this month's income" },
  { key: "bills", label: "Pay fixed bills" },
  { key: "weekly", label: "Add this week's spending" },
  { key: "left", label: "Decide what to do with what's left to budget" },
  { key: "checkin", label: "Monthly check-in" },
] as const;
export type ChecklistKey = (typeof CHECKLIST)[number]["key"];
export const isChecklistKey = (v: string): v is ChecklistKey => CHECKLIST.some((c) => c.key === v);
