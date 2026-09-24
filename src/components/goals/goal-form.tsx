"use client";

import { Button } from "@/components/ui/button";
import { ErrorSummary } from "@/components/ui/error-summary";
import { TextField } from "@/components/ui/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { saveGoal } from "@/lib/goals/actions";
import type { GoalInput } from "@/lib/goals/schemas";
import { useHydrated } from "@/lib/use-hydrated";

/** New or edit goal / sinking fund (PRD US-30, US-31, US-33). A new one redirects to its page when saved. */
export function GoalForm({
  id = null,
  initial,
  kindLocked,
  minDue,
  maxDue,
}: {
  id?: string | null;
  initial: GoalInput;
  kindLocked?: boolean;
  minDue: string;
  maxDue: string;
}) {
  const hydrated = useHydrated();
  const f = useFormAction(initial);
  const fund = f.values.kind === "sinking_fund";

  return (
    <form noValidate onSubmit={(e) => (e.preventDefault(), f.run(() => saveGoal(id, f.values)))}>
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary items={f.summary("goal")} message={f.errors.form} focusToken={f.focusToken} />
        {kindLocked ? null : (
          <fieldset className="m-0 mb-5 border-0 p-0">
            <legend className="mb-2 font-semibold">What are you saving for?</legend>
            {(
              [
                [
                  "goal",
                  "A savings goal",
                  "Something you're saving towards, with or without a deadline.",
                ],
                [
                  "sinking_fund",
                  "A sinking fund",
                  "A cost you know is coming, due in a particular month.",
                ],
              ] as const
            ).map(([value, label, help]) => (
              <label key={value} className="mb-2 flex items-start gap-3">
                <input
                  type="radio"
                  name="goal-kind"
                  value={value}
                  checked={f.values.kind === value}
                  onChange={() => f.set("kind", value)}
                  className="mt-1 size-[18px] accent-[var(--ll-btn-bg)]"
                />
                <span>
                  {label}
                  <span className="block text-body-sm text-fg-muted">{help}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <TextField
          id="goal-name"
          label="Name"
          maxLength={60}
          value={f.values.name}
          onChange={(e) => f.set("name", e.target.value)}
          error={f.errors.name}
        />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <TextField
            id="goal-target"
            label="Target"
            money
            placeholder="0,00"
            value={f.values.target}
            onChange={(e) => f.set("target", e.target.value)}
            error={f.errors.target}
          />
          {fund ? (
            <TextField
              id="goal-due"
              label="Needed in"
              help="The month you'll need the money"
              type="month"
              min={minDue}
              max={maxDue}
              value={f.values.due}
              onChange={(e) => f.set("due", e.target.value)}
              error={f.errors.due}
            />
          ) : null}
          <TextField
            id="goal-monthly"
            label={fund ? "Set aside each month" : "Each month (optional)"}
            money
            placeholder="0,00"
            value={f.values.monthly}
            onChange={(e) => f.set("monthly", e.target.value)}
            error={f.errors.monthly}
          />
          <TextField
            id="goal-starting"
            label="Already saved (optional)"
            money
            placeholder="0,00"
            value={f.values.starting}
            onChange={(e) => f.set("starting", e.target.value)}
            error={f.errors.starting}
          />
        </div>
        <Button type="submit" disabled={f.pending}>
          {f.pending ? "Saving…" : id ? "Save changes" : fund ? "Add sinking fund" : "Add goal"}
        </Button>
        <p role="status" className="m-0 mt-3 min-h-5 text-body-sm text-fg-muted">
          {f.message}
        </p>
      </fieldset>
    </form>
  );
}
