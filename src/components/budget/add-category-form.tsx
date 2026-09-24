"use client";

import { useState, useTransition } from "react";
import { addCategory } from "@/lib/budget/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useHydrated } from "@/lib/use-hydrated";

export function AddCategoryForm({ budgetId }: { budgetId: string }) {
  const [values, setValues] = useState({ name: "", group: "everyday", planned: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const hydrated = useHydrated();

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addCategory(budgetId, values);
          if (r.status === "ok") {
            setValues({ name: "", group: values.group, planned: "" });
            setErrors({});
            setMessage(`Added ${values.name.trim()}.`);
          } else {
            setErrors(r.errors ?? {});
            setMessage(r.message ?? null);
          }
        });
      }}
    >
      <fieldset
        disabled={!hydrated}
        className="m-0 min-w-0 border-0 p-0 grid gap-x-4 sm:grid-cols-[1fr_180px_160px_auto] sm:items-end"
      >
        <TextField
          id="new-cat-name"
          label="Category"
          value={values.name}
          maxLength={40}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          error={errors.name}
          className="mb-3"
        />
        <div className="mb-3">
          <label htmlFor="new-cat-group" className="mb-1 block font-semibold">
            Group
          </label>
          <select
            id="new-cat-group"
            value={values.group}
            onChange={(e) => setValues({ ...values, group: e.target.value })}
            className="h-12 w-full rounded-md border border-control bg-raised px-3 text-body-lg text-fg"
          >
            <option value="fixed">Fixed bills</option>
            <option value="everyday">Everyday spending</option>
          </select>
        </div>
        <TextField
          id="new-cat-planned"
          label="Planned"
          money
          value={values.planned}
          placeholder="0,00"
          onChange={(e) => setValues({ ...values, planned: e.target.value })}
          error={errors.planned}
          className="mb-3"
        />
        <Button type="submit" variant="secondary" disabled={pending} className="mb-3">
          {pending ? "Adding…" : "Add category"}
        </Button>
        <p role="status" className="m-0 text-body-sm text-fg-muted sm:col-span-4">
          {message}
        </p>
      </fieldset>
    </form>
  );
}
