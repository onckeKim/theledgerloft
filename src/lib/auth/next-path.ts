/**
 * Where to send someone after signing in or following an email link. Only same-site paths under an allowed
 * prefix pass, so a crafted `?next=` link can't bounce users to another website (open redirect).
 */
export function safeNextPath(
  candidate: string | null | undefined,
  fallback = "/app",
  allowed: readonly string[] = ["/app"],
): string {
  if (!candidate) return fallback;
  if (candidate.startsWith("//") || candidate.includes("\\") || /[\u0000-\u001F]/.test(candidate))
    return fallback;
  const prefix = allowed.find(
    (p) => candidate === p || candidate.startsWith(`${p}/`) || candidate.startsWith(`${p}?`),
  );
  return prefix ? candidate : fallback;
}
