"use client";

import { useState, useTransition } from "react";
import { setPlanned } from "@/lib/budget/actions";
import { parsePlannedCents } from "@/lib/budget/schemas";
import { centsToInput } from "@/lib/money";
import { useHydrated } from "@/lib/use-hydrated";

/** Inline planned amount (PRD US-21 AC2): saves on blur or Enter; Escape restores. */
export function PlannedCell({
  budgetId,
  categoryId,
  name,
  cents,
}: {
  budgetId: string;
  categoryId: string;
  name: string;
  cents: number;
}) {
  const initial = centsToInput(cents);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const hydrated = useHydrated();
  // The last amount known to be saved. When the server's amount changes (after "Move money", for
  // example) the box follows it, unless someone is part-way through typing a different amount.
  const [last, setLast] = useState(initial);
  if (initial !== last) {
    setLast(initial);
    if (value.trim() === last) setValue(initial);
  }
  const id = `planned-${categoryId}`;

  const save = () => {
    if (value.trim() === last) return;
    start(async () => {
      const r = await setPlanned(budgetId, categoryId, value);
      if (r.status === "ok") {
        const c = parsePlannedCents(value);
        const formatted = c === null ? value.trim() : centsToInput(c);
        setValue(formatted);
        setLast(formatted);
        setError(null);
        setSaved(true);
      } else {
        setSaved(false);
        setError(r.errors?.planned ?? r.message ?? "Couldn't save");
      }
    });
  };

  return (
    <div className="ml-auto w-full max-w-[160px]">
      <label htmlFor={id} className="sr-only">
        Planned for {name}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
        >
          R
        </span>
        <input
          id={id}
          inputMode="decimal"
          disabled={!hydrated}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : `${id}-status`}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") setValue(last);
          }}
          className={`h-10 w-full rounded-md border bg-raised pl-7 pr-2 text-right tabular-nums text-fg ${error ? "border-2 border-negative" : "border-control"}`}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="m-0 mt-1 text-body-sm text-negative">
          {error}
        </p>
      ) : (
        <p id={`${id}-status`} role="status" className="sr-only">
          {pending ? "Saving" : saved ? "Saved" : ""}
        </p>
      )}
    </div>
  );
}
