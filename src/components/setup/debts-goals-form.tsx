"use client";

import { Plus, X } from "lucide-react";
import { useCallback, useState } from "react";
import { saveDebtsGoals } from "@/app/(setup)/app/setup/actions";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { ErrorSummary } from "@/components/ui/error-summary";
import { TextField } from "@/components/ui/field";
import { addMonths } from "@/lib/calc/period";
import { parseDebtsGoals, type DebtRowInput, type GoalRowInput } from "@/lib/setup/schemas";
import { SaveStatusText, StepNav } from "./step-frame";
import { useStepForm } from "./use-step-form";
import { useHydrated } from "@/lib/use-hydrated";

let counter = 0;
const newKey = (p: string) => `${p}${Date.now().toString(36)}-${(counter++).toString(36)}`;

type Values = { debts: DebtRowInput[]; goals: GoalRowInput[] };

export function DebtsGoalsForm({
  initial,
  currentPeriod,
}: {
  initial: Values;
  currentPeriod: string;
}) {
  const hydrated = useHydrated();
  const [values, setValues] = useState<Values>(initial);

  const validate = useCallback(
    (v: Values) => {
      const r = parseDebtsGoals(v.debts, v.goals, currentPeriod);
      return r.ok ? null : r.errors;
    },
    [currentPeriod],
  );
  const save = useCallback(
    (v: Values, intent: "autosave" | "continue") => saveDebtsGoals(v.debts, v.goals, intent),
    [],
  );
  const applyIds = useCallback(
    (ids: Record<string, string>) =>
      setValues((v) => ({
        debts: v.debts.map((d) => (ids[d.key] && !d.id ? { ...d, id: ids[d.key] } : d)),
        goals: v.goals.map((g) => (ids[g.key] && !g.id ? { ...g, id: ids[g.key] } : g)),
      })),
    [],
  );
  const withIds = useCallback(
    (v: Values, ids: Record<string, string>) => ({
      debts: v.debts.map((d) => (!d.id && ids[d.key] ? { ...d, id: ids[d.key] } : d)),
      goals: v.goals.map((g) => (!g.id && ids[g.key] ? { ...g, id: ids[g.key] } : g)),
    }),
    [],
  );
  const form = useStepForm({ values, validate, save, withIds, applyIds });

  const setDebt = (key: string, field: keyof DebtRowInput, value: string) =>
    setValues((v) => ({
      ...v,
      debts: v.debts.map((d) => (d.key === key ? { ...d, [field]: value } : d)),
    }));
  const setGoal = (key: string, field: keyof GoalRowInput, value: string) =>
    setValues((v) => ({
      ...v,
      goals: v.goals.map((g) => (g.key === key ? { ...g, [field]: value } : g)),
    }));
  const removeDebt = (key: string) => {
    setValues((v) => ({ ...v, debts: v.debts.filter((d) => d.key !== key) }));
    form.requestAutosave();
  };
  const removeGoal = (key: string) => {
    setValues((v) => ({ ...v, goals: v.goals.filter((g) => g.key !== key) }));
    form.requestAutosave();
  };
  const addDebt = () =>
    setValues((v) => ({
      ...v,
      debts: [...v.debts, { key: newKey("d"), name: "", balance: "", minPayment: "", rate: "" }],
    }));
  const addGoal = (kind: GoalRowInput["kind"]) =>
    setValues((v) => ({
      ...v,
      goals: [
        ...v.goals,
        { key: newKey("g"), kind, name: "", target: "", monthly: "", starting: "", due: "" },
      ],
    }));

  const summary = Object.entries(form.errors)
    .filter(([k]) => k !== "form")
    .map(([k, message]) => ({ href: `#${k.replace(".", "-")}`, message }));
  const minMonth = addMonths(currentPeriod, 1);
  const maxMonth = addMonths(currentPeriod, 120);

  return (
    <form noValidate onBlur={form.autosave} onSubmit={(e) => (e.preventDefault(), form.submit())}>
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary items={summary} message={form.errors.form} focusToken={form.focusToken} />

        <section aria-labelledby="debts-h" className="mb-10">
          <h2 id="debts-h" className="text-h2">
            Debts
          </h2>
          <p className="text-fg-muted">
            Store cards, credit cards, loans, vehicle finance. Use the balance from your latest
            statement.
          </p>
          <div className="grid gap-4">
            {values.debts.map((d, i) => (
              <Card key={d.key} className="p-5">
                <fieldset className="m-0 border-0 p-0">
                  <legend className="sr-only">
                    Debt {i + 1}
                    {d.name ? `: ${d.name}` : ""}
                  </legend>
                  <TextField
                    id={`${d.key}-name`}
                    label="Name"
                    value={d.name}
                    maxLength={60}
                    placeholder="e.g. Store card"
                    onChange={(e) => setDebt(d.key, "name", e.target.value)}
                    error={form.errors[`${d.key}.name`]}
                    className="mb-3"
                  />
                  <div className="grid gap-x-4 sm:grid-cols-3">
                    <TextField
                      id={`${d.key}-balance`}
                      label="Balance owed"
                      money
                      value={d.balance}
                      placeholder="0,00"
                      onChange={(e) => setDebt(d.key, "balance", e.target.value)}
                      error={form.errors[`${d.key}.balance`]}
                      className="mb-3"
                    />
                    <TextField
                      id={`${d.key}-minPayment`}
                      label="Minimum a month"
                      money
                      value={d.minPayment}
                      placeholder="0,00"
                      onChange={(e) => setDebt(d.key, "minPayment", e.target.value)}
                      error={form.errors[`${d.key}.minPayment`]}
                      className="mb-3"
                    />
                    <TextField
                      id={`${d.key}-rate`}
                      label="Yearly interest % (optional)"
                      inputMode="decimal"
                      value={d.rate}
                      placeholder="e.g. 21,5"
                      onChange={(e) => setDebt(d.key, "rate", e.target.value)}
                      error={form.errors[`${d.key}.rate`]}
                      className="mb-3"
                    />
                  </div>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => removeDebt(d.key)}
                    className="-ml-2"
                  >
                    <X aria-hidden="true" size={16} strokeWidth={1.5} />
                    Remove{d.name ? ` ${d.name}` : " this debt"}
                  </Button>
                </fieldset>
              </Card>
            ))}
          </div>
          <Button variant="secondary" className="mt-4" onClick={addDebt}>
            <Plus aria-hidden="true" size={18} strokeWidth={1.5} /> Add a debt
          </Button>
          <p className="mt-3 text-body-sm text-fg-muted">
            Leave the rate blank if you don&apos;t know it. Estimates will then leave interest out,
            and say so.
          </p>
        </section>

        <section aria-labelledby="goals-h">
          <h2 id="goals-h" className="text-h2">
            Goals and sinking funds
          </h2>
          <p className="text-fg-muted">
            A <strong>goal</strong> is something you&apos;re saving towards. A{" "}
            <strong>sinking fund</strong> is money set aside for a cost you know is coming, like
            school fees or December.
          </p>
          <div className="grid gap-4">
            {values.goals.map((g, i) => (
              <Card key={g.key} className="p-5">
                <fieldset className="m-0 border-0 p-0">
                  <legend className="sr-only">
                    {g.kind === "goal" ? "Goal" : "Sinking fund"} {i + 1}
                    {g.name ? `: ${g.name}` : ""}
                  </legend>
                  <Eyebrow className="mb-3">
                    {g.kind === "goal" ? "Savings goal" : "Sinking fund"}
                  </Eyebrow>
                  <TextField
                    id={`${g.key}-name`}
                    label="Name"
                    value={g.name}
                    maxLength={60}
                    placeholder={g.kind === "goal" ? "e.g. Emergency fund" : "e.g. School fees"}
                    onChange={(e) => setGoal(g.key, "name", e.target.value)}
                    error={form.errors[`${g.key}.name`]}
                    className="mb-3"
                  />
                  <div className="grid gap-x-4 sm:grid-cols-3">
                    <TextField
                      id={`${g.key}-target`}
                      label="Target"
                      money
                      value={g.target}
                      placeholder="0,00"
                      onChange={(e) => setGoal(g.key, "target", e.target.value)}
                      error={form.errors[`${g.key}.target`]}
                      className="mb-3"
                    />
                    <TextField
                      id={`${g.key}-starting`}
                      label="Saved so far (optional)"
                      money
                      value={g.starting}
                      placeholder="0,00"
                      onChange={(e) => setGoal(g.key, "starting", e.target.value)}
                      error={form.errors[`${g.key}.starting`]}
                      className="mb-3"
                    />
                    <TextField
                      id={`${g.key}-monthly`}
                      label="Per month (optional)"
                      money
                      value={g.monthly}
                      placeholder="0,00"
                      onChange={(e) => setGoal(g.key, "monthly", e.target.value)}
                      error={form.errors[`${g.key}.monthly`]}
                      className="mb-3"
                    />
                  </div>
                  {g.kind === "sinking_fund" ? (
                    <TextField
                      id={`${g.key}-due`}
                      label="Needed by (month)"
                      type="month"
                      min={minMonth}
                      max={maxMonth}
                      value={g.due}
                      onChange={(e) => setGoal(g.key, "due", e.target.value)}
                      error={form.errors[`${g.key}.due`]}
                      className="mb-3 max-w-64"
                    />
                  ) : null}
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => removeGoal(g.key)}
                    className="-ml-2"
                  >
                    <X aria-hidden="true" size={16} strokeWidth={1.5} />
                    Remove{g.name ? ` ${g.name}` : g.kind === "goal" ? " this goal" : " this fund"}
                  </Button>
                </fieldset>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => addGoal("goal")}>
              <Plus aria-hidden="true" size={18} strokeWidth={1.5} /> Add a goal
            </Button>
            <Button variant="secondary" onClick={() => addGoal("sinking_fund")}>
              <Plus aria-hidden="true" size={18} strokeWidth={1.5} /> Add a sinking fund
            </Button>
          </div>
        </section>

        <div className="mt-6">
          <SaveStatusText status={form.status} />
        </div>
        <StepNav
          back="/app/setup/spending"
          onContinue={form.submit}
          pending={form.pending}
          skipHref="/app/setup/review"
        />
      </fieldset>
    </form>
  );
}
