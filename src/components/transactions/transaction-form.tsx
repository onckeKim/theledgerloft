"use client";

import { useRef, useState, useTransition } from "react";
import { saveTransaction } from "@/lib/budget/actions";
import type { TransactionInput } from "@/lib/budget/schemas";
import { Button } from "@/components/ui/button";
import { ErrorSummary } from "@/components/ui/error-summary";
import { TextField } from "@/components/ui/field";
import { useHydrated } from "@/lib/use-hydrated";
import { formatPeriod, periodFor } from "@/lib/calc/period";

type Category = { id: string; name: string; group: string };
const KINDS = [
  { value: "outflow", label: "Spending" },
  { value: "income", label: "Income" },
  { value: "refund", label: "Refund" },
] as const;
const GROUPS: Record<string, string> = {
  fixed: "Fixed bills",
  everyday: "Everyday spending",
  debts: "Debts",
  saving: "Saving",
};

/**
 * Add or edit a transaction (PRD US-26, US-27). Amount and category come first so a phone entry needs three inputs.
 * Server-validated; the page's period and totals refresh after saving.
 */
export function TransactionForm({
  categories,
  initial,
  id = null,
  monthStartDay,
  today,
  afterSave,
}: {
  categories: Category[];
  initial?: TransactionInput;
  id?: string | null;
  monthStartDay: number;
  today: string;
  afterSave?: string;
}) {
  const hydrated = useHydrated();
  const blank: TransactionInput = {
    kind: "outflow",
    amount: "",
    description: "",
    categoryId: "",
    date: today,
  };
  const [values, setValues] = useState<TransactionInput>(initial ?? blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusToken, setFocusToken] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof TransactionInput, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const originalPeriod = initial ? safePeriod(initial.date, monthStartDay) : null;
  const newPeriod = safePeriod(values.date, monthStartDay);

  const submit = () => {
    setMessage(null); // a "Saved." from the last save must not stand for this one
    start(async () => {
      // After an edit the server redirects back to the list, so the list is rendered fresh.
      const r = await saveTransaction(id, values, afterSave);
      if (r.status === "ok") {
        setErrors({});
        const moved =
          newPeriod && newPeriod !== safePeriod(today, monthStartDay)
            ? ` It's in ${formatPeriod(newPeriod)}.`
            : "";
        setMessage(`Saved.${moved}`);
        setValues({
          ...blank,
          kind: values.kind,
          categoryId: values.categoryId,
          date: values.date,
        });
        amountRef.current?.focus();
      } else {
        setMessage(null);
        setErrors(r.errors ?? { form: r.message ?? "Couldn't save" });
        setFocusToken((t) => t + 1);
      }
    });
  };

  const summary = Object.entries(errors)
    .filter(([k]) => k !== "form")
    .map(([k, m]) => ({ href: `#tx-${k}`, message: m }));

  return (
    <form noValidate onSubmit={(e) => (e.preventDefault(), submit())}>
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary items={summary} message={errors.form} focusToken={focusToken} />
        <fieldset className="mb-5 border-0 p-0" id="tx-kind">
          <legend className="mb-1 font-semibold">Type</legend>
          <div className="inline-flex overflow-hidden rounded-md border border-control">
            {KINDS.map((k, i) => (
              <label
                key={k.value}
                className={`cursor-pointer px-4 py-2 text-body-sm font-semibold has-[:checked]:bg-fg has-[:checked]:text-bg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${i ? "border-l border-control" : ""}`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k.value}
                  checked={values.kind === k.value}
                  onChange={() => set("kind", k.value)}
                  className="sr-only"
                />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>
        <TextField
          ref={amountRef}
          id="tx-amount"
          label="Amount"
          money
          value={values.amount}
          placeholder="0,00"
          onChange={(e) => set("amount", e.target.value)}
          error={errors.amount}
        />
        {values.kind !== "income" ? (
          <div className="mb-5">
            <label htmlFor="tx-categoryId" className="mb-1 block font-semibold">
              Category
            </label>
            <select
              id="tx-categoryId"
              value={values.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              aria-invalid={errors.categoryId ? true : undefined}
              aria-describedby={errors.categoryId ? "tx-categoryId-error" : undefined}
              className={`h-12 w-full rounded-md border bg-raised px-3 text-body-lg text-fg ${errors.categoryId ? "border-2 border-negative" : "border-control"}`}
            >
              <option value="">Choose a category</option>
              {Object.entries(GROUPS).map(([g, label]) => {
                const inGroup = categories.filter((c) => c.group === g);
                return inGroup.length ? (
                  <optgroup key={g} label={label}>
                    {inGroup.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
            {errors.categoryId ? (
              <p id="tx-categoryId-error" className="m-0 mt-1 text-body-sm text-negative">
                {errors.categoryId}
              </p>
            ) : null}
          </div>
        ) : null}
        <TextField
          id="tx-description"
          label="Description (optional)"
          value={values.description}
          maxLength={80}
          placeholder="e.g. Weekly groceries"
          onChange={(e) => set("description", e.target.value)}
          error={errors.description}
        />
        <TextField
          id="tx-date"
          label="Date"
          type="date"
          value={values.date}
          onChange={(e) => set("date", e.target.value)}
          error={errors.date}
        />
        {id && originalPeriod && newPeriod && originalPeriod !== newPeriod ? (
          <p className="-mt-3 mb-5 text-body-sm text-fg-muted">
            This moves it to {formatPeriod(newPeriod)}.
          </p>
        ) : null}
        <Button type="submit" block disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Save transaction"}
        </Button>
        <p role="status" className="m-0 mt-3 min-h-5 text-body-sm text-fg-muted">
          {message}
        </p>
      </fieldset>
    </form>
  );
}

function safePeriod(date: string, startDay: number): string | null {
  try {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? periodFor(date, startDay).label : null;
  } catch {
    return null;
  }
}
