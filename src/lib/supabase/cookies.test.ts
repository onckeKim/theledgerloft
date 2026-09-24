import { describe, expect, it } from "vitest";
import { hardenCookie } from "./cookies";

describe("hardenCookie (US-04 AC3)", () => {
  it("makes session cookies HttpOnly and SameSite=Lax, keeping the rest", () => {
    expect(
      hardenCookie({ path: "/", maxAge: 400, httpOnly: false, sameSite: "none" }, true),
    ).toEqual({
      path: "/",
      maxAge: 400,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
  });
  it("is Secure only in production", () => {
    expect(hardenCookie(undefined, false)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
  });
});
