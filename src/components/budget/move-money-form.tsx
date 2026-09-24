"use client";

import { useState, useTransition } from "react";
import { moveMoney } from "@/lib/budget/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useHydrated } from "@/lib/use-hydrated";
import { formatZAR } from "@/lib/money";

/** Move part of one category's plan to another (PRD US-24). Suggests nothing about which category to cut. */
export function MoveMoneyForm({
  budgetId,
  categories,
  defaultTo,
}: {
  budgetId: string;
  categories: { id: string; name: string; planned: number }[];
  defaultTo?: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(defaultTo ?? "");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const hydrated = useHydrated();
  const select = "h-12 w-full rounded-md border bg-raised px-3 text-body-lg text-fg";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await moveMoney(budgetId, from, to, amount);
          if (r.status === "ok") {
            setErrors({});
            setAmount("");
            setMessage("Moved. Your total planned stays the same.");
          } else {
            setErrors(r.errors ?? {});
            setMessage(r.message ?? null);
          }
        });
      }}
    >
      <fieldset
        disabled={!hydrated}
        className="m-0 min-w-0 border-0 p-0 grid gap-x-4 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end"
      >
        {(["from", "to"] as const).map((field) => (
          <div key={field} className="mb-3">
            <label htmlFor={`move-${field}`} className="mb-1 block font-semibold">
              {field === "from" ? "Move from" : "Move to"}
            </label>
            <select
              id={`move-${field}`}
              value={field === "from" ? from : to}
              onChange={(e) => (field === "from" ? setFrom : setTo)(e.target.value)}
              aria-invalid={errors[field] ? true : undefined}
              aria-describedby={errors[field] ? `move-${field}-error` : undefined}
              className={`${select} ${errors[field] ? "border-2 border-negative" : "border-control"}`}
            >
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({formatZAR(c.planned)} planned)
                </option>
              ))}
            </select>
            {errors[field] ? (
              <p id={`move-${field}-error`} className="m-0 mt-1 text-body-sm text-negative">
                {errors[field]}
              </p>
            ) : null}
          </div>
        ))}
        <TextField
          id="move-amount"
          label="Amount"
          money
          value={amount}
          placeholder="0,00"
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          className="mb-3"
        />
        <Button type="submit" variant="secondary" disabled={pending} className="mb-3">
          {pending ? "Moving…" : "Move money"}
        </Button>
        <p role="status" className="m-0 text-body-sm text-fg-muted sm:col-span-4">
          {message}
        </p>
      </fieldset>
    </form>
  );
}
