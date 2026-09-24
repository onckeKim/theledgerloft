/**
 * Whether the https-only protections apply: Secure session cookies (US-04 AC3) and the CSP's
 * upgrade-insecure-requests (T7). They follow the site's own address as well as the build mode, because a production
 * build served over plain http on localhost (the end-to-end tests) breaks in Safari/WebKit otherwise: WebKit rejects
 * Secure cookies there and upgrades localhost requests to https, while Chromium and Firefox exempt localhost.
 * env.ts refuses an http site URL in production for anything but localhost, so real deployments always get them.
 */
export function servedOverHttps(
  siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
  production: boolean = process.env.NODE_ENV === "production",
): boolean {
  if (!production) return false;
  return !siteUrl?.startsWith("http://");
}

/** Hosts where a production build may be served over plain http (local runs and end-to-end tests only). */
export function isLocalHost(url: string): boolean {
  const { hostname } = new URL(url);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
