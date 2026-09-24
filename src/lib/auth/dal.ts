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
