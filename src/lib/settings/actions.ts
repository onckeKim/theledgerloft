"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { verifySession } from "@/lib/auth/dal";
import type { ActionResult } from "@/lib/budget/actions";
import { formatPeriod } from "@/lib/calc/period";
import { env, siteUrl } from "@/lib/env";
import { parseBasics, type BasicsInput } from "@/lib/setup/schemas";
import { createClient } from "@/lib/supabase/server";
import {
  THEME_COOKIE,
  isTheme,
  parseDeletion,
  parseDisplayName,
  parseEmailChange,
  parsePasswordChange,
} from "./schemas";

const GENERIC: ActionResult = {
  status: "error",
  message: "We couldn't save that just now. Please try again.",
};
const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
const ordinal = (n: number) =>
  `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/**
 * Checks the signed-in user's password without touching their session: a separate, non-persisting sign-in that is
 * revoked straight away. Used before a password change and before account deletion.
 */
async function passwordMatches(email: string | null, password: string): Promise<boolean> {
  if (!email) return false;
  const probe = createPlainClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { error } = await probe.auth.signInWithPassword({ email, password });
  if (error) return false;
  await probe.auth.signOut({ scope: "local" });
  return true;
}

/** Change pay frequency, month start day and style after setup (PRD US-41). */
export async function saveBudgetSetup(input: BasicsInput): Promise<ActionResult> {
  await verifySession("/app/settings/budget");
  const parsed = parseBasics(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("change_budget_setup", {
    p_pay_frequency: parsed.data.payFrequency,
    p_start_day: parsed.data.monthStartDay,
    p_style: parsed.data.budgetStyle,
  });
  if (error?.hint === "setup")
    return { status: "error", message: "Finish setting up your planner first." };
  if (error) return GENERIC;
  revalidatePath("/app", "layout");
  const r = data?.[0];
  if (r?.start_day_changed && r.transition_period && r.transition_starts && r.transition_ends) {
    const next = new Date(`${r.transition_ends}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return {
      status: "ok",
      message: `Saved. This month keeps its dates. ${formatPeriod(r.transition_period)} runs from ${longDate(r.transition_starts)} to ${longDate(r.transition_ends)}, then your months start on the ${ordinal(parsed.data.monthStartDay)}, from ${longDate(next.toISOString().slice(0, 10))}.`,
    };
  }
  return { status: "ok", message: "Saved. Your amounts haven't changed." };
}

export async function saveDisplayName(input: { displayName: string }): Promise<ActionResult> {
  const session = await verifySession("/app/settings/profile");
  const parsed = parseDisplayName(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", session.userId);
  if (error) return GENERIC;
  revalidatePath("/app", "layout");
  return { status: "ok", message: "Saved." };
}

/** New email address (PRD US-42 AC1): it changes only after the confirmation link is used. */
export async function changeEmail(input: { email: string }): Promise<ActionResult> {
  const session = await verifySession("/app/settings/profile");
  const parsed = parseEmailChange(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  if (parsed.data.email === session.email)
    return { status: "error", errors: { email: "That's already your email address" } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: siteUrl("/auth/callback?next=/app/settings/profile") },
  );
  if (error?.code === "email_exists")
    return { status: "error", errors: { email: "Use a different email address" } };
  if (error) return GENERIC;
  return {
    status: "ok",
    message: `We've sent a confirmation link to ${parsed.data.email}. Your email changes once you use it. You may also get a link at your current address.`,
  };
}

export async function changePassword(input: {
  current: string;
  password: string;
  confirm: string;
}): Promise<ActionResult> {
  const session = await verifySession("/app/settings/profile");
  const parsed = parsePasswordChange(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  if (!(await passwordMatches(session.email, parsed.data.current)))
    return { status: "error", errors: { current: "That isn't your current password" } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error?.code === "weak_password" || error?.code === "same_password")
    return { status: "error", errors: { password: "Choose a different, less common password" } };
  if (error) return GENERIC;
  return { status: "ok", message: "Password changed." };
}

/**
 * Delete my account (PRD US-44): type DELETE and the password; deletes the user and every household only they belong
 * to (all its data), keeps a data-free audit event, signs out and shows a confirmation.
 */
export async function deleteAccount(input: {
  confirm: string;
  password: string;
}): Promise<ActionResult> {
  const session = await verifySession("/app/settings/data");
  const parsed = parseDeletion(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  if (!(await passwordMatches(session.email, parsed.data.password)))
    return { status: "error", errors: { password: "That isn't your password" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account", { p_confirm: "DELETE" });
  if (error) {
    console.error("account deletion failed", error.code);
    return {
      status: "error",
      message: "We couldn't delete your account just now. Nothing was deleted. Please try again.",
    };
  }
  // The user no longer exists; this clears the session cookies on this device.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/account-deleted" as Route);
}

/** Light, dark or follow the device (PRD US-45). Remembered on this device only. */
export async function setTheme(theme: string): Promise<ActionResult> {
  await verifySession("/app/settings/profile");
  if (!isTheme(theme)) return GENERIC;
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  revalidatePath("/", "layout");
  return { status: "ok", message: "Saved on this device." };
}
