import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Route } from "next";
import { env } from "@/lib/env";

/**
 * Data access layer for authentication. Every signed-in page and every data function calls
 * `verifySession()`; layouts must not be relied on for protection (they don't re-run on navigation).
 * A test (src/app/(app)/pages-guard.test.ts) fails if an app page forgets.
 */
export type Session = { userId: string; mode: "preview" | "user" };

export const getSession = cache(async (): Promise<Session | null> => {
  // A session is always per request: never let a signed-in page be prerendered at build time.
  await connection();
  // A4 replaces this with Supabase Auth (session verified on the server).
  if (env.APP_PREVIEW === "synthetic") return { userId: "preview-user", mode: "preview" };
  return null;
});

export async function verifySession(returnTo = "/app"): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}` as Route);
  return session;
}
