import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";

/**
 * Data access layer for authentication. Every signed-in page and every data function calls
 * `verifySession()`; layouts must not be relied on for protection (they don't re-run on navigation).
 * A test (src/app/(app)/pages-guard.test.ts) fails if an app page forgets.
 *
 * getClaims() verifies the access token's signature (Supabase guidance). Never trust getSession() on the server.
 */
export type Session = { userId: string; email: string | null };

export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { userId: sub, email };
});

export async function verifySession(returnTo = "/app"): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}` as Route);
  return session;
}

/**
 * Pilot access (PRD P-1, US-06): an entitlement granted by a verified payment, read as the user (RLS).
 * Settings, data export and deletion don't need it (US-43, US-44).
 */
export const getAccess = cache(async (): Promise<{ active: boolean; endsAt: string | null }> => {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("entitlements")
    .select("ends_at")
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { active: Boolean(data), endsAt: data?.ends_at ?? null };
});

/** For pages and actions that need pilot access: signed in, verified, and entitled; otherwise /app/join. */
export async function requireAccess(returnTo = "/app"): Promise<Session> {
  const session = await verifySession(returnTo);
  const access = await getAccess();
  if (!access.active) redirect("/app/join" as Route);
  return session;
}
