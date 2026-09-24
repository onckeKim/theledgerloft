import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const base = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key_000000",
};

describe("parseEnv", () => {
  it("accepts a valid development setup", () => {
    expect(parseEnv({ NODE_ENV: "development", ...base }).NEXT_PUBLIC_SUPABASE_URL).toBe(
      base.NEXT_PUBLIC_SUPABASE_URL,
    );
  });

  it("requires the Supabase URL and key", () => {
    expect(() => parseEnv({ NODE_ENV: "development" })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() =>
      parseEnv({
        NODE_ENV: "development",
        NEXT_PUBLIC_SUPABASE_URL: base.NEXT_PUBLIC_SUPABASE_URL,
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("requires the site URL in production", () => {
    expect(() => parseEnv({ NODE_ENV: "production", ...base })).toThrow(/NEXT_PUBLIC_SITE_URL/);
    expect(
      parseEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://app.example.co.za",
        ...base,
      }).NODE_ENV,
    ).toBe("production");
  });

  it("rejects invalid URLs", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "development", ...base, NEXT_PUBLIC_SITE_URL: "not a url" }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL/);
    expect(() =>
      parseEnv({ NODE_ENV: "development", ...base, NEXT_PUBLIC_SUPABASE_URL: "nope" }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
