import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it.each(["/app", "/app/budget", "/app/transactions?period=2026-09", "/app?x=1"])(
    "keeps %j",
    (p) => expect(safeNextPath(p)).toBe(p),
  );
  it.each([
    null,
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/appevil",
    "/app\\@evil.example",
    "/sign-in",
    "/app/\u0000x",
  ])("falls back for %j", (p) => expect(safeNextPath(p)).toBe("/app"));
});
