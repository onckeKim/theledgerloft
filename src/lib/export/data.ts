import "server-only";
import { strToU8, zipSync } from "fflate";
import { CALC_SPEC_VERSION } from "@/lib/calc/version";
import { createClient } from "@/lib/supabase/server";
import { toCsv, type Cell } from "./csv";

/**
 * "Download all my data" (PRD US-43): one CSV per entity with every record the user entered, read as the
 * signed-in user (RLS: their household only). Amounts are integer cents, rates are basis points, as stored.
 */
const TABLES: { file: string; table: string; columns: string[]; order?: string }[] = [
  {
    file: "household.csv",
    table: "households",
    columns: [
      "id",
      "name",
      "currency",
      "month_start_day",
      "pay_frequency",
      "budget_style",
      "debt_method",
      "checklist_hidden",
      "setup_completed_at",
      "created_at",
      "updated_at",
    ],
  },
  {
    file: "profile.csv",
    table: "profiles",
    columns: ["id", "display_name", "created_at", "updated_at"],
  },
  {
    file: "income_items.csv",
    table: "income_items",
    columns: ["id", "name", "monthly_cents", "archived_at", "created_at", "updated_at"],
    order: "created_at",
  },
  {
    file: "categories.csv",
    table: "categories",
    columns: [
      "id",
      "name",
      "category_group",
      "system_key",
      "sort_order",
      "archived_at",
      "created_at",
      "updated_at",
    ],
    order: "created_at",
  },
  {
    file: "budgets.csv",
    table: "budgets",
    columns: ["id", "period", "starts_on", "ends_on", "checklist", "created_at", "updated_at"],
    order: "period",
  },
  {
    file: "budget_lines.csv",
    table: "budget_lines",
    columns: ["id", "budget_id", "category_id", "planned_cents", "created_at", "updated_at"],
    order: "created_at",
  },
  {
    file: "transactions.csv",
    table: "transactions_manual",
    columns: [
      "id",
      "kind",
      "amount_cents",
      "occurred_on",
      "period",
      "category_id",
      "income_item_id",
      "description",
      "deleted_at",
      "created_at",
      "updated_at",
    ],
    order: "occurred_on",
  },
  {
    file: "debts.csv",
    table: "debts",
    columns: [
      "id",
      "name",
      "opening_balance_cents",
      "balance_cents",
      "rate_bp",
      "min_payment_cents",
      "note",
      "paid_off_on",
      "archived_at",
      "created_at",
      "updated_at",
    ],
    order: "created_at",
  },
  {
    file: "debt_payments.csv",
    table: "debt_payments",
    columns: [
      "id",
      "debt_id",
      "kind",
      "amount_cents",
      "new_balance_cents",
      "happened_on",
      "transaction_id",
      "note",
      "created_at",
    ],
    order: "happened_on",
  },
  {
    file: "goals.csv",
    table: "goals",
    columns: [
      "id",
      "kind",
      "name",
      "target_cents",
      "monthly_cents",
      "starting_cents",
      "due_period",
      "completed_at",
      "archived_at",
      "created_at",
      "updated_at",
    ],
    order: "created_at",
  },
  {
    file: "goal_contributions.csv",
    table: "goal_contributions",
    columns: [
      "id",
      "goal_id",
      "direction",
      "amount_cents",
      "happened_on",
      "transaction_id",
      "created_at",
    ],
    order: "happened_on",
  },
  {
    file: "monthly_checkins.csv",
    table: "monthly_checkins",
    columns: [
      "id",
      "period",
      "went_well",
      "surprised",
      "next_actions",
      "completed_at",
      "created_at",
      "updated_at",
    ],
    order: "period",
  },
  {
    file: "exports.csv",
    table: "exports",
    columns: ["id", "kind", "period", "include_reflections", "spec_version", "created_at"],
    order: "created_at",
  },
  {
    file: "account_activity.csv",
    table: "audit_events",
    columns: ["action", "entity_type", "entity_id", "created_at"],
    order: "created_at",
  },
];

const README = (createdOn: string) => `The Ledger Loft: all your data
Created ${createdOn}. Calculation spec v${CALC_SPEC_VERSION}.

One file per kind of record, as you entered it:
${TABLES.map((t) => `- ${t.file}`).join("\n")}

How to read the numbers
- Amounts ending in _cents are whole cents: 98000 means R 980,00.
- rate_bp is a yearly rate in basis points: 2075 means 20,75%.
- Periods are labelled by the month they end in, as YYYY-MM.
- Text that starts with = + - or @ has an apostrophe in front, so spreadsheet apps show it as text.

This is your household's data only. Keep the file somewhere safe: it contains your financial information.
The Ledger Loft is a budgeting and planning tool. It does not provide financial, legal, tax or debt advice.
`;

const cell = (v: unknown): Cell =>
  v === null ||
  v === undefined ||
  typeof v === "string" ||
  typeof v === "number" ||
  typeof v === "boolean"
    ? (v as Cell)
    : JSON.stringify(v);

export async function dataZip(createdOn: string): Promise<Uint8Array> {
  const supabase = await createClient();
  const files: Record<string, Uint8Array> = { "README.txt": strToU8(README(createdOn)) };
  const results = await Promise.all(
    TABLES.map(async (t) => {
      let q = supabase.from(t.table as "households").select(t.columns.join(", "));
      if (t.order) q = q.order(t.order as "created_at");
      const { data, error } = await q;
      if (error) throw new Error(`Could not read ${t.file}`);
      return { t, rows: (data ?? []) as unknown as Record<string, unknown>[] };
    }),
  );
  for (const { t, rows } of results)
    files[t.file] = strToU8(
      toCsv(
        t.columns,
        rows.map((r) => Object.fromEntries(t.columns.map((c) => [c, cell(r[c])]))),
      ),
    );
  return zipSync(files, { level: 6 });
}
