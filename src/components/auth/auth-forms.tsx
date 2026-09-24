"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import type { FormState } from "@/lib/auth/schemas";

const initial: FormState = { status: "idle" };

/** Error summary at the top of the form; receives focus after a failed submit (PRD US-16 AC4 pattern). */
function ErrorSummary({ state }: { state: FormState }) {
  const ref = useRef<HTMLDivElement>(null);
  const errors = Object.entries(state.fieldErrors ?? {});
  useEffect(() => {
    if (state.status === "error") ref.current?.focus();
  }, [state]);
  if (state.status !== "error") return null;
  return (
    <div ref={ref} tabIndex={-1} className="mb-6 outline-none">
      <Alert tone="danger" live>
        {state.message ? (
          <p>{state.message}</p>
        ) : (
          <p className="font-semibold">There&apos;s something to fix</p>
        )}
        {errors.length > 0 ? (
          <ul className="mb-0 mt-1 pl-5">
            {errors.map(([field, message]) => (
              <li key={field}>
                <a href={`#${field}`}>{message}</a>
              </li>
            ))}
          </ul>
        ) : null}
      </Alert>
    </div>
  );
}

export function SignInForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} noValidate>
      {notice && state.status === "idle" ? (
        <Alert tone="info" className="mb-6">
          <p>{notice}</p>
        </Alert>
      ) : null}
      <ErrorSummary state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <TextField
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <Button type="submit" block disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="mt-6 flex flex-wrap justify-between gap-3 text-body-sm">
        <Link href="/forgot-password">Forgot your password?</Link>
        <Link href="/sign-up">Create an account</Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  return (
    <form action={action} noValidate>
      <ErrorSummary state={state} />
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <TextField
        id="password"
        name="password"
        type="password"
        label="Password"
        help="At least 10 characters. A few unrelated words work well."
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
      />
      <Button type="submit" block disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>
      <p className="mt-4 text-body-sm text-fg-muted">
        We&apos;ll email you a link to confirm your address. We never ask for bank logins.
      </p>
      <p className="mt-6 text-body-sm">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  return (
    <form action={action} noValidate>
      <ErrorSummary state={state} />
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Button type="submit" block disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="mt-6 text-body-sm">
        <Link href="/sign-in">Back to sign in</Link>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <form action={action} noValidate>
      <ErrorSummary state={state} />
      <TextField
        id="password"
        name="password"
        type="password"
        label="New password"
        help="At least 10 characters."
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
      />
      <TextField
        id="confirm"
        name="confirm"
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <Button type="submit" block disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
