"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { siteUrl } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/next-path";
import {
  fieldErrorsFrom,
  newPasswordFormSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  type FormState,
} from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};

// Messages never reveal whether an email is registered (US-02 AC3, US-05 AC2).

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    email: text(form, "email"),
    password: text(form, "password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { email: text(form, "email") },
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: siteUrl("/auth/callback?next=/app") },
  });
  if (error && error.code === "weak_password") {
    return {
      status: "error",
      fieldErrors: { password: "Choose a less common password" },
      values: { email: parsed.data.email },
    };
  }
  if (error && error.code !== "user_already_exists") {
    console.error("sign-up failed", error.code ?? error.status);
    return {
      status: "error",
      message: "We couldn't create your account just now. Please try again in a moment.",
      values: { email: parsed.data.email },
    };
  }
  redirect("/check-email?reason=verify" as Route);
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: text(form, "email"),
    password: text(form, "password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { email: text(form, "email") },
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      status: "error",
      message:
        "That email and password don't match an account, or the email hasn't been verified yet.",
      values: { email: parsed.data.email },
    };
  }
  redirect(safeNextPath(text(form, "next")) as Route);
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse({ email: text(form, "email") });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { email: text(form, "email") },
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: siteUrl("/auth/callback?next=/reset-password"),
  });
  if (error) console.error("password reset request failed", error.code ?? error.status);
  redirect("/check-email?reason=reset" as Route);
}

export async function updatePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = newPasswordFormSchema.safeParse({
    password: text(form, "password"),
    confirm: text(form, "confirm"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password" || error.code === "same_password") {
      return {
        status: "error",
        fieldErrors: { password: "Choose a different, less common password" },
      };
    }
    return {
      status: "error",
      message: "Your reset link may have expired. Request a new one and try again.",
    };
  }
  redirect("/app" as Route);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
