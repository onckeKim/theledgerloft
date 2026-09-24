import { createHash, timingSafeEqual } from "node:crypto";

/**
 * PayFast once-off payments (playbook L9, PRD US-06, US-07).
 * Source: PayFast's official PHP SDK (github.com/Payfast/payfast-php-sdk, lib/Auth.php and
 * lib/PaymentIntegrations/Notification.php, commit 015efcd, 2024-02-28), because developers.payfast.co.za
 * isn't reachable from the build environment. Tests compare against signatures made by that SDK code
 * (src/lib/payments/fixtures.json). Re-check against the current docs before going live (docs/decisions.md D-038).
 */

export type PayfastMode = "sandbox" | "live";
export const PAYFAST_BASE: Record<PayfastMode, string> = {
  sandbox: "https://sandbox.payfast.co.za",
  live: "https://www.payfast.co.za",
};
export const PROCESS_PATH = "/eng/process";
export const VALIDATE_PATH = "/eng/query/validate";
/** Hosts a notification may come from (SDK Notification::pfValidIP). */
export const PAYFAST_HOSTS = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
];

/** PHP urlencode(): RFC 1738 style, spaces as "+", everything but A-Z a-z 0-9 - _ . percent-encoded (upper case). */
export function phpUrlencode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");
}

/** PHP urldecode() of a form value ("+" is a space). Throws on malformed escapes. */
function formDecode(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, " "));
}

/** PHP stripslashes(), which the SDK applies to notification data before checking it. */
function stripslashes(value: string): string {
  return value.replace(/\\(.?)/g, (_, c: string) => (c === "0" ? "\0" : c));
}

const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");

/** Checkout signature (SDK Auth::generateSignature): fields in PayFast's order, empty values skipped. */
const CHECKOUT_FIELDS = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "notify_method",
  "name_first",
  "name_last",
  "email_address",
  "cell_number",
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",
  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",
  "email_confirmation",
  "confirmation_address",
  "currency",
  "payment_method",
  "subscription_type",
  "passphrase",
] as const;

export function checkoutSignature(data: Record<string, string>, passphrase?: string): string {
  const parts: string[] = [];
  for (const key of CHECKOUT_FIELDS) {
    const value =
      key === "passphrase"
        ? passphrase
          ? phpUrlencode(passphrase.trim())
          : ""
        : (data[key] ?? "");
    if (value !== "") parts.push(`${key}=${phpUrlencode(value.trim())}`);
  }
  return md5(parts.join("&"));
}

/** Cents to PayFast's amount format ("10.00"). */
export function centsToAmount(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents <= 0)
    throw new RangeError("amount must be positive cents");
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** PayFast amount ("10.00", "-1.50") to cents, exactly; null if it isn't a plain decimal amount. */
export function amountToCents(amount: string): number | null {
  const m = /^(-?)(\d{1,9})(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!m) return null;
  const cents = Number(m[2]) * 100 + Number((m[3] ?? "").padEnd(2, "0"));
  return m[1] ? -cents : cents;
}

export type CheckoutConfig = {
  mode: PayfastMode;
  merchantId: string;
  merchantKey: string;
  passphrase?: string;
};

/** The form the browser posts to PayFast. Values come from the server; the price from the pending payment. */
export function buildCheckout(
  config: CheckoutConfig,
  p: {
    paymentId: string;
    amountCents: number;
    itemName: string;
    returnUrl: string;
    cancelUrl: string;
    notifyUrl: string;
    email?: string;
  },
) {
  const data: Record<string, string> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: p.returnUrl,
    cancel_url: p.cancelUrl,
    notify_url: p.notifyUrl,
    ...(p.email ? { email_address: p.email } : {}),
    m_payment_id: p.paymentId,
    amount: centsToAmount(p.amountCents),
    item_name: p.itemName.slice(0, 100),
  };
  const signature = checkoutSignature(data, config.passphrase);
  const fields = [
    ...CHECKOUT_FIELDS.filter((k) => data[k] !== undefined).map((k) => [k, data[k]!] as const),
  ];
  return {
    action: `${PAYFAST_BASE[config.mode]}${PROCESS_PATH}`,
    fields: [...fields, ["signature", signature] as const],
  };
}

/** A notification body as ordered [key, value] pairs, decoded like PHP's $_POST, then stripslashes(). */
export function parseItnBody(raw: string): [string, string][] | null {
  try {
    return raw
      .split("&")
      .filter(Boolean)
      .map((pair) => {
        const i = pair.indexOf("=");
        const k = formDecode(i < 0 ? pair : pair.slice(0, i));
        const v = i < 0 ? "" : formDecode(pair.slice(i + 1));
        return [k, stripslashes(v)] as [string, string];
      });
  } catch {
    return null;
  }
}

/** Parameter string for the notification signature and server confirmation: fields up to "signature". */
export function itnParamString(pairs: [string, string][]): string {
  const parts: string[] = [];
  for (const [k, v] of pairs) {
    if (k === "signature") break;
    parts.push(`${k}=${phpUrlencode(v)}`);
  }
  return parts.join("&");
}

export function itnSignatureValid(pairs: [string, string][], passphrase?: string): boolean {
  const given = pairs.find(([k]) => k === "signature")?.[1];
  if (!given || !/^[0-9a-f]{32}$/.test(given)) return false;
  const base = itnParamString(pairs);
  const expected = md5(passphrase ? `${base}&passphrase=${phpUrlencode(passphrase)}` : base);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}
