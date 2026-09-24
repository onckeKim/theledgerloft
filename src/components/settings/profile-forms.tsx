"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { ErrorSummary } from "@/components/ui/error-summary";
import { TextField } from "@/components/ui/field";
import type { ActionResult } from "@/lib/budget/actions";
import { changeEmail, changePassword, saveDisplayName, setTheme } from "@/lib/settings/actions";
import { useHydrated } from "@/lib/use-hydrated";

function SmallForm<T extends Record<string, string>>({
  id,
  initial,
  action,
  submit,
  clearOnSuccess,
  children,
}: {
  id: string;
  initial: T;
  action: (values: T) => Promise<ActionResult>;
  submit: string;
  clearOnSuccess?: boolean;
  children: (f: ReturnType<typeof useFormAction<T>>) => React.ReactNode;
}) {
  const hydrated = useHydrated();
  const f = useFormAction(initial);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        f.run(() => action(f.values), clearOnSuccess ? () => f.setValues(initial) : undefined);
      }}
    >
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary items={f.summary(id)} message={f.errors.form} focusToken={f.focusToken} />
        {children(f)}
        <Button type="submit" variant="secondary" disabled={f.pending}>
          {f.pending ? "Saving…" : submit}
        </Button>
        <p role="status" className="m-0 mt-3 min-h-5 text-body-sm text-fg-muted">
          {f.message}
        </p>
      </fieldset>
    </form>
  );
}

export function DisplayNameForm({ initial }: { initial: string }) {
  return (
    <SmallForm
      id="profile"
      initial={{ displayName: initial }}
      action={saveDisplayName}
      submit="Save name"
    >
      {(f) => (
        <TextField
          id="profile-displayName"
          label="Your name (optional)"
          help="Only used to greet you in the app."
          maxLength={60}
          autoComplete="given-name"
          value={f.values.displayName}
          onChange={(e) => f.set("displayName", e.target.value)}
          error={f.errors.displayName}
        />
      )}
    </SmallForm>
  );
}

export function EmailForm() {
  return (
    <SmallForm
      id="email"
      initial={{ email: "" }}
      action={changeEmail}
      submit="Change email"
      clearOnSuccess
    >
      {(f) => (
        <TextField
          id="email-email"
          label="New email address"
          type="email"
          autoComplete="email"
          value={f.values.email}
          onChange={(e) => f.set("email", e.target.value)}
          error={f.errors.email}
        />
      )}
    </SmallForm>
  );
}

export function PasswordForm() {
  return (
    <SmallForm
      id="password"
      initial={{ current: "", password: "", confirm: "" }}
      action={changePassword}
      submit="Change password"
      clearOnSuccess
    >
      {(f) => (
        <>
          <TextField
            id="password-current"
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={f.values.current}
            onChange={(e) => f.set("current", e.target.value)}
            error={f.errors.current}
          />
          <TextField
            id="password-password"
            label="New password"
            help="At least 10 characters."
            type="password"
            autoComplete="new-password"
            value={f.values.password}
            onChange={(e) => f.set("password", e.target.value)}
            error={f.errors.password}
          />
          <TextField
            id="password-confirm"
            label="New password again"
            type="password"
            autoComplete="new-password"
            value={f.values.confirm}
            onChange={(e) => f.set("confirm", e.target.value)}
            error={f.errors.confirm}
          />
        </>
      )}
    </SmallForm>
  );
}

const THEME_OPTIONS = [
  { value: "system", label: "Match my device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeForm({ initial }: { initial: string }) {
  return (
    <SmallForm
      id="theme"
      initial={{ theme: initial }}
      action={(v) => setTheme(v.theme)}
      submit="Save appearance"
    >
      {(f) => (
        <fieldset className="m-0 mb-4 border-0 p-0">
          <legend className="mb-2 font-semibold">Appearance on this device</legend>
          {THEME_OPTIONS.map((o) => (
            <label key={o.value} className="mb-2 flex items-center gap-3">
              <input
                type="radio"
                name="theme"
                value={o.value}
                checked={f.values.theme === o.value}
                onChange={() => f.set("theme", o.value)}
                className="size-[18px] accent-[var(--ll-btn-bg)]"
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      )}
    </SmallForm>
  );
}
