import { lookup } from "node:dns/promises";
import { createClient } from "@supabase/supabase-js";
import { payfastConfig } from "@/lib/env";
import { publicEnv } from "@/lib/public-env";
import { verifyItn } from "@/lib/payments/itn";
import type { Database } from "@/lib/supabase/database.types";

/**
 * PayFast Instant Transaction Notification (PRD US-07, threat T4). Called by PayFast, never by the browser.
 * 1. Verify it (signature, PayFast source, server confirmation): src/lib/payments/itn.ts.
 * 2. Apply it in the database (amount and merchant matched against the pending payment, idempotent), through a
 *    function that needs the payments secret. No service-role key, no user session.
 * Logs carry only the outcome, never payment or personal data.
 */
const reply = (status: number) =>
  new Response(status === 200 ? "OK" : "Bad request", {
    status,
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
  });

/** The caller's address as set by the hosting platform (Vercel overwrites these headers; D-038). */
function sourceIp(request: Request): string | null {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

export async function POST(request: Request) {
  const config = payfastConfig();
  if (!config) return reply(404);
  if (!request.headers.get("content-type")?.includes("application/x-www-form-urlencoded"))
    return reply(400);
  const raw = await request.text();
  if (raw.length > 10_000) return reply(400);

  const result = await verifyItn(raw, sourceIp(request), config, {
    resolveHost: async (host) => (await lookup(host, { all: true })).map((a) => a.address),
    confirm: async (url, paramString) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: paramString,
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok ? res.text() : "";
    },
  });
  if (!result.ok) {
    console.warn(`payfast notify rejected: ${result.reason}`);
    return reply(400);
  }

  const supabase = createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.rpc("payfast_apply_itn", {
    p_secret: config.dbSecret,
    p_payment_id: result.paymentId,
    p_pf_payment_id: result.pfPaymentId,
    p_status: result.status,
    p_amount_cents: result.amountCents,
    p_merchant_ok: result.merchantOk,
  });
  if (error) {
    // 500 so PayFast tries again later; the function is idempotent.
    console.error("payfast notify: could not record the notification");
    return reply(500);
  }
  console.info(`payfast notify: ${data}`);
  return reply(200);
}
