"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ErrorSummary } from "@/components/ui/error-summary";
import { saveCheckin } from "@/lib/review/actions";
import { MAX_ACTION, MAX_ACTIONS, MAX_REFLECTION, type CheckinInput } from "@/lib/review/schemas";
import { useHydrated } from "@/lib/use-hydrated";

/** Monthly check-in (PRD US-38 AC3, AC4). Every prompt is optional; saving marks the month's check-in complete. */
export function CheckinForm({
  period,
  initial,
  completed,
}: {
  period: string;
  initial: CheckinInput;
  completed: boolean;
}) {
  const hydrated = useHydrated();
  const [values, setValues] = useState({
    ...initial,
    nextActions: initial.nextActions.length ? initial.nextActions : [""],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [pending, start] = useTransition();

  const setAction = (i: number, v: string) =>
    setValues((s) => ({ ...s, nextActions: s.nextActions.map((a, j) => (j === i ? v : a)) }));
  const summary = Object.entries(errors).map(([k, m]) => ({
    href: k.startsWith("action-") ? `#${k}` : k === "nextActions" ? "#action-0" : `#checkin-${k}`,
    message: m,
  }));
  const area = (key: "wentWell" | "surprised", label: string) => (
    <div className="mb-5">
      <label htmlFor={`checkin-${key}`} className="mb-1 block font-semibold">
        {label}
      </label>
      <textarea
        id={`checkin-${key}`}
        rows={3}
        maxLength={MAX_REFLECTION}
        value={values[key]}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={`checkin-${key}-count${errors[key] ? ` checkin-${key}-error` : ""}`}
        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
        className={`w-full rounded-md border bg-raised px-3 py-2 text-body-lg text-fg ${errors[key] ? "border-2 border-negative" : "border-control"}`}
      />
      <p id={`checkin-${key}-count`} className="m-0 mt-1 text-body-sm text-fg-muted">
        {values[key].length} of {MAX_REFLECTION} characters
      </p>
      {errors[key] ? (
        <p id={`checkin-${key}-error`} className="m-0 mt-1 text-body-sm text-negative">
          {errors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        start(async () => {
          const r = await saveCheckin(period, values);
          if (r.status === "ok") {
            setErrors({});
            setMessage(r.message ?? "Saved.");
          } else {
            setErrors(r.errors ?? { form: r.message ?? "Couldn't save" });
            setFocusToken((t) => t + 1);
          }
        });
      }}
    >
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary
          items={summary.filter((s) => s.href !== "#checkin-form")}
          message={errors.form}
          focusToken={focusToken}
        />
        {area("wentWell", "What went well this month?")}
        {area("surprised", "What surprised you?")}
        <fieldset className="m-0 mb-5 border-0 p-0">
          <legend className="mb-1 font-semibold">Next month, I&apos;d like to…</legend>
          <p className="mb-2 text-body-sm text-fg-muted">Up to {MAX_ACTIONS} short actions.</p>
          {values.nextActions.map((a, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <label htmlFor={`action-${i}`} className="sr-only">
                Action {i + 1}
              </label>
              <input
                id={`action-${i}`}
                value={a}
                maxLength={MAX_ACTION}
                aria-invalid={errors[`action-${i}`] ? true : undefined}
                onChange={(e) => setAction(i, e.target.value)}
                className={`h-11 min-w-0 flex-1 rounded-md border bg-raised px-3 text-fg ${errors[`action-${i}`] ? "border-2 border-negative" : "border-control"}`}
              />
              {values.nextActions.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setValues((s) => ({
                      ...s,
                      nextActions: s.nextActions.filter((_, j) => j !== i),
                    }))
                  }
                  className="cursor-pointer border-0 bg-transparent p-2 text-body-sm underline underline-offset-4"
                >
                  Remove<span className="sr-only"> action {i + 1}</span>
                </button>
              ) : null}
            </div>
          ))}
          {values.nextActions.length < MAX_ACTIONS ? (
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => setValues((s) => ({ ...s, nextActions: [...s.nextActions, ""] }))}
            >
              + Add an action
            </Button>
          ) : null}
        </fieldset>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : completed ? "Save changes" : "Save check-in"}
        </Button>
        <p role="status" className="m-0 mt-3 min-h-5 text-body-sm text-fg-muted">
          {message}
        </p>
      </fieldset>
    </form>
  );
}
