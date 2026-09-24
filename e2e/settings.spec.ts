import { expect, test } from "@playwright/test";
import {
  PASSWORD,
  completePrototypeSetup,
  createUser,
  expectAccessible,
  gotoWhenSettled,
  hasLocalStack,
  signIn,
} from "./helpers";

/** Settings (PRD US-41, US-42, US-44, US-45) against a local Supabase stack. */
test.skip(!hasLocalStack, "needs a local Supabase stack");

const NEW_PASSWORD = "Synthetic-e2e-2026-changed";

test("change profile, appearance, password and budget setup, then delete the account", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const user = await createUser("settings");
  let deleted = false;
  try {
    await completePrototypeSetup(user.email);
    await signIn(page, user.email);
    await page.waitForURL(/\/app$/);

    await page.goto("/app/settings");
    await expect(
      page.getByRole("link", { name: "Name, email, password and appearance" }),
    ).toBeVisible();
    await expectAccessible(page);

    // Profile (US-42) and appearance (US-45)
    await page.getByRole("link", { name: "Name, email, password and appearance" }).click();
    await page.getByLabel("Your name (optional)").fill("Sam");
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." }).first()).toBeVisible();
    await page.getByLabel("Dark").check();
    await page.getByRole("button", { name: "Save appearance" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Saved on this device." }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByLabel("Dark")).toBeChecked();
    await expectAccessible(page);

    await page.getByLabel("New email address").fill(`new-${user.email}`);
    await page.getByRole("button", { name: "Change email" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "We've sent a confirmation link" }),
    ).toBeVisible();

    await page.getByLabel("Current password").fill("not-my-password");
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("New password again").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(
      page.getByRole("link", { name: "That isn't your current password" }),
    ).toBeVisible();
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Password changed." })).toBeVisible();

    // Budget setup (US-41): style alone, then a new start day from next month
    await gotoWhenSettled(page, "/app/settings/budget");
    await page.getByLabel(/Zero-based/).check();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Your amounts haven't changed" }),
    ).toBeVisible();
    await page.getByLabel("Your budget month starts on").selectOption("25");
    await expect(page.getByText(/one-off longer or shorter month/)).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("status").filter({
        hasText: /This month keeps its dates\. .+ runs from .+, then your months start on the 25th/,
      }),
    ).toBeVisible();
    await expectAccessible(page);
    // This month is unchanged on the dashboard
    await page.goto("/app");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your month at a glance");

    // Delete the account (US-44)
    await page.goto("/app/settings/data");
    await expect(page.getByRole("link", { name: "Download your data first" })).toBeVisible();
    await page.getByRole("button", { name: "Continue to delete my account" }).click();
    await page.getByLabel("Type DELETE to confirm").fill("delete");
    await page.getByLabel("Your password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Delete my account permanently" }).click();
    await expect(
      page.getByRole("link", { name: "Type DELETE in capital letters to confirm" }),
    ).toBeVisible();
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByLabel("Your password").fill(PASSWORD); // the old one no longer works
    await page.getByRole("button", { name: "Delete my account permanently" }).click();
    await expect(page.getByRole("link", { name: "That isn't your password" })).toBeVisible();
    await expectAccessible(page);
    await page.getByLabel("Your password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Delete my account permanently" }).click();
    await page.waitForURL(/\/account-deleted$/);
    deleted = true;
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Your account has been deleted",
    );
    await expectAccessible(page);

    // Signed out, and the account is gone
    await page.goto("/app");
    await page.waitForURL(/\/sign-in/);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/don't match an account/)).toBeVisible();
  } finally {
    if (!deleted) await user.remove();
  }
});
