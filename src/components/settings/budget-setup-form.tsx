"use client";

import { Choices, FREQUENCIES, STYLES, ordinal } from "@/components/setup/basics-form";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { ErrorSummary } from "@/components/ui/error-summary";
import { saveBudgetSetup } from "@/lib/settings/actions";
import type { BasicsInput } from "@/lib/setup/schemas";
import { useHydrated } from "@/lib/use-hydrated";

/** Change budget setup (PRD US-41). A new start day applies from next month; the confirmation gives the dates. */
export function BudgetSetupForm({ initial }: { initial: BasicsInput }) {
  const hydrated = useHydrated();
  const f = useFormAction(initial);
  const changingDay = f.values.monthStartDay !== initial.monthStartDay;
  const summary = Object.entries(f.errors)
    .filter(([k]) => k !== "form")
    .map(([k, message]) => ({ href: `#${k}`, message }));
  return (
    <form noValidate onSubmit={(e) => (e.preventDefault(), f.run(() => saveBudgetSetup(f.values)))}>
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary items={summary} message={f.errors.form} focusToken={f.focusToken} />
        <Choices
          name="payFrequency"
          legend="How often are you paid?"
          options={FREQUENCIES}
          value={f.values.payFrequency}
          onChange={(v) => f.set("payFrequency", v)}
          error={f.errors.payFrequency}
        />
        <div className="mb-6">
          <label htmlFor="monthStartDay" className="mb-1 block font-semibold">
            Your budget month starts on
          </label>
          <p id="monthStartDay-help" className="mb-2 text-body-sm text-fg-muted">
            A change starts from next month. This month keeps its dates, so nothing you&apos;ve
            recorded moves.
          </p>
          <select
            id="monthStartDay"
            value={f.values.monthStartDay}
            onChange={(e) => f.set("monthStartDay", e.target.value)}
            aria-describedby="monthStartDay-help"
            className="h-12 w-full max-w-[320px] rounded-md border border-control bg-raised px-3 text-body-lg text-fg"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={String(d)}>
                {`${ordinal(d)} of the month`}
              </option>
            ))}
          </select>
          {changingDay ? (
            <p className="mb-0 mt-2 text-body-sm">
              Next month will be a one-off longer or shorter month so the dates line up. You&apos;ll
              see the exact dates when you save.
            </p>
          ) : null}
        </div>
        <Choices
          name="budgetStyle"
          legend="How would you like to budget?"
          help="Switching style never changes your amounts."
          options={STYLES}
          value={f.values.budgetStyle}
          onChange={(v) => f.set("budgetStyle", v)}
          error={f.errors.budgetStyle}
        />
        <Button type="submit" disabled={f.pending}>
          {f.pending ? "Saving…" : "Save changes"}
        </Button>
        <p role="status" className="m-0 mt-3 min-h-5 text-body-sm text-fg-muted">
          {f.message}
        </p>
      </fieldset>
    </form>
  );
}
