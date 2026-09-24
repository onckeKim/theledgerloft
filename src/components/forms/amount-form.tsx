"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorSummary } from "@/components/ui/error-summary";
import { TextField } from "@/components/ui/field";
import type { AmountInput } from "@/lib/goals/schemas";
import type { PaymentResult } from "@/lib/debts/actions";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormAction } from "./use-form-action";

/**
 * Amount + date (+ optional note) form for goal and debt actions. When the server answers with `confirm`
 * (a payment larger than the balance), it asks before sending again with confirmOver.
 */
export function AmountForm({
  id,
  amountLabel = "Amount",
  submitLabel,
  today,
  withNote,
  action,
}: {
  id: string;
  amountLabel?: string;
  submitLabel: string;
  today: string;
  withNote?: boolean;
  action: (input: AmountInput, confirmOver?: boolean) => Promise<PaymentResult>;
}) {
  const hydrated = useHydrated();
  const f = useFormAction({ amount: "", date: today, note: "" });
  const [confirm, setConfirm] = useState<string | null>(null);

  const send = (confirmOver: boolean) => {
    setConfirm(null);
    f.run(
      () => action(f.values, confirmOver),
      () => f.setValues({ amount: "", date: f.values.date, note: "" }),
      (r) => {
        const c = (r as PaymentResult).confirm;
        if (c) setConfirm(c);
        return Boolean(c);
      },
    );
  };

  return (
    <form noValidate onSubmit={(e) => (e.preventDefault(), send(false))}>
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary items={f.summary(id)} message={f.errors.form} focusToken={f.focusToken} />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <TextField
            id={`${id}-amount`}
            label={amountLabel}
            money
            placeholder="0,00"
            value={f.values.amount}
            onChange={(e) => (f.set("amount", e.target.value), setConfirm(null))}
            error={f.errors.amount}
          />
          <TextField
            id={`${id}-date`}
            label="Date"
            type="date"
            value={f.values.date}
            onChange={(e) => f.set("date", e.target.value)}
            error={f.errors.date}
          />
        </div>
        {withNote ? (
          <TextField
            id={`${id}-note`}
            label="Note (optional)"
            maxLength={200}
            value={f.values.note}
            onChange={(e) => f.set("note", e.target.value)}
            error={f.errors.note}
          />
        ) : null}
        {confirm ? (
          <Alert tone="warning" live className="mb-4">
            <p className="mb-3">{confirm}</p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" size="sm" onClick={() => send(true)} disabled={f.pending}>
                Yes, record it
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setConfirm(null)}>
                Change the amount
              </Button>
            </div>
          </Alert>
        ) : (
          <Button type="submit" disabled={f.pending}>
            {f.pending ? "Saving…" : submitLabel}
          </Button>
        )}
        <p role="status" className="m-0 mt-3 min-h-5 text-body-sm text-fg-muted">
          {f.message}
        </p>
      </fieldset>
    </form>
  );
}
