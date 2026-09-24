import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Guided setup against a real (local) Supabase stack: `npx supabase start`, then run with
 *   E2E_SUPABASE_URL, E2E_SUPABASE_PUBLISHABLE_KEY and E2E_SUPABASE_SERVICE_KEY (local stack only, never production).
 * Skipped when those aren't set (e.g. CI without a database).
 */
const url = process.env.E2E_SUPABASE_URL;
const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
test.skip(!url || !serviceKey, "needs a local Supabase stack");
test.describe.configure({ mode: "serial" });

const password = "Synthetic-e2e-2026";
let email = "";

async function admin(path: string, init: RequestInit) {
  const res = await fetch(`${url}/auth/v1/admin/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey!,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`admin ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function expectAccessible(page: Page) {
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

async function fillRow(page: Page, index: number, name: string, amount: string) {
  const cards = page.locator("#rows fieldset");
  await cards
    .nth(index)
    .getByLabel(/^(Name|Bill|Category)$/)
    .fill(name);
  await cards
    .nth(index)
    .getByLabel(/per month/i)
    .fill(amount);
}

test.beforeAll(async () => {
  email = `setup-${Date.now()}@example.test`;
  await admin("users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
});

test.afterAll(async () => {
  const { users } = (await admin("users?per_page=200", { method: "GET" })) as {
    users: { id: string; email: string }[];
  };
  const u = users.find((x) => x.email === email);
  if (u) await admin(`users/${u.id}`, { method: "DELETE" });
});

test("a new user is taken to the welcome step and can complete setup", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.waitForURL("**/app/setup/welcome");
  await expectAccessible(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Let's set up your planner");
  await expect(page.getByText("No bank logins, ever.")).toBeVisible();

  await page.getByRole("link", { name: "Start setup" }).click();
  await page.waitForURL("**/app/setup/basics");
  await expectAccessible(page);
  await expect(page.getByText("Step 1 of 6 · Basics")).toBeVisible();
  await page.getByLabel(/Monthly/).check();
  await page.getByLabel("Your budget month starts on").selectOption("1");
  await page.getByLabel(/Flexible/).check();
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Income: a blank amount shows the focused error summary; nothing is lost
  await page.waitForURL("**/app/setup/income");
  await expectAccessible(page);
  await fillRow(page, 0, "Salary", "19 500,00");
  await page.getByRole("button", { name: "Add another income" }).click();
  await page.locator("#rows fieldset").nth(1).getByLabel("Name").fill("Side income");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.locator(":focus")).toContainText("There's 1 thing to fix");
  await expect(page.getByRole("link", { name: "Enter an amount, like 19 500,00" })).toBeVisible();
  await page
    .locator("#rows fieldset")
    .nth(1)
    .getByLabel(/per month/i)
    .fill("2 240,00");
  await expect(page.getByText("R 21 740,00")).toBeVisible(); // running total
  await page.getByRole("button", { name: "Save and continue" }).click();

  await page.waitForURL("**/app/setup/bills");
  await expectAccessible(page);
  for (const s of ["Housing", "Electricity & water", "Phone & data", "Insurance"])
    await page.getByRole("button", { name: s }).click();
  for (const [i, amount] of ["6 200", "1 100", "450", "600"].entries())
    await page
      .locator("#rows fieldset")
      .nth(i)
      .getByLabel(/per month/i)
      .fill(amount);
  await page.getByRole("button", { name: "Save and continue" }).click();

  await page.waitForURL("**/app/setup/spending");
  await expectAccessible(page);
  for (const s of ["Groceries", "Transport", "Personal & fun"])
    await page.getByRole("button", { name: s }).click();
  for (const [i, amount] of ["3 400", "1 400", "600"].entries())
    await page
      .locator("#rows fieldset")
      .nth(i)
      .getByLabel(/per month/i)
      .fill(amount);
  // Leaving the last field triggers an autosave (the step is valid)
  await page
    .locator("#rows fieldset")
    .nth(2)
    .getByLabel(/per month/i)
    .blur();
  await expect(page.getByText("All changes saved")).toBeVisible();
  // Autosaved: a reload keeps the rows
  await page.reload();
  await expect(page.locator("#rows fieldset")).toHaveCount(3);
  await page.getByRole("button", { name: "Save and continue" }).click();

  await page.waitForURL("**/app/setup/debts-goals");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Add a debt" }).click();
  await page.getByLabel("Name").fill("Store card");
  await page.getByLabel("Balance owed").fill("2 150");
  await page.getByLabel("Minimum a month").fill("450");
  await page.getByLabel(/Yearly interest/).fill("21");
  for (const [n, min] of [
    ["Credit card", "1 200"],
    ["Personal loan", "950"],
  ]) {
    await page.getByRole("button", { name: "Add a debt" }).click();
    const card = page
      .locator("fieldset")
      .filter({ has: page.getByLabel("Balance owed") })
      .last();
    await card.getByLabel("Name").fill(n!);
    await card.getByLabel("Balance owed").fill("1 000");
    await card.getByLabel("Minimum a month").fill(min!);
  }
  await page.getByRole("button", { name: "Add a goal" }).click();
  const goal = page.locator("fieldset").filter({ hasText: "Savings goal" }).last();
  await goal.getByLabel("Name").fill("Emergency fund");
  await goal.getByLabel("Target").fill("20 000");
  await goal.getByLabel(/Per month/).fill("800");
  for (const [n, target, monthly] of [
    ["School fees", "7 200", "600"],
    ["December", "5 000", "500"],
    ["Car licence & service", "3 000", "250"],
  ]) {
    await page.getByRole("button", { name: "Add a sinking fund" }).click();
    const fund = page.locator("fieldset").filter({ hasText: "Sinking fund" }).last();
    await fund.getByLabel("Name").fill(n!);
    await fund.getByLabel("Target").fill(target!);
    await fund.getByLabel(/Per month/).fill(monthly!);
    await fund.getByLabel("Needed by (month)").fill("2030-01");
  }
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Review matches the L4 prototype household: planned R 18 500,00, left to budget R 3 240,00
  await page.waitForURL("**/app/setup/review");
  await expect(page.getByText("Step 6 of 6 · Review")).toBeVisible();
  await expect(page.locator("tfoot")).toContainText("R 18 500,00");
  await expect(page.locator(".text-num-lg")).toHaveText("R 3 240,00");
  await expectAccessible(page);

  await page.getByRole("button", { name: "Finish and go to my dashboard" }).click();
  await page.waitForURL("**/app?welcome=1");
  await expect(page.getByText("Your plan is ready.")).toBeVisible();

  // Setup is closed once finished
  await page.goto("/app/setup/income");
  await page.waitForURL(/\/app(\?.*)?$/);
});
