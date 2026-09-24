import { expect, test } from "@playwright/test";
import {
  completePrototypeSetup,
  createUser,
  expectAccessible,
  hasLocalStack,
  signIn,
} from "./helpers";

/** Goals, sinking funds and debts (PRD US-30…US-37) plus the L7 carry-overs, against a local Supabase stack. */
test.skip(!hasLocalStack, "needs a local Supabase stack");

const NB = " ";
const zar = (s: string) => s.replace(/ /g, NB);
const status = (page: import("@playwright/test").Page, text: string | RegExp) =>
  page.getByRole("status").filter({ hasText: text });

test("save towards goals and pay down debts", async ({ page }) => {
  test.setTimeout(180_000);
  const user = await createUser("goals");
  try {
    await completePrototypeSetup(user.email);
    await signIn(page, user.email);
    await page.waitForURL(/\/app$/);

    // Goals list (L4 G1 and the sinking funds)
    await page.goto("/app/goals");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Goals and sinking funds");
    await expect(page.getByRole("link", { name: "Emergency fund", exact: true })).toBeVisible();
    await expect(page.getByText(/Reaches R.20.000,00 around/)).toBeVisible();
    await expect(page.getByRole("link", { name: "School fees", exact: true })).toBeVisible();
    await expectAccessible(page);

    // Add and take out money (P-3)
    await page.getByRole("link", { name: "Add money to Emergency fund" }).click();
    await page.waitForURL(/\/app\/goals\/[0-9a-f-]+/);
    await page.locator("#add-amount").fill("500");
    await page.getByRole("button", { name: "Add money" }).click();
    await expect(status(page, "Added.")).toBeVisible();
    await expect(page.getByText(zar("R 6 900,00")).first()).toBeVisible();
    await page.locator("#out-amount").fill("7 000");
    await page.getByRole("button", { name: "Take money out" }).click();
    await expect(page.getByRole("link", { name: "That's more than is saved in it" })).toBeVisible();
    await page.locator("#out-amount").fill("100");
    await page.getByRole("button", { name: "Take money out" }).click();
    await expect(status(page, "Taken out.")).toBeVisible();
    await expect(page.getByText(zar("R 6 800,00")).first()).toBeVisible();
    await expectAccessible(page);

    // Its transactions are changed from the goal, not the transactions page
    await page.goto("/app/transactions");
    const row = page.getByRole("listitem").filter({ hasText: "Added to Emergency fund" });
    await expect(row.getByRole("link", { name: /Open goal/ })).toBeVisible();
    await expect(row.getByRole("link", { name: /^Edit/ })).toHaveCount(0);

    // A new sinking fund, then remove it (nothing recorded, so it's simply deleted)
    const due = `${new Date().getFullYear() + 1}-06`;
    await page.goto("/app/goals/new");
    await page.getByLabel("A sinking fund").check();
    await page.getByLabel("Name").fill("Holiday");
    await page.getByLabel("Target").fill("8 000");
    await page.getByLabel("Needed in").fill(due);
    await page.getByLabel("Set aside each month").fill("500");
    await page.getByRole("button", { name: "Add sinking fund" }).click();
    await page.waitForURL(/\/app\/goals\/[0-9a-f-]+\?notice=created/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Holiday");
    await page.getByRole("button", { name: "Remove this fund" }).click();
    await page.getByRole("button", { name: "Yes, remove" }).click();
    await page.waitForURL(/\/app\/goals\?notice=deleted/);
    await expect(status(page, "Deleted.")).toBeVisible();

    // A goal with history is archived by default (US-33 AC2)
    await page.getByRole("link", { name: "Emergency fund", exact: true }).click();
    await page.getByRole("button", { name: "Remove this goal" }).click();
    await expect(page.getByLabel(/Keep its history/)).toBeChecked();
    await page.getByRole("button", { name: "Archive it" }).click();
    await page.waitForURL(/\/app\/goals\?notice=archived/);
    await expect(page.getByRole("link", { name: "Emergency fund", exact: true })).toHaveCount(0);

    // Debts: payoff order and estimates (L4 D1, D2), remembered choice, extra amount
    await page.goto("/app/debts");
    await expect(page.getByText(zar("R 3 061,62")).first()).toBeVisible();
    const rows = page.getByRole("table").getByRole("rowheader");
    await expect(rows.nth(0)).toContainText("Store card");
    await expect(page.getByRole("button", { name: "Snowball" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("heading", { name: "Need help with debt?" })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("button", { name: "Avalanche" }).click();
    await expect(page.getByText(zar("R 3 057,67")).first()).toBeVisible();
    await expect(rows.nth(0)).toContainText("Personal loan");
    await page.reload();
    await expect(page.getByRole("button", { name: "Avalanche" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByLabel("Explore paying extra each month").fill("500");
    await page.getByRole("button", { name: "Show estimate" }).click();
    await expect(
      page.getByText(`Minimum payments plus ${zar("R 500,00")} extra (exploring)`),
    ).toBeVisible();

    // Record payments (P-4), confirm an overpayment, then update from a statement
    await page.getByRole("link", { name: "Store card" }).click();
    await page.waitForURL(/\/app\/debts\/[0-9a-f-]+/);
    await page.getByLabel("Amount paid").fill("450");
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(status(page, `The balance is now ${zar("R 1 700,00")}`)).toBeVisible();
    await page.getByLabel("Amount paid").fill("2 000");
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText(/more than the R.1.700,00 balance/)).toBeVisible();
    await page.getByRole("button", { name: "Yes, record it" }).click();
    await expect(page.getByText("Paid off", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/This debt is paid off\. If the balance/)).toBeVisible();
    await page.getByLabel("Balance on your statement").fill("120");
    await page.getByRole("button", { name: "Update balance" }).click();
    await expect(status(page, `Balance updated to ${zar("R 120,00")}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Record payment" })).toBeVisible();
    await expectAccessible(page);

    // Rename a category (US-23)
    await page.goto("/app/budget");
    await page.getByRole("button", { name: "Rename Personal & fun" }).click();
    await page.getByLabel("New name for Personal & fun").fill("Fun money");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("rowheader", { name: /Fun money/ })).toBeVisible();

    // Hide a checklist item (US-25 AC2)
    await page.goto("/app");
    await page.getByText("Choose checklist items").click();
    await page.getByLabel("Show “Add this week's spending”").uncheck();
    await expect(page.getByLabel("Add this week's spending", { exact: true })).toHaveCount(0);
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByLabel("Add this week's spending", { exact: true })).toHaveCount(0);
    await expectAccessible(page);
  } finally {
    await user.remove();
  }
});
