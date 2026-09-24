import { expect, test } from "@playwright/test";
import { completePrototypeSetup, createUser, hasLocalStack, signIn } from "./helpers";

/** Release checklist D (N5): a core journey with the keyboard only. No mouse clicks after signing in. */
test.skip(!hasLocalStack, "needs a local Supabase stack");

test("add a transaction with the keyboard only", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "keyboard journey on desktop");
  const user = await createUser("keys");
  try {
    await completePrototypeSetup(user.email);
    await signIn(page, user.email);
    await page.waitForURL(/\/app$/);
    await page.goto("/app/transactions");
    await page.waitForLoadState("networkidle");

    // The skip link is first, then Tab reaches the form's fields in order
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveText("Skip to content");
    const focusUntil = async (selector: string, max = 80) => {
      for (let i = 0; i < max; i++) {
        if (await page.locator(selector).evaluate((el) => el === document.activeElement)) return;
        await page.keyboard.press("Tab");
      }
      throw new Error(`never reached ${selector}`);
    };
    await focusUntil("#tx-amount");
    await page.keyboard.type("123,45");
    await focusUntil("#tx-categoryId");
    await page.keyboard.press("ArrowDown"); // first category
    await page.keyboard.press("Tab");
    await page.keyboard.type("Keyboard only");
    await focusUntil("button[type=submit]:has-text('Save transaction')");
    // Focus is visible (a real outline, not just the browser default being removed)
    const outline = await page
      .locator(":focus")
      .evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await expect(page.locator("strong").filter({ hasText: "Keyboard only" })).toBeVisible();
  } finally {
    await user.remove();
  }
});
