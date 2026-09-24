import { z } from "zod";

/** Server-side validation for auth forms (PRD US-02…US-05). Messages are shown to users; keep them plain. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email({ error: "Enter an email address, like name@example.com" })
      .max(254, { error: "That email address is too long" }),
  );

export const newPasswordSchema = z
  .string()
  .min(10, { error: "Use at least 10 characters" })
  .max(72, { error: "Use 72 characters or fewer" });

export const signUpSchema = z.object({ email: emailSchema, password: newPasswordSchema });
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Enter your password" }),
});
export const resetRequestSchema = z.object({ email: emailSchema });
export const newPasswordFormSchema = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    error: "The passwords don't match",
  });

export type FieldErrors = Partial<Record<string, string>>;

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  values?: { email?: string };
};

/** First error message per field. */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
