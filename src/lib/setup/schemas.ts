import { addMonths, monthsBetween } from "@/lib/calc/period";
import { parseRandToCents, parseRateToBp } from "@/lib/money";

/**
 * Server-side validation for setup steps. Rows come from the browser as typed text; every amount is parsed here
 * into cents. Errors are keyed `${rowKey}.${field}` so the form can show each one next to its input.
 */
export type FieldErrors = Record<string, string>;
export type Result<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

const MAX_ROWS = 30;
const ROW_KEY = /^[a-z0-9-]{1,40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MoneyRowInput = { key: string; id?: string; name: string; amount: string };
export type DebtRowInput = {
  key: string;
  id?: string;
  name: string;
  balance: string;
  minPayment: string;
  rate: string;
};
export type GoalRowInput = {
  key: string;
  id?: string;
  kind: "goal" | "sinking_fund";
  name: string;
  target: string;
  monthly: string;
  starting: string;
  due: string;
};

function checkRows<T extends { key: string; id?: string }>(
  rows: T[],
  errors: FieldErrors,
): boolean {
  if (!Array.isArray(rows) || rows.length > MAX_ROWS) {
    errors.form = `You can add up to ${MAX_ROWS} items here.`;
    return false;
  }
  for (const r of rows) {
    if (!ROW_KEY.test(r.key) || (r.id !== undefined && r.id !== "" && !UUID.test(r.id))) {
      errors.form = "Something went wrong with this form. Please reload the page.";
      return false;
    }
  }
  return true;
}

function name(value: string, max: number, key: string, errors: FieldErrors, label: string): string {
  const v = (value ?? "").trim().replace(/\s+/g, " ");
  if (!v) errors[`${key}.name`] = `Give this ${label} a name`;
  else if (v.length > max) errors[`${key}.name`] = `Use ${max} characters or fewer`;
  return v;
}

function money(
  value: string,
  field: string,
  errors: FieldErrors,
  example: string,
  { optional = false } = {},
): number {
  const raw = (value ?? "").trim();
  if (optional && raw === "") return 0;
  const cents = parseRandToCents(raw);
  if (cents === null) {
    errors[field] =
      raw === ""
        ? `Enter an amount, like ${example}`
        : `Enter an amount between 0,01 and 99 999 999,99, like ${example}`;
    return 0;
  }
  return cents;
}

function duplicates(rows: { key: string; name: string }[], errors: FieldErrors, what: string) {
  const seen = new Set<string>();
  for (const r of rows) {
    const n = r.name.toLowerCase();
    if (n && seen.has(n))
      errors[`${r.key}.name`] ??= `You've already added a ${what} called “${r.name}”`;
    seen.add(n);
  }
}

// ------------------------------------------------------------------------------------------ basics
export type BasicsInput = { payFrequency: string; monthStartDay: string; budgetStyle: string };
export type Basics = {
  payFrequency: "monthly" | "every_two_weeks" | "weekly" | "varies";
  monthStartDay: number;
  budgetStyle: "flexible" | "zero_based";
};

export function parseBasics(input: BasicsInput): Result<Basics> {
  const errors: FieldErrors = {};
  const freq = ["monthly", "every_two_weeks", "weekly", "varies"].includes(input.payFrequency)
    ? input.payFrequency
    : null;
  if (!freq) errors.payFrequency = "Choose how often you're paid";
  const day = Number(input.monthStartDay);
  if (!Number.isInteger(day) || day < 1 || day > 28)
    errors.monthStartDay = "Choose a day from 1 to 28";
  const style = ["flexible", "zero_based"].includes(input.budgetStyle) ? input.budgetStyle : null;
  if (!style) errors.budgetStyle = "Choose a budgeting style";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      payFrequency: freq as Basics["payFrequency"],
      monthStartDay: day,
      budgetStyle: style as Basics["budgetStyle"],
    },
  };
}

// ------------------------------------------------------------------------------------------ income / bills / spending
export type MoneyRow = { key: string; id?: string; name: string; cents: number };

export function parseMoneyRows(
  rows: MoneyRowInput[],
  what: "income" | "bill" | "spending category",
): Result<MoneyRow[]> {
  const errors: FieldErrors = {};
  if (!checkRows(rows, errors)) return { ok: false, errors };
  const maxName = what === "income" ? 60 : 40;
  const out = rows.map((r) => ({
    key: r.key,
    id: r.id || undefined,
    name: name(r.name, maxName, r.key, errors, what),
    cents: money(r.amount, `${r.key}.amount`, errors, what === "income" ? "19 500,00" : "1 250,00"),
  }));
  duplicates(out, errors, what);
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: out };
}

// ------------------------------------------------------------------------------------------ debts & goals
export type DebtRow = {
  key: string;
  id?: string;
  name: string;
  balance: number;
  minPayment: number;
  rateBp: number | null;
};
export type GoalRow = {
  key: string;
  id?: string;
  kind: "goal" | "sinking_fund";
  name: string;
  target: number;
  monthly: number;
  starting: number;
  due: string | null;
};

export function parseDebtsGoals(
  debts: DebtRowInput[],
  goals: GoalRowInput[],
  currentPeriod: string,
): Result<{ debts: DebtRow[]; goals: GoalRow[] }> {
  const errors: FieldErrors = {};
  if (!checkRows(debts, errors) || !checkRows(goals, errors)) return { ok: false, errors };

  const debtRows = debts.map((d) => {
    const rateRaw = (d.rate ?? "").trim();
    let rateBp: number | null = null;
    if (rateRaw !== "") {
      rateBp = parseRateToBp(rateRaw);
      if (rateBp === null)
        errors[`${d.key}.rate`] = "Enter a yearly rate from 0 to 100, like 21,5. Or leave it blank";
    }
    return {
      key: d.key,
      id: d.id || undefined,
      name: name(d.name, 60, d.key, errors, "debt"),
      balance: money(d.balance, `${d.key}.balance`, errors, "8 900,00"),
      minPayment: money(d.minPayment, `${d.key}.minPayment`, errors, "1 200,00"),
      rateBp,
    };
  });
  duplicates(debtRows, errors, "debt");

  const earliest = addMonths(currentPeriod, 1);
  const latest = addMonths(currentPeriod, 120);
  const goalRows = goals.map((g) => {
    const kind = g.kind === "sinking_fund" ? "sinking_fund" : "goal";
    let due: string | null = null;
    if (kind === "sinking_fund") {
      const v = (g.due ?? "").trim();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v))
        errors[`${g.key}.due`] = "Choose the month you'll need this money";
      else if (monthsBetween(earliest, v) < 0 || monthsBetween(v, latest) < 0)
        errors[`${g.key}.due`] = "Choose a month from next month up to 10 years ahead";
      else due = v;
    }
    return {
      key: g.key,
      id: g.id || undefined,
      kind: kind as GoalRow["kind"],
      name: name(g.name, 60, g.key, errors, kind === "goal" ? "goal" : "fund"),
      target: money(g.target, `${g.key}.target`, errors, "20 000,00"),
      monthly: money(g.monthly, `${g.key}.monthly`, errors, "800,00", { optional: true }),
      starting: money(g.starting, `${g.key}.starting`, errors, "1 000,00", { optional: true }),
      due,
    };
  });
  duplicates(goalRows, errors, "goal or fund");

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, data: { debts: debtRows, goals: goalRows } };
}
