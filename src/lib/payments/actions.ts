"use server";

import { getAccess, verifySession } from "@/lib/auth/dal";
import { payfastConfig, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { buildCheckout } from "./payfast";

export type CheckoutResult =
  | { status: "ok"; action: string; fields: (readonly [string, string])[] }
  | { status: "error"; message: string };

/**
 * Start paying for the pilot (PRD US-06 AC2). The database creates the pending payment at the plan's price;
 * nothing about the price or plan comes from the browser. Returns the form the browser posts to PayFast.
 */
export async function startCheckout(): Promise<CheckoutResult> {
  const session = await verifySession("/app/join");
  const config = payfastConfig();
  if (!config) return { status: "error", message: "The pilot isn't open for payment yet." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_checkout", {});
  if (error?.hint === "entitled")
    return { status: "error", message: "You already have pilot access." };
  if (error?.hint === "closed")
    return { status: "error", message: "The pilot isn't open for payment yet." };
  if (error?.hint === "too_many")
    return { status: "error", message: "Please wait a little before trying again." };
  const row = data?.[0];
  if (error || !row)
    return { status: "error", message: "We couldn't start the payment. Please try again." };
  const form = buildCheckout(config, {
    paymentId: row.payment_id,
    amountCents: row.amount_cents,
    itemName: row.item_name,
    returnUrl: siteUrl("/app/join/return"),
    cancelUrl: siteUrl("/app/join/cancel"),
    notifyUrl: siteUrl("/api/payfast/notify"),
    email: session.email ?? undefined,
  });
  return { status: "ok", ...form };
}

/** Polled by the return page. It only reads access; it never grants it (US-06 AC3). */
export async function accessStatus(): Promise<{ active: boolean }> {
  await verifySession("/app/join/return");
  return { active: (await getAccess()).active };
}
