"use client";

import { Button } from "@/components/ui/button";
import { ErrorSummary } from "@/components/ui/error-summary";
import { TextField } from "@/components/ui/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { saveDebt } from "@/lib/debts/actions";
import type { DebtInput } from "@/lib/goals/schemas";
import { useHydrated } from "@/lib/use-hydrated";

/** Add or edit a debt (PRD US-34). Editing leaves the balance alone: that changes through payments or a statement. */
export function DebtForm({ id = null, initial }: { id?: string | null; initial: DebtInput }) {
  const hydrated = useHydrated();
  const f = useFormAction(initial);
  return (
    <form noValidate onSubmit={(e) => (e.preventDefault(), f.run(() => saveDebt(id, f.values)))}>
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary items={f.summary("debt")} message={f.errors.form} focusToken={f.focusToken} />
        <TextField
          id="debt-name"
          label="Name"
          maxLength={60}
          value={f.values.name}
          onChange={(e) => f.set("name", e.target.value)}
          error={f.errors.name}
        />
        <div className="grid gap-x-4 sm:grid-cols-2">
          {id ? null : (
            <TextField
              id="debt-balance"
              label="Current balance"
              money
              placeholder="0,00"
              value={f.values.balance}
              onChange={(e) => f.set("balance", e.target.value)}
              error={f.errors.balance}
            />
          )}
          <TextField
            id="debt-minPayment"
            label="Minimum payment each month"
            money
            placeholder="0,00"
            value={f.values.minPayment}
            onChange={(e) => f.set("minPayment", e.target.value)}
            error={f.errors.minPayment}
          />
          <TextField
            id="debt-rate"
            label="Yearly interest rate (optional)"
            help="From your statement, like 21,5. Leave blank if you don't know it."
            inputMode="decimal"
            value={f.values.rate}
            onChange={(e) => f.set("rate", e.target.value)}
            error={f.errors.rate}
          />
        </div>
        <TextField
          id="debt-note"
          label="Note (optional)"
          maxLength={200}
          value={f.values.note}
          onChange={(e) => f.set("note", e.target.value)}
          error={f.errors.note}
        />
        <Button type="submit" disabled={f.pending}>
          {f.pending ? "Saving…" : id ? "Save changes" : "Add debt"}
        </Button>
        <p role="status" className="m-0 mt-3 min-h-5 text-body-sm text-fg-muted">
          {f.message}
        </p>
      </fieldset>
    </form>
  );
}
