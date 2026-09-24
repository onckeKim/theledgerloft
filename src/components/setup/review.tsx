import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { formatPeriod } from "@/lib/calc/period";
import { formatZAR } from "@/lib/money";
import { setupPlan } from "@/lib/setup/plan";
import type { SetupLoad } from "@/lib/setup/queries";
import { FinishButton } from "./finish-button";

export function Review({ data }: { data: SetupLoad }) {
  const plan = setupPlan({
    income: data.income,
    bills: data.bills,
    spending: data.spending,
    debts: data.debts,
    goals: data.goals,
  });
  const style = data.household.budget_style;
  const rows = [plan.income, ...plan.planned];

  return (
    <>
      <Card accent className="mb-6">
        <span className="ll-label">Left to budget in {formatPeriod(data.currentPeriod)}</span>
        <div className="my-2 font-display text-num-lg font-semibold tabular-nums">
          <Money cents={plan.leftToBudget} />
        </div>
        <details>
          <summary className="cursor-pointer text-body-sm text-fg-muted underline underline-offset-4">
            How this was calculated
          </summary>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-md bg-sunken px-4 py-3 tabular-nums">
            <dt className="text-fg-muted">Income</dt>
            <dd className="m-0 text-right">{formatZAR(plan.income.cents)}</dd>
            <dt className="text-fg-muted">Planned spending, debts and saving</dt>
            <dd className="m-0 text-right">{formatZAR(-plan.plannedTotal)}</dd>
            <dt className="border-t border-border-strong pt-1 font-semibold">Left to budget</dt>
            <dd className="m-0 border-t border-border-strong pt-1 text-right font-semibold">
              {formatZAR(plan.leftToBudget)}
            </dd>
          </dl>
        </details>
        <p className="mb-0 mt-3 text-body-sm text-fg-muted">
          {plan.overPlanned > 0
            ? null
            : style === "zero_based"
              ? "With a zero-based budget, you'll give this a job on your budget page."
              : "With a flexible budget it's fine to leave this unassigned. You can give it a job later."}
        </p>
      </Card>

      {plan.overPlanned > 0 ? (
        <Alert tone="warning" className="mb-6">
          <p>
            You&apos;ve planned {formatZAR(plan.overPlanned)} more than your income. Adjust a
            category to balance, now or later. You can still finish setup.
          </p>
        </Alert>
      ) : null}
      {plan.income.count === 0 ? (
        <Alert tone="info" className="mb-6">
          <p>No income added yet. You can add it now or later from your budget.</p>
        </Alert>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse tabular-nums">
          <caption className="sr-only">Your first month, by section</caption>
          <thead>
            <tr className="border-b-2 border-border-strong">
              <th scope="col" className="ll-label px-3 py-2 text-left">
                Section
              </th>
              <th scope="col" className="ll-label px-3 py-2 text-right">
                Per month
              </th>
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border">
                <th scope="row" className="px-3 py-3 text-left font-normal">
                  {r.label} <span className="text-fg-muted">({r.count})</span>
                </th>
                <td className="whitespace-nowrap px-3 py-3 text-right">{formatZAR(r.cents)}</td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/app/setup/${r.step}` as never}
                    aria-label={`Edit ${r.label.toLowerCase()}`}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border-strong font-semibold">
              <th scope="row" className="px-3 py-3 text-left">
                Total planned
              </th>
              <td className="whitespace-nowrap px-3 py-3 text-right">
                {formatZAR(plan.plannedTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-6 text-body-sm text-fg-muted">
        Nothing is final: you can change anything from your dashboard. The Ledger Loft is a planning
        tool and doesn&apos;t give financial advice.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <Link
          href={"/app/setup/debts-goals" as never}
          className={buttonClasses({ variant: "secondary" })}
        >
          Back
        </Link>
        <FinishButton />
      </div>
    </>
  );
}
