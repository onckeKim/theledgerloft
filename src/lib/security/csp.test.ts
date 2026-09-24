import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";

describe("buildCsp", () => {
  const prod = buildCsp({ nonce: "abc123", supabaseUrl: "https://proj.supabase.co/", dev: false });

  it("allows only nonce'd scripts in production", () => {
    expect(prod).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(prod).not.toContain("unsafe-eval");
  });

  it("blocks framing, plugins and foreign form posts", () => {
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("form-action 'self'");
  });

  it("lets the browser talk to Supabase and nothing else", () => {
    expect(prod).toContain("connect-src 'self' https://proj.supabase.co");
  });

  it("adds dev-only allowances in development", () => {
    const dev = buildCsp({ nonce: "n", supabaseUrl: "https://proj.supabase.co", dev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });
});
