import { expect, test } from "@playwright/test";
import { checkoutSignature } from "../src/lib/payments/payfast";
import { applyNotification, createUser, expectAccessible, hasLocalStack, signIn } from "./helpers";

/** Pilot payment (PRD US-06, US-07, threat T4) against a local Supabase stack. PayFast itself is never called. */
test.skip(!hasLocalStack, "needs a local Supabase stack");

const NB = " ";

test("join the pilot: access only after a verified, matching payment", async ({ page }) => {
  test.setTimeout(180_000);
  const user = await createUser("pay", { access: false });
  try {
    // Stop the browser at PayFast and keep what it posted.
    const posted: URLSearchParams[] = [];
    await page.route("https://sandbox.payfast.co.za/**", async (route) => {
      posted.push(new URLSearchParams(route.request().postData() ?? ""));
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<title>PayFast (test)</title>",
      });
    });

    await signIn(page, user.email);
    await page.waitForURL(/\/app\/join$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Join the founding pilot");
    await expect(page.getByText(`R${NB}10,00`)).toBeVisible();
    await expect(page.getByText(/90 days of access/)).toBeVisible();
    await expectAccessible(page);

    // Paid pages send you back to join; settings and your data don't need access
    await page.goto("/app/budget");
    await page.waitForURL(/\/app\/join$/);
    await page.goto("/app/settings/data");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your data");

    // Cancelling at PayFast comes back with a neutral message
    await page.goto("/app/join/cancel");
    await page.waitForURL(/\/app\/join\?notice=cancelled/);
    await expect(
      page.getByRole("status").filter({ hasText: "No payment was taken" }),
    ).toBeVisible();

    // Checkout: the server's price and a valid signature go to PayFast
    await page.getByRole("button", { name: "Pay with PayFast" }).click();
    await expect.poll(() => posted.length).toBe(1);
    await page.waitForURL(/sandbox\.payfast\.co\.za\/eng\/process/);
    const form = posted[0]!;
    expect(form.get("merchant_id")).toBe("10000100");
    expect(form.get("amount")).toBe("10.00");
    expect(form.get("notify_url")).toMatch(/\/api\/payfast\/notify$/);
    expect(form.get("email_address")).toBe(user.email);
    const fields = Object.fromEntries([...form.entries()].filter(([k]) => k !== "signature"));
    expect(form.get("signature")).toBe(checkoutSignature(fields, "jt7NOE43FZPn"));
    const paymentId = form.get("m_payment_id")!;

    // A forged notification is refused before anything is recorded
    const forged = new URLSearchParams({
      m_payment_id: paymentId,
      pf_payment_id: "999",
      payment_status: "COMPLETE",
      amount_gross: "10.00",
      merchant_id: "10000100",
      signature: "0".repeat(32),
    });
    const res = await page.request.post("/api/payfast/notify", {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: forged.toString(),
    });
    expect(res.status()).toBe(400);

    // A verified notification with a tampered amount is rejected: still no access
    expect(await applyNotification(paymentId, 100)).toBe("rejected");
    await page.goto("/app");
    await page.waitForURL(/\/app\/join$/);

    // A fresh checkout, paid in full: access, once
    await page.getByRole("button", { name: "Pay with PayFast" }).click();
    await expect.poll(() => posted.length).toBe(2);
    await page.waitForURL(/sandbox\.payfast\.co\.za\/eng\/process/);
    const second = posted[1]!.get("m_payment_id")!;
    expect(second).not.toBe(paymentId);
    await page.goto("/app/join/return");
    await expect(page.getByText("Confirming your payment…")).toBeVisible();
    expect(await applyNotification(second, 1000, "PENDING")).toBe("pending");
    expect(await applyNotification(second, 1000)).toBe("granted");
    expect(await applyNotification(second, 1000)).toBe("duplicate");
    await expect(page.getByText("You're in. Welcome to the founding pilot.")).toBeVisible({
      timeout: 15_000,
    });
    await expectAccessible(page);
    await page.getByRole("link", { name: "Start setting up your planner" }).click();
    await page.waitForURL(/\/app\/setup/);

    // With access, join sends you to the app. The page redirects itself, which interrupts page.goto (Firefox and
    // WebKit report that as an error), so navigate as the browser would and check where it lands.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a test acting as the browser
    await page.evaluate(() => window.location.assign("/app/join"));
    await page.waitForURL(/\/app\/setup/);
  } finally {
    await user.remove();
  }
});
