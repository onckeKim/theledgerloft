/**
 * Content-Security-Policy (threat T7). Scripts need a per-request nonce, so every page is rendered on request
 * (root layout calls connection()). Inline style attributes are allowed: server-rendered style="" values
 * (e.g. progress bar widths) would otherwise be blocked, and style injection is far lower risk than script.
 */
export function buildCsp({
  nonce,
  supabaseUrl,
  dev,
  https,
}: {
  nonce: string;
  supabaseUrl: string;
  dev: boolean;
  /** servedOverHttps(): only then may the browser upgrade every request to https. */
  https: boolean;
}): string {
  const supabase = new URL(supabaseUrl).origin;
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", supabase, ...(dev ? ["ws:"] : [])],
    "frame-ancestors": ["'none'"],
    // The pilot checkout posts a form to PayFast (L9). PayFast may move between its own hosts during checkout.
    "form-action": ["'self'", "https://*.payfast.co.za"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  };
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (https) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
