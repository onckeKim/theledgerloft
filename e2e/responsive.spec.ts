import { expect, test } from "@playwright/test";
import {
  completePrototypeSetup,
  createUser,
  expectAccessible,
  hasLocalStack,
  previousMonth,
  seedPreviousMonth,
  signIn,
} from "./helpers";

/**
 * Release checklist D (N5, N6): every main page at 320, 390, 820 and 1280 px, light and dark:
 * no horizontal scroll and no serious or critical axe issues. Screenshots go to test-results for review.
 */
test.skip(!hasLocalStack, "needs a local Supabase stack");
test.describe.configure({ mode: "serial" });

const WIDTHS = [320, 390, 820, 1280];
const SCHEMES = ["light", "dark"] as const;

test("every main page at every width, light and dark", async ({ page, browserName }, info) => {
  test.skip(info.project.name !== "desktop" || browserName !== "chromium", "one sweep is enough");
  test.setTimeout(600_000);
  const user = await createUser("sweep");
  const unpaid = await createUser("sweep-unpaid", { access: false });
  try {
    await completePrototypeSetup(user.email);
    await seedPreviousMonth(user.email);
    const period = previousMonth().label;
    const pages = [
      "/app",
      "/app/budget",
      "/app/transactions",
      "/app/goals",
      "/app/debts",
      `/app/review/${period}`,
      "/app/settings",
      "/app/settings/data",
    ];
    await signIn(page, user.email);
    await page.waitForURL(/\/app$/);
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of pages) {
          await page.goto(path);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await expectAccessible(page);
          await page.screenshot({
            path: info.outputPath(`${scheme}-${width}${path.replace(/\//g, "_")}.png`),
            fullPage: true,
          });
        }
      }
    }
    // Public pages and the join page for someone without access
    await page.context().clearCookies();
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of ["/", "/sign-in", "/privacy"]) {
          await page.goto(path);
          await expectAccessible(page);
        }
      }
    }
    await signIn(page, unpaid.email);
    await page.waitForURL(/\/app\/join$/);
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/app/join");
        await expectAccessible(page);
      }
    }
  } finally {
    await user.remove();
    await unpaid.remove();
  }
});
