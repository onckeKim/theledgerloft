import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC_PAGES = [
  "/",
  "/pilot",
  "/disclaimer",
  "/privacy",
  "/terms",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/check-email",
];

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

test.describe("sign-in form", () => {
  test("shows a focused error summary for an invalid email, without calling the server's auth", async ({
    page,
  }) => {
    await page.goto("/sign-in?next=/app/budget");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("anything");
    await page.getByRole("button", { name: "Sign in" }).click();
    const summary = page.getByRole("alert").filter({ hasText: "Enter an email address" });
    await expect(summary).toBeVisible();
    await expect(page.locator(":focus")).toContainText("There's something to fix");
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Email")).toHaveValue("not-an-email");
  });

  test("keeps only safe return paths", async ({ page }) => {
    await page.goto("/sign-in?next=https://evil.example");
    await expect(page.locator('input[name="next"]')).toHaveValue("/app");
  });
});

test("security headers are set", async ({ request }) => {
  const response = await request.get("/");
  const h = response.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();
  const csp = h["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
});

test("each response gets a fresh CSP nonce", async ({ request }) => {
  const nonce = async () =>
    /'nonce-([^']+)'/.exec(
      (await request.get("/")).headers()["content-security-policy"] ?? "",
    )?.[1];
  const [a, b] = [await nonce(), await nonce()];
  expect(a).toBeTruthy();
  expect(a).not.toBe(b);
});
