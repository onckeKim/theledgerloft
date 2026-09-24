"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { renameCategory } from "@/lib/budget/actions";
import { useHydrated } from "@/lib/use-hydrated";

/** Rename a category or move it between fixed bills and everyday spending (PRD US-23). */
export function RenameCategory({
  categoryId,
  name,
  group,
}: {
  categoryId: string;
  name: string;
  group: string;
}) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ name, group });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = `rename-${categoryId}`;

  if (!open)
    return (
      <button
        type="button"
        disabled={!hydrated}
        onClick={() => (setValues({ name, group }), setError(null), setOpen(true))}
        className="cursor-pointer border-0 bg-transparent p-1 text-body-sm text-fg-muted underline underline-offset-4"
      >
        Rename<span className="sr-only"> {name}</span>
      </button>
    );
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await renameCategory(categoryId, values);
          if (r.status === "ok") setOpen(false);
          else setError(r.errors?.name ?? r.errors?.group ?? r.message ?? "Couldn't save that");
        });
      }}
      className="mt-2 flex w-full flex-wrap items-end gap-2"
    >
      <div>
        <label htmlFor={`${id}-name`} className="mb-1 block text-body-sm font-semibold">
          New name for {name}
        </label>
        <input
          id={`${id}-name`}
          value={values.name}
          maxLength={40}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className={`h-10 w-[200px] rounded-md border bg-raised px-2 text-fg ${error ? "border-2 border-negative" : "border-control"}`}
        />
      </div>
      <div>
        <label htmlFor={`${id}-group`} className="mb-1 block text-body-sm font-semibold">
          Group
        </label>
        <select
          id={`${id}-group`}
          value={values.group}
          onChange={(e) => setValues({ ...values, group: e.target.value })}
          className="h-10 rounded-md border border-control bg-raised px-2 text-fg"
        >
          <option value="fixed">Fixed bills</option>
          <option value="everyday">Everyday spending</option>
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Save
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error ? (
        <p id={`${id}-error`} role="alert" className="m-0 w-full text-body-sm text-negative">
          {error}
        </p>
      ) : null}
    </form>
  );
}
