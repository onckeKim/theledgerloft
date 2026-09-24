"use client";

import { Plus, X } from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";
import { saveMoneyStep } from "@/app/(setup)/app/setup/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorSummary } from "@/components/ui/error-summary";
import { TextField } from "@/components/ui/field";
import { Money } from "@/components/ui/money";
import { parseRandToCents } from "@/lib/money";
import { parseMoneyRows, type MoneyRowInput } from "@/lib/setup/schemas";
import { SaveStatusText, StepNav } from "./step-frame";
import { useStepForm } from "./use-step-form";
import { useHydrated } from "@/lib/use-hydrated";

type Step = "income" | "bills" | "spending";

const COPY: Record<
  Step,
  {
    noun: string;
    nameLabel: string;
    amountLabel: string;
    amountHelp?: string;
    add: string;
    totalLabel: string;
    empty: string;
  }
> = {
  income: {
    noun: "income",
    nameLabel: "Name",
    amountLabel: "Amount per month",
    amountHelp: "If it changes month to month, use a typical or lower amount.",
    add: "Add another income",
    totalLabel: "Total monthly income",
    empty: "No income added yet. You can add it later too.",
  },
  bills: {
    noun: "bill",
    nameLabel: "Bill",
    amountLabel: "Planned per month",
    add: "Add a bill",
    totalLabel: "Fixed bills per month",
    empty: "No fixed bills yet. Add rent, electricity, phone, insurance… or skip this step.",
  },
  spending: {
    noun: "spending category",
    nameLabel: "Category",
    amountLabel: "Planned per month",
    add: "Add a category",
    totalLabel: "Everyday spending per month",
    empty: "No categories yet. Add groceries, transport, personal spending… or skip this step.",
  },
};

let counter = 0;
const newKey = () => `r${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function MoneyRowsForm({
  step,
  back,
  initial,
  suggestions = [],
}: {
  step: Step;
  back: string;
  initial: MoneyRowInput[];
  suggestions?: string[];
}) {
  const hydrated = useHydrated();
  const copy = COPY[step];
  const [rows, setRows] = useState<MoneyRowInput[]>(
    initial.length || step !== "income" ? initial : [{ key: newKey(), name: "", amount: "" }],
  );
  const headingId = useId();
  const what = step === "income" ? "income" : step === "bills" ? "bill" : "spending category";

  const save = useCallback(
    (values: MoneyRowInput[], intent: "autosave" | "continue") =>
      saveMoneyStep(step, values, intent),
    [step],
  );
  const validate = useCallback(
    (values: MoneyRowInput[]) => {
      const r = parseMoneyRows(values, what);
      return r.ok ? null : r.errors;
    },
    [what],
  );
  const applyIds = useCallback(
    (ids: Record<string, string>) =>
      setRows((rs) => rs.map((r) => (ids[r.key] && !r.id ? { ...r, id: ids[r.key] } : r))),
    [],
  );
  const withIds = useCallback(
    (values: MoneyRowInput[], ids: Record<string, string>) =>
      values.map((r) => (!r.id && ids[r.key] ? { ...r, id: ids[r.key] } : r)),
    [],
  );
  const form = useStepForm({ values: rows, validate, save, withIds, applyIds });

  const update = (key: string, field: "name" | "amount", value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const add = (name = "") => setRows((rs) => [...rs, { key: newKey(), name, amount: "" }]);
  const remove = (key: string) => {
    setRows((rs) => rs.filter((r) => r.key !== key));
    form.requestAutosave();
  };

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + (parseRandToCents(r.amount) ?? 0), 0),
    [rows],
  );
  const used = new Set(rows.map((r) => r.name.trim().toLowerCase()));
  const open = suggestions.filter((s) => !used.has(s.toLowerCase()));
  const summary = Object.entries(form.errors).map(([k, message]) => ({
    href: `#${k === "form" ? "rows" : k.replace(".", "-")}`,
    message,
  }));

  return (
    <form noValidate onBlur={form.autosave} onSubmit={(e) => (e.preventDefault(), form.submit())}>
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary
          items={summary.filter((s) => s.href !== "#rows")}
          message={form.errors.form}
          focusToken={form.focusToken}
        />

        {open.length ? (
          <div className="mb-6">
            <p id={headingId} className="mb-2 text-body-sm text-fg-muted">
              Common ones to add (only if they apply to you):
            </p>
            <div role="group" aria-labelledby={headingId} className="flex flex-wrap gap-2">
              {open.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => add(s)}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-pill border border-control bg-raised px-3 text-body-sm hover:bg-sunken"
                >
                  <Plus aria-hidden="true" size={14} strokeWidth={1.5} /> {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div id="rows" className="grid gap-4">
          {rows.length === 0 ? <p className="text-fg-muted">{copy.empty}</p> : null}
          {rows.map((r, i) => (
            <Card key={r.key} className="p-5">
              <fieldset className="m-0 border-0 p-0">
                <legend className="sr-only">
                  {copy.noun} {i + 1}
                  {r.name ? `: ${r.name}` : ""}
                </legend>
                <div className="grid gap-x-4 sm:grid-cols-[1fr_200px]">
                  <TextField
                    id={`${r.key}-name`}
                    label={copy.nameLabel}
                    value={r.name}
                    maxLength={step === "income" ? 60 : 40}
                    onChange={(e) => update(r.key, "name", e.target.value)}
                    error={form.errors[`${r.key}.name`]}
                    className="mb-3"
                  />
                  <TextField
                    id={`${r.key}-amount`}
                    label={copy.amountLabel}
                    money
                    value={r.amount}
                    placeholder="0,00"
                    onChange={(e) => update(r.key, "amount", e.target.value)}
                    help={i === 0 ? copy.amountHelp : undefined}
                    error={form.errors[`${r.key}.amount`]}
                    className="mb-3"
                  />
                </div>
                <Button variant="quiet" size="sm" onClick={() => remove(r.key)} className="-ml-2">
                  <X aria-hidden="true" size={16} strokeWidth={1.5} />
                  Remove{r.name ? ` ${r.name}` : ` this ${copy.noun}`}
                </Button>
              </fieldset>
            </Card>
          ))}
        </div>

        <Button variant="secondary" className="mt-4" onClick={() => add()}>
          <Plus aria-hidden="true" size={18} strokeWidth={1.5} />
          {copy.add}
        </Button>

        <Card className="mt-6 bg-sunken shadow-none">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="ll-label">{copy.totalLabel}</span>
            <Money cents={total} className="font-display text-h2 font-semibold" />
          </div>
          <p className="mb-0 mt-2 text-body-sm text-fg-muted">Saved automatically as you go.</p>
        </Card>

        <div className="mt-4">
          <SaveStatusText status={form.status} />
        </div>
        <StepNav back={back} onContinue={form.submit} pending={form.pending} />
      </fieldset>
    </form>
  );
}
