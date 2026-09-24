"use client";

import { useState } from "react";
import { saveBasics } from "@/app/(setup)/app/setup/actions";
import { ErrorSummary } from "@/components/ui/error-summary";
import { parseBasics, type BasicsInput } from "@/lib/setup/schemas";
import { SaveStatusText, StepNav } from "./step-frame";
import { useStepForm } from "./use-step-form";
import { useHydrated } from "@/lib/use-hydrated";

const FREQUENCIES = [
  { value: "monthly", label: "Monthly", hint: "For example, on the 25th" },
  { value: "every_two_weeks", label: "Every two weeks" },
  { value: "weekly", label: "Weekly" },
  { value: "varies", label: "It varies", hint: "Freelance, commission or seasonal" },
];
const STYLES = [
  {
    value: "flexible",
    label: "Flexible",
    hint: "Plan the main categories and leave the rest unassigned. A gentle place to start.",
  },
  {
    value: "zero_based",
    label: "Zero-based",
    hint: "Give every rand a job until “left to budget” reaches R 0,00.",
  },
];
const ordinal = (n: number) =>
  `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

function Choices({
  name,
  legend,
  help,
  options,
  value,
  onChange,
  error,
}: {
  name: keyof BasicsInput;
  legend: string;
  help?: string;
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="mb-6" id={name} aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-2 font-semibold">{legend}</legend>
      {help ? <p className="mb-2 text-body-sm text-fg-muted">{help}</p> : null}
      {error ? (
        <p id={`${name}-error`} className="mb-2 text-body-sm text-negative">
          {error}
        </p>
      ) : null}
      <div className="grid gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-control bg-raised px-4 py-3 has-[:checked]:border-2 has-[:checked]:border-fg has-[:checked]:px-[15px] has-[:checked]:py-[11px]"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-1 size-[18px] shrink-0 accent-[var(--ll-btn-bg)]"
            />
            <span>
              <strong className="block">{o.label}</strong>
              {o.hint ? <span className="text-body-sm text-fg-muted">{o.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function BasicsForm({ initial }: { initial: BasicsInput }) {
  const hydrated = useHydrated();
  const [values, setValues] = useState<BasicsInput>(initial);
  const set = (k: keyof BasicsInput) => (v: string) => setValues((s) => ({ ...s, [k]: v }));
  const form = useStepForm({
    values,
    validate: (v) => {
      const r = parseBasics(v);
      return r.ok ? null : r.errors;
    },
    save: saveBasics,
  });
  const summary = Object.entries(form.errors).map(([k, message]) => ({ href: `#${k}`, message }));

  return (
    <form noValidate onBlur={form.autosave} onSubmit={(e) => (e.preventDefault(), form.submit())}>
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary items={summary} focusToken={form.focusToken} />
        <div className="mb-6">
          <span className="mb-1 block font-semibold">Currency</span>
          <p className="m-0 text-fg-muted">South African rand (R 1 234,56)</p>
        </div>
        <Choices
          name="payFrequency"
          legend="How often are you paid?"
          help="Pick your main income. You'll add other income in the next step."
          options={FREQUENCIES}
          value={values.payFrequency}
          onChange={set("payFrequency")}
          error={form.errors.payFrequency}
        />
        <div className="mb-6">
          <label htmlFor="monthStartDay" className="mb-1 block font-semibold">
            Your budget month starts on
          </label>
          <p id="monthStartDay-help" className="mb-2 text-body-sm text-fg-muted">
            Many people start on payday. Days 1 to 28 work in every month.
          </p>
          <select
            id="monthStartDay"
            value={values.monthStartDay}
            onChange={(e) => set("monthStartDay")(e.target.value)}
            aria-describedby="monthStartDay-help"
            className="h-12 w-full rounded-md border border-control bg-raised px-3 text-body-lg text-fg"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={String(d)}>
                {d === 1 ? "1st of the month" : `${ordinal(d)} of the month`}
              </option>
            ))}
          </select>
        </div>
        <Choices
          name="budgetStyle"
          legend="How would you like to budget?"
          options={STYLES}
          value={values.budgetStyle}
          onChange={set("budgetStyle")}
          error={form.errors.budgetStyle}
        />
        <SaveStatusText status={form.status} />
        <StepNav back="/app/setup/welcome" onContinue={form.submit} pending={form.pending} />
      </fieldset>
    </form>
  );
}
