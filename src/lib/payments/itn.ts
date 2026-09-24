import {
  PAYFAST_BASE,
  PAYFAST_HOSTS,
  VALIDATE_PATH,
  amountToCents,
  itnParamString,
  itnSignatureValid,
  parseItnBody,
  type PayfastMode,
} from "./payfast";

/**
 * Verifies a PayFast notification (PRD US-07 AC1, threat T4) with the four checks in PayFast's SDK:
 * 1. signature (with passphrase), 2. it came from a PayFast host, 3. the data matches what we expect,
 * 4. PayFast confirms it server to server ("VALID"). Checks 1, 2 and 4 must pass or nothing is recorded.
 * The amount and merchant are compared again in the database against the pending payment, where a mismatch
 * marks the payment rejected (AC2).
 * Network lookups are injected so this can be tested without PayFast.
 */
export type ItnConfig = { mode: PayfastMode; merchantId: string; passphrase?: string };
export type ItnDeps = {
  /** IPv4/IPv6 addresses for a host name. */
  resolveHost: (host: string) => Promise<string[]>;
  /** POST the parameter string to PayFast's validate URL and return the response body. */
  confirm: (url: string, paramString: string) => Promise<string>;
};
export type ItnResult =
  | { ok: false; reason: "malformed" | "signature" | "source" | "confirmation" }
  | {
      ok: true;
      paymentId: string;
      pfPaymentId: string;
      status: string;
      amountCents: number;
      merchantOk: boolean;
    };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function verifyItn(
  rawBody: string,
  sourceIp: string | null,
  config: ItnConfig,
  deps: ItnDeps,
): Promise<ItnResult> {
  const pairs = parseItnBody(rawBody);
  if (!pairs) return { ok: false, reason: "malformed" };
  const get = (k: string) => pairs.find(([key]) => key === k)?.[1];
  const paymentId = get("m_payment_id") ?? "";
  const amountCents = amountToCents(get("amount_gross") ?? "");
  if (
    !UUID.test(paymentId) ||
    amountCents === null ||
    !get("pf_payment_id") ||
    !get("payment_status")
  )
    return { ok: false, reason: "malformed" };

  if (!itnSignatureValid(pairs, config.passphrase)) return { ok: false, reason: "signature" };

  if (!sourceIp) return { ok: false, reason: "source" };
  const allowed = new Set(
    (
      await Promise.all(PAYFAST_HOSTS.map((h) => deps.resolveHost(h).catch(() => [] as string[])))
    ).flat(),
  );
  if (!allowed.has(normaliseIp(sourceIp))) return { ok: false, reason: "source" };

  const body = await deps
    .confirm(`${PAYFAST_BASE[config.mode]}${VALIDATE_PATH}`, itnParamString(pairs))
    .catch(() => "");
  if (body.trim() !== "VALID") return { ok: false, reason: "confirmation" };

  return {
    ok: true,
    paymentId: paymentId.toLowerCase(),
    pfPaymentId: get("pf_payment_id")!,
    status: get("payment_status")!,
    amountCents,
    merchantOk: get("merchant_id") === config.merchantId,
  };
}

/** "::ffff:1.2.3.4" (IPv4-mapped IPv6) compares as "1.2.3.4". */
export function normaliseIp(ip: string): string {
  const v = ip.trim().toLowerCase();
  return v.startsWith("::ffff:") && v.includes(".") ? v.slice(7) : v;
}
