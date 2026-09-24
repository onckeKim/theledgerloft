import { describe, expect, it } from "vitest";
import { isHttpsSite, isLocalHost } from "./https";

describe("isHttpsSite", () => {
  it("applies the https-only protections to production on https", () => {
    expect(isHttpsSite("https://app.example.co.za", true)).toBe(true);
  });
  it("fails safe when production has no site URL (env validation refuses that anyway)", () => {
    expect(isHttpsSite(undefined, true)).toBe(true);
  });
  it("leaves them off for a production build served over http on localhost, and in development", () => {
    expect(isHttpsSite("http://localhost:3100", true)).toBe(false);
    expect(isHttpsSite("https://app.example.co.za", false)).toBe(false);
  });
});

describe("isLocalHost", () => {
  it("recognises only local hosts", () => {
    expect(isLocalHost("http://localhost:3100")).toBe(true);
    expect(isLocalHost("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalHost("http://[::1]:3000")).toBe(true);
    expect(isLocalHost("http://localhost.example.com")).toBe(false);
    expect(isLocalHost("http://app.example.co.za")).toBe(false);
  });
});
