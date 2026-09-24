import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

export const localStack = {
  url: process.env.E2E_SUPABASE_URL,
  anonKey: process.env.E2E_SUPABASE_PUBLISHABLE_KEY,
  serviceKey: process.env.E2E_SUPABASE_SERVICE_KEY,
};
export const hasLocalStack = Boolean(localStack.url && localStack.anonKey && localStack.serviceKey);
export const PASSWORD = "Synthetic-e2e-2026";

async function admin(path: string, init: RequestInit) {
  const res = await fetch(`${localStack.url}/auth/v1/admin/${path}`, {
    ...init,
    headers: {
      apikey: localStack.serviceKey!,
      authorization: `Bearer ${localStack.serviceKey}`,
      "content-type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`admin ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** A confirmed synthetic user on the LOCAL stack only. */
export async function createUser(prefix: string) {
  const email = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
  const user = (await admin("users", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  })) as { id: string };
  return { email, id: user.id, remove: () => admin(`users/${user.id}`, { method: "DELETE" }) };
}

/** Completes setup with the prototype household (L4 B1) through the real setup functions, as that user. */
/** A Supabase client signed in as the synthetic user: every call goes through RLS like the app's. */
export async function userClient(email: string) {
  const sb = createClient(localStack.url!, localStack.anonKey!, {
    auth: { persistSession: false },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return sb;
}

/** Last month's label and a date inside it, for a household whose month starts on the 1st. */
export function previousMonth(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
  const label = d.toISOString().slice(0, 7);
  return { label, date: `${label}-15` };
}

/**
 * Seeds last month for a prototype household, as the user: a plan copied from this month and a few synthetic
 * transactions (L4 vector B2 amounts), including one description that must be escaped in CSV (threat T8).
 */
export async function seedPreviousMonth(email: string) {
  const sb = await userClient(email);
  const { label, date } = previousMonth();
  const { error: e1 } = await sb.rpc("ensure_budget" as never, { p_period: label } as never);
  if (e1) throw e1;
  const { data: household } = await sb.from("households").select("id").single();
  const { data: cats } = await sb.from("categories").select("id, name");
  const id = (name: string) => cats!.find((c) => c.name === name)!.id;
  const { error: e2 } = await sb.from("transactions_manual").insert([
    {
      household_id: household!.id,
      kind: "income",
      amount_cents: 2238000,
      occurred_on: date,
      description: "Salary",
    },
    {
      household_id: household!.id,
      kind: "outflow",
      amount_cents: 331000,
      occurred_on: date,
      category_id: id("Groceries"),
      description: "=1+1 groceries",
    },
    {
      household_id: household!.id,
      kind: "outflow",
      amount_cents: 152000,
      occurred_on: date,
      category_id: id("Transport"),
      description: "Fuel",
    },
  ]);
  if (e2) throw e2;
  return label;
}

export async function completePrototypeSetup(email: string) {
  const sb = await userClient(email);
  const call = async (fn: string, args: Record<string, unknown>) => {
    const { error: e } = await sb.rpc(fn as never, args as never);
    if (e) throw new Error(`${fn}: ${e.message}`);
  };
  await call("setup_save_basics", {
    p_pay_frequency: "monthly",
    p_month_start_day: 1,
    p_budget_style: "flexible",
  });
  await call("setup_save_income", {
    p_items: [
      { name: "Salary", monthly_cents: 1950000 },
      { name: "Side income", monthly_cents: 224000 },
    ],
  });
  await call("setup_save_categories", {
    p_group: "fixed",
    p_items: [
      { name: "Housing", planned_cents: 620000 },
      { name: "Electricity & water", planned_cents: 110000 },
      { name: "Phone & data", planned_cents: 45000 },
      { name: "Insurance", planned_cents: 60000 },
    ],
  });
  await call("setup_save_categories", {
    p_group: "everyday",
    p_items: [
      { name: "Groceries", planned_cents: 340000 },
      { name: "Transport", planned_cents: 140000 },
      { name: "Personal & fun", planned_cents: 60000 },
    ],
  });
  await call("setup_save_debts_goals", {
    p_debts: [
      { name: "Store card", balance_cents: 215000, min_payment_cents: 45000, rate_bp: 2100 },
      { name: "Credit card", balance_cents: 890000, min_payment_cents: 120000, rate_bp: 2075 },
      { name: "Personal loan", balance_cents: 1460000, min_payment_cents: 95000, rate_bp: 2400 },
    ],
    p_goals: [
      {
        kind: "goal",
        name: "Emergency fund",
        target_cents: 2000000,
        monthly_cents: 80000,
        starting_cents: 640000,
      },
      {
        kind: "sinking_fund",
        name: "School fees",
        target_cents: 720000,
        monthly_cents: 60000,
        starting_cents: 480000,
        due_period: "2030-01",
      },
      {
        kind: "sinking_fund",
        name: "December",
        target_cents: 500000,
        monthly_cents: 50000,
        starting_cents: 400000,
        due_period: "2030-12",
      },
      {
        kind: "sinking_fund",
        name: "Car licence & service",
        target_cents: 300000,
        monthly_cents: 25000,
        starting_cents: 175000,
        due_period: "2030-03",
      },
    ],
  });
  await call("setup_complete", {});
}

export async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function expectAccessible(page: Page) {
  // After a client-side navigation the URL changes before the new page's styles have loaded.
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
}
