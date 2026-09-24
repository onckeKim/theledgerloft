/**
 * Session cookie flags (PRD US-04 AC3, threat T3): HttpOnly, SameSite=Lax, Secure in production.
 * Safe because the app has no browser-side Supabase client: only the server reads the session cookies.
 */

export function hardenCookie<T extends object | undefined>(
  options: T,
  production = process.env.NODE_ENV === "production",
) {
  return { ...(options ?? {}), httpOnly: true, sameSite: "lax" as const, secure: production };
}
