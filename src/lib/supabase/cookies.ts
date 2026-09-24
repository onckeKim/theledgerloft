import { servedOverHttps } from "@/lib/security/https";

/**
 * Session cookie flags (PRD US-04 AC3, threat T3): HttpOnly, SameSite=Lax, Secure whenever the site is served over
 * https (servedOverHttps(): every real deployment).
 * Safe because the app has no browser-side Supabase client: only the server reads the session cookies.
 */

export function hardenCookie<T extends object | undefined>(options: T, secure = servedOverHttps()) {
  return { ...(options ?? {}), httpOnly: true, sameSite: "lax" as const, secure };
}
