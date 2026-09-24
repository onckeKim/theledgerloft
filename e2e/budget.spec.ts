import { expect, test } from "@playwright/test";
import {
  completePrototypeSetup,
  createUser,
  expectAccessible,
  hasLocalStack,
  signIn,
} from "./helpers";

/** Monthly budget, transactions and dashboard (PRD US-20…US-29) against a local Supabase stack. */
test.skip(!hasLocalStack, "needs a local Supabase stack");

const NB = " ";
const zar = (s: string) => s.replace(/ /g, NB); // amounts render with non-breaking spaces

test("plan, record and review a month", async ({ page }) => {
  test.setTimeout(180_000);
  const user = await createUser("budget");
  try {
    await completePrototypeSetup(user.email);
    await signIn(page, user.email);
    await page.waitForURL(/\/app$/);

    // Dashboard: the L4 prototype plan
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your month at a glance");
    await expect(page.getByText(zar("R 21 740,00"), { exact: true }).first()).toBeVisible();
    await expect(page.getByText(zar("R 18 500,00"), { exact: true }).first()).toBeVisible();
    await expect(page.getByText(zar("R 3 240,00"), { exact: true }).first()).toBeVisible();
    await page.getByText("How this was calculated").click();
    await expect(page.getByText("Income", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Your plan is ready. Add your first spending")).toBeVisible();
    await expect(page.getByText(/Next in your snowball order: Store card/)).toBeVisible();
    await expectAccessible(page);

    // Checklist remembers ticks
    await page.getByLabel("Pay fixed bills", { exact: true }).check();
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByLabel("Pay fixed bills", { exact: true })).toBeChecked();

    // Transactions: add spending, income, refund
    await page.goto("/app/transactions");
    await expectAccessible(page);
    const add = async (
      kind: string,
      amount: string,
      category: string | null,
      description: string,
    ) => {
      await page.getByText(kind, { exact: true }).click();
      await page.getByLabel("Amount").fill(amount);
      if (category)
        await page.getByLabel("Category", { exact: true }).selectOption({ label: category });
      await page.getByLabel("Description (optional)").fill(description);
      await page.getByRole("button", { name: "Save transaction" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    };
    // Validation first: no category chosen
    await page.getByLabel("Amount").fill("100");
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.locator(":focus")).toContainText("There's 1 thing to fix");
    await expect(page.getByRole("link", { name: "Choose a category" })).toBeVisible();

    await add("Spending", "3 650", "Groceries", "Groceries for the month");
    await add("Spending", "980", "Transport", "Fuel");
    await add("Income", "19 500", null, "Salary");
    await add("Refund", "50", "Transport", "Parking refund");
    await page.reload();
    await expect(
      page.locator("strong").filter({ hasText: "Groceries for the month" }),
    ).toBeVisible();
    await expect(page.getByText(`−${zar("R 3 650,00")}`)).toBeVisible();
    await expect(page.getByText(`+${zar("R 19 500,00")}`)).toBeVisible();

    // Filter and search
    await page.getByLabel("Filter by category").selectOption({ label: "Transport" });
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.locator("strong").filter({ hasText: "Fuel" })).toBeVisible();
    await expect(page.locator("strong").filter({ hasText: "Groceries for the month" })).toHaveCount(
      0,
    );
    await page.goto("/app/transactions?q=zzz-nothing");
    await expect(page.getByText("Nothing matches these filters")).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).first().click();

    // Edit
    await page.getByRole("link", { name: "Edit Fuel" }).click();
    await page.waitForURL(/\/app\/transactions\/[0-9a-f-]+/);
    await page.getByLabel("Amount").fill("1 000");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL(/\/app\/transactions\?period=/);
    await expect(page.getByText(`−${zar("R 1 000,00")}`)).toBeVisible();

    // Delete with undo
    await page.getByRole("button", { name: "Delete Parking refund" }).click();
    await page.getByRole("button", { name: /Undo/ }).click();
    await page.reload();
    await expect(page.locator("strong").filter({ hasText: "Parking refund" })).toBeVisible();

    // Budget: remaining in words, inline edit, move money, add/remove category
    await page.goto("/app/budget");
    await expectAccessible(page);
    const groceries = page
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name: /Groceries/ }) });
    await expect(groceries).toContainText(zar("R 250,00 over"));
    const planned = page.getByLabel("Planned for Groceries");
    await planned.fill("3 700");
    await planned.press("Enter");
    await expect(
      page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: /Groceries/ }) }),
    ).toContainText(zar("R 50,00 left"));
    await expect(page.getByText(zar("R 18 800,00"), { exact: true }).first()).toBeVisible(); // planned total now 18 800

    await page
      .getByLabel("Move from")
      .selectOption({ label: `Transport (${zar("R 1 400,00")} planned)` });
    await page
      .getByLabel("Move to")
      .selectOption({ label: `Personal & fun (${zar("R 600,00")} planned)` });
    await page.locator("#move-amount").fill("200");
    await page.getByRole("button", { name: "Move money" }).click();
    await expect(page.getByText("Moved. Your total planned stays the same.")).toBeVisible();
    await expect(page.getByLabel("Planned for Transport")).toHaveValue("1 200,00");
    await expect(page.getByLabel("Planned for Personal & fun")).toHaveValue("800,00");

    await page.locator("#new-cat-name").fill("Gifts");
    await page.locator("#new-cat-planned").fill("0");
    await page.getByRole("button", { name: "Add category" }).click();
    await expect(
      page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: /Gifts/ }) }),
    ).toContainText("Not planned yet");
    await page.getByRole("button", { name: "Remove Gifts" }).click();
    await page.getByRole("button", { name: "Yes, remove" }).click();
    await expect(page.getByText("Category removed.")).toBeVisible();

    // Next month copies the plan; far past months aren't invented
    await page.getByRole("link", { name: /Next month/ }).click();
    await expect(page.getByLabel("Planned for Groceries")).toHaveValue("3 700,00");
    await page.goto("/app/budget?period=2020-01");
    await expect(page.getByText("Nothing planned for January 2020")).toBeVisible();

    // Dashboard reflects the month
    await page.goto("/app");
    await expect(page.getByText("Spent so far")).toBeVisible();
    await expectAccessible(page);
  } finally {
    await user.remove();
  }
});
