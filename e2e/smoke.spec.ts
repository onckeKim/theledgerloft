import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC_PAGES = ["/", "/pilot", "/disclaimer", "/privacy", "/terms", "/sign-in"];

test.describe("public pages", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} renders, has one h1, no horizontal scroll and no serious a11y issues`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(
        serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
      ).toEqual([]);
    });
  }

  test("home page carries the disclaimer and the no-bank-logins promise", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "with the maths done for you",
    );
    await expect(
      page.getByText("does not provide financial, legal, tax or debt advice"),
    ).toBeVisible();
    await expect(page.getByText("No bank logins, ever.")).toBeVisible();
  });

  test("skip link is the first thing keyboard users reach", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
  });
});

test.describe("protected app routes", () => {
  for (const path of ["/app", "/app/budget", "/app/settings"]) {
    test(`${path} sends signed-out visitors to sign-in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent(path)}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
    });
  }
});

test("unknown pages return a branded 404", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't find that page");
});

test("security headers are set", async ({ request }) => {
  const response = await request.get("/");
  const h = response.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();
});
