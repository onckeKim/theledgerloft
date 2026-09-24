import { describe, expect, it, vi } from "vitest";
import fixtures from "./fixtures.json";
import { verifyItn } from "./itn";
import {
  amountToCents,
  buildCheckout,
  centsToAmount,
  checkoutSignature,
  itnParamString,
  itnSignatureValid,
  parseItnBody,
  phpUrlencode,
} from "./payfast";

/** Fixtures were produced by PayFast's official PHP SDK (scripts/payfast-fixtures.php). Synthetic values. */

describe("PHP-compatible encoding", () => {
  it("matches PHP urlencode", () => {
    expect(phpUrlencode("a b~*!()'@–&=+/")).toBe("a+b%7E%2A%21%28%29%27%40%E2%80%93%26%3D%2B%2F");
    expect(phpUrlencode("Az09-_.")).toBe("Az09-_.");
  });
  it("converts amounts exactly", () => {
    expect(centsToAmount(1000)).toBe("10.00");
    expect(centsToAmount(105)).toBe("1.05");
    expect(amountToCents("10.00")).toBe(1000);
    expect(amountToCents("9.5")).toBe(950);
    expect(amountToCents("-0.23")).toBe(-23);
    expect(amountToCents("1e3")).toBeNull();
    expect(amountToCents("10.001")).toBeNull();
    expect(() => centsToAmount(0)).toThrow();
  });
});

describe("checkout signature (SDK Auth::generateSignature)", () => {
  it.each(fixtures.checkout)("matches the SDK with passphrase %#", (f) => {
    expect(checkoutSignature(f.data, f.passphrase || undefined)).toBe(f.signature);
  });
  it("builds the form in PayFast's field order with the server's price", () => {
    const f = fixtures.checkout[1]!;
    const form = buildCheckout(
      {
        mode: "sandbox",
        merchantId: f.data.merchant_id,
        merchantKey: f.data.merchant_key,
        passphrase: f.passphrase,
      },
      {
        paymentId: f.data.m_payment_id,
        amountCents: 1000,
        itemName: f.data.item_name,
        returnUrl: f.data.return_url,
        cancelUrl: f.data.cancel_url,
        notifyUrl: f.data.notify_url,
        email: f.data.email_address,
      },
    );
    expect(form.action).toBe("https://sandbox.payfast.co.za/eng/process");
    expect(form.fields.map(([k]) => k)).toEqual([...Object.keys(f.data), "signature"]);
    expect(Object.fromEntries(form.fields).signature).toBe(f.signature);
    expect(
      buildCheckout(
        { mode: "live", merchantId: "1", merchantKey: "k" },
        {
          paymentId: "x",
          amountCents: 1,
          itemName: "i",
          returnUrl: "r",
          cancelUrl: "c",
          notifyUrl: "n",
        },
      ).action,
    ).toBe("https://www.payfast.co.za/eng/process");
  });
});

describe("notification signature (SDK Notification)", () => {
  it.each(fixtures.itn)("builds the same parameter string and accepts the signature %#", (f) => {
    const pairs = parseItnBody(f.body)!;
    expect(itnParamString(pairs)).toBe(f.paramString);
    expect(f.sdkValid).toBe(true);
    expect(itnSignatureValid(pairs, f.passphrase || undefined)).toBe(true);
  });
  it("rejects a forged or tampered notification", () => {
    const f = fixtures.itn[1]!;
    const tampered = parseItnBody(f.body.replace("amount_gross=10.00", "amount_gross=1.00"))!;
    expect(itnSignatureValid(tampered, f.passphrase)).toBe(false);
    expect(itnSignatureValid(parseItnBody(f.body)!, "wrong-passphrase")).toBe(false);
    expect(
      itnSignatureValid(parseItnBody(f.body.replace(/signature=[0-9a-f]+/, ""))!, f.passphrase),
    ).toBe(false);
  });
  it("returns null for a malformed body", () => {
    expect(parseItnBody("a=%E0%A4%A")).toBeNull();
  });
});

describe("verifyItn", () => {
  const f = fixtures.itn[1]!;
  const config = { mode: "sandbox" as const, merchantId: "10000100", passphrase: f.passphrase };
  const deps = (over: Partial<Parameters<typeof verifyItn>[3]> = {}) => ({
    resolveHost: vi.fn(async (h: string) =>
      h === "sandbox.payfast.co.za" ? ["196.33.227.224"] : ["197.97.145.144"],
    ),
    confirm: vi.fn(async () => "VALID"),
    ...over,
  });

  it("accepts a genuine notification and asks PayFast to confirm it", async () => {
    const d = deps();
    const r = await verifyItn(f.body, "::ffff:196.33.227.224", config, d);
    expect(r).toEqual({
      ok: true,
      paymentId: "6f1c2d3e-0000-4000-8000-000000000001",
      pfPaymentId: "1089250",
      status: "COMPLETE",
      amountCents: 1000,
      merchantOk: true,
    });
    expect(d.confirm).toHaveBeenCalledWith(
      "https://sandbox.payfast.co.za/eng/query/validate",
      f.paramString,
    );
  });
  it("stops at a forged signature without asking PayFast", async () => {
    const d = deps();
    const forged = f.body.replace(/signature=[0-9a-f]{32}/, `signature=${"0".repeat(32)}`);
    expect(await verifyItn(forged, "196.33.227.224", config, d)).toEqual({
      ok: false,
      reason: "signature",
    });
    expect(d.confirm).not.toHaveBeenCalled();
  });
  it("rejects other sources, and a missing source", async () => {
    expect(await verifyItn(f.body, "203.0.113.9", config, deps())).toEqual({
      ok: false,
      reason: "source",
    });
    expect(await verifyItn(f.body, null, config, deps())).toEqual({ ok: false, reason: "source" });
  });
  it("needs PayFast's server confirmation", async () => {
    const invalid = deps({ confirm: vi.fn(async () => "INVALID") });
    expect(await verifyItn(f.body, "196.33.227.224", config, invalid)).toEqual({
      ok: false,
      reason: "confirmation",
    });
    const down = deps({ confirm: vi.fn(async () => Promise.reject(new Error("timeout"))) });
    expect(await verifyItn(f.body, "196.33.227.224", config, down)).toEqual({
      ok: false,
      reason: "confirmation",
    });
  });
  it("flags a different merchant for the database to reject", async () => {
    const r = await verifyItn(f.body, "196.33.227.224", { ...config, merchantId: "999" }, deps());
    expect(r.ok && r.merchantOk).toBe(false);
  });
  it("treats a notification without our payment id as malformed", async () => {
    const body = f.body.replace(
      "m_payment_id=6f1c2d3e-0000-4000-8000-000000000001",
      "m_payment_id=abc",
    );
    expect(await verifyItn(body, "196.33.227.224", config, deps())).toEqual({
      ok: false,
      reason: "malformed",
    });
  });
});
