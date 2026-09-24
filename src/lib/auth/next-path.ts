/**
 * Where to send someone after signing in. Only same-site paths inside the app are allowed,
 * so a crafted `?next=` link can't bounce users to another website (open redirect).
 */
export function safeNextPath(candidate: string | null | undefined, fallback = "/app"): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/app")) return fallback;
  if (candidate.startsWith("//") || candidate.includes("\\") || /[\u0000-\u001F]/.test(candidate))
    return fallback;
  const next = candidate.slice(4);
  if (next !== "" && !next.startsWith("/") && !next.startsWith("?")) return fallback; // e.g. /appevil
  return candidate;
}
