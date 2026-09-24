import { describe, expect, it } from "vitest";
import {
  isTheme,
  parseDeletion,
  parseDisplayName,
  parseEmailChange,
  parsePasswordChange,
} from "./schemas";

describe("settings validation", () => {
  it("display name is optional, trimmed and at most 60 characters", () => {
    expect(parseDisplayName({ displayName: "  Sam   M  " })).toEqual({
      ok: true,
      data: { displayName: "Sam M" },
    });
    expect(parseDisplayName({ displayName: "   " })).toEqual({
      ok: true,
      data: { displayName: null },
    });
    expect(parseDisplayName({ displayName: "x".repeat(61) }).ok).toBe(false);
  });
  it("new email must be a real address", () => {
    expect(parseEmailChange({ email: " Sam@Example.TEST " })).toEqual({
      ok: true,
      data: { email: "sam@example.test" },
    });
    expect(parseEmailChange({ email: "not-an-email" }).ok).toBe(false);
  });
  it("password change needs the current one, 10+ characters, a match and a change", () => {
    const ok = { current: "old-password-1", password: "new-password-2", confirm: "new-password-2" };
    expect(parsePasswordChange(ok).ok).toBe(true);
    const errors = (v: typeof ok) => {
      const r = parsePasswordChange(v);
      return r.ok ? {} : r.errors;
    };
    expect(errors({ ...ok, current: "" })).toHaveProperty("current");
    expect(errors({ ...ok, password: "short", confirm: "short" })).toHaveProperty("password");
    expect(errors({ ...ok, confirm: "different-1" })).toEqual({
      confirm: "The passwords don't match",
    });
    expect(errors({ ...ok, password: ok.current, confirm: ok.current })).toHaveProperty("password");
  });
  it("deletion needs DELETE exactly (spaces ignored) and the password", () => {
    expect(parseDeletion({ confirm: " DELETE ", password: "x" }).ok).toBe(true);
    const r = parseDeletion({ confirm: "delete", password: "" });
    expect(r.ok ? null : Object.keys(r.errors).sort()).toEqual(["confirm", "password"]);
  });
  it("knows the three themes", () => {
    expect(["system", "light", "dark"].every(isTheme)).toBe(true);
    expect(isTheme("sepia")).toBe(false);
  });
});
