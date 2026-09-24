import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("applies safe defaults in development", () => {
    expect(parseEnv({ NODE_ENV: "development" })).toMatchObject({ APP_PREVIEW: "off" });
  });

  it("allows synthetic preview in development", () => {
    expect(parseEnv({ NODE_ENV: "development", APP_PREVIEW: "synthetic" }).APP_PREVIEW).toBe(
      "synthetic",
    );
  });

  it("refuses preview mode in production", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        APP_PREVIEW: "synthetic",
        NEXT_PUBLIC_SITE_URL: "https://example.com",
      }),
    ).toThrow(/APP_PREVIEW/);
  });

  it("rejects an invalid site URL", () => {
    expect(() => parseEnv({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });

  it("rejects unknown preview values", () => {
    expect(() => parseEnv({ NODE_ENV: "development", APP_PREVIEW: "yes" })).toThrow(/APP_PREVIEW/);
  });
});
