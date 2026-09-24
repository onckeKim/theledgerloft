import { z } from "zod";
import { emailSchema, fieldErrorsFrom, newPasswordSchema } from "@/lib/auth/schemas";

/** Settings forms (PRD US-42, US-44, US-45). Pure, so they're unit-tested. */
export type FieldErrors = Record<string, string>;
type Result<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

const toResult = <T>(r: z.ZodSafeParseResult<T>): Result<T> =>
  r.success
    ? { ok: true, data: r.data }
    : { ok: false, errors: fieldErrorsFrom(r.error) as FieldErrors };

export const parseDisplayName = (input: { displayName: string }) =>
  toResult(
    z
      .object({
        displayName: z
          .string()
          .trim()
          .max(60, { error: "Use 60 characters or fewer" })
          .transform((v) => v.replace(/\s+/g, " ") || null),
      })
      .safeParse(input),
  );

export const parseEmailChange = (input: { email: string }) =>
  toResult(z.object({ email: emailSchema }).safeParse(input));

export const parsePasswordChange = (input: {
  current: string;
  password: string;
  confirm: string;
}) =>
  toResult(
    z
      .object({
        current: z.string().min(1, { error: "Enter your current password" }),
        password: newPasswordSchema,
        confirm: z.string(),
      })
      .refine((v) => v.password === v.confirm, {
        path: ["confirm"],
        error: "The passwords don't match",
      })
      .refine((v) => v.password !== v.current, {
        path: ["password"],
        error: "Choose a password different from your current one",
      })
      .safeParse(input),
  );

/** Account deletion: type DELETE (exactly, spaces around it ignored) and enter the password (US-44 AC1). */
export const parseDeletion = (input: { confirm: string; password: string }) =>
  toResult(
    z
      .object({
        confirm: z
          .string()
          .trim()
          .refine((v) => v === "DELETE", { error: "Type DELETE in capital letters to confirm" }),
        password: z.string().min(1, { error: "Enter your password" }),
      })
      .safeParse(input),
  );

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const isTheme = (v: unknown): v is Theme => THEMES.includes(v as Theme);
export const THEME_COOKIE = "ll-theme";
