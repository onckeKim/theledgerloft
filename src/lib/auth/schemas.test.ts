import { describe, expect, it } from "vitest";
import { fieldErrorsFrom, newPasswordFormSchema, signInSchema, signUpSchema } from "./schemas";

describe("auth schemas", () => {
  it("normalises email case and whitespace", () => {
    expect(
      signUpSchema.parse({ email: "  Sam@Example.COM ", password: "long enough pw" }).email,
    ).toBe("sam@example.com");
  });

  it("rejects short passwords with a plain message", () => {
    const r = signUpSchema.safeParse({ email: "sam@example.com", password: "short" });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(fieldErrorsFrom(r.error)).toEqual({ password: "Use at least 10 characters" });
  });

  it("rejects bad emails", () => {
    const r = signInSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error).email).toMatch(/Enter an email address/);
  });

  it("requires matching new passwords", () => {
    const r = newPasswordFormSchema.safeParse({
      password: "a good long pw",
      confirm: "different pw!",
    });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(fieldErrorsFrom(r.error)).toEqual({ confirm: "The passwords don't match" });
  });
});
