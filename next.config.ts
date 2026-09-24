import type { NextConfig } from "next";

// Static security headers (threat model T7, T13). A nonce-based Content-Security-Policy is added
// in A4 via proxy.ts, once signed-in pages are dynamically rendered (see docs/decisions.md D-019).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  // The export route reads the PDF fonts from disk (src/lib/export/pdf.ts).
  outputFileTracingIncludes: {
    "/api/exports/*": ["./src/lib/export/fonts/**/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
