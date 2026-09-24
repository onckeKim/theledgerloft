import type { Metadata } from "next";
import Link from "next/link";
import { Crosshair } from "lucide-react";
import { Working } from "@/components/budget/working";
import { GoalPlanButton } from "@/components/goals/goal-plan-button";
import { Badge, EstimateBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { verifySession } from "@/lib/auth/dal";
import { addMonths, formatPeriod } from "@/lib/calc/period";
import { goalStatus } from "@/lib/goals/copy";
import type { GoalWithProgress } from "@/lib/goals/progress";
import { loadGoals } from "@/lib/goals/queries";
import { formatZAR } from "@/lib/money";

export const metadata: Metadata = { title: "Goals and sinking funds" };

function GoalCard({ g }: { g: GoalWithProgress }) {
  const s = goalStatus(g);
  const left = g.fund ? g.fund.contributionsLeft : null;
  return (
    <li className="border-b border-border py-5 first:pt-2 last:border-b-0">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="m-0 font-sans text-body-lg font-semibold">
          <Link href={`/app/goals/${g.id}` as never} className="no-underline hover:underline">
            {g.name}
          </Link>{" "}
          {s.badge ? (
            <Badge tone={s.badge === "On track" ? "info" : "success"}>{s.badge}</Badge>
          ) : null}
        </h3>
        <span className="tabular-nums">
          <strong>
            <Money cents={g.saved} />
          </strong>{" "}
          of <Money cents={g.target} />
        </span>
      </div>
      <ProgressBar label={g.name} value={Math.max(g.saved, 0)} max={g.target} />
      <p className="mb-0 mt-2 text-body-sm text-fg-muted">
        {g.due ? `Due ${formatPeriod(g.due, "short")} · ` : null}
        {g.monthly ? `${formatZAR(g.monthly)} a month` : "No monthly amount yet"}
        {left !== null && g.fund?.status !== "funded" && left > 0
          ? ` · ${left} ${left === 1 ? "month" : "months"} left to set aside`
          : null}
      </p>
      <p className="mb-0 mt-1">
        {s.estimate ? (
          <>
            <EstimateBadge />{" "}
          </>
        ) : null}
        {s.text}
      </p>
      <p className="mb-0 mt-2 flex flex-wrap gap-x-4 text-body-sm">
        <Link href={`/app/goals/${g.id}#add-money` as never}>
          Add money<span className="sr-only"> to {g.name}</span>
        </Link>
        <Link href={`/app/goals/${g.id}` as never}>
          Details<span className="sr-only"> for {g.name}</span>
        </Link>
      </p>
    </li>
  );
}

function PlanNote({
  kind,
  label,
  plan,
}: {
  kind: "goal" | "sinking_fund";
  label: string;
  plan: { monthlyTotal: number; planned: number | null };
}) {
  if (plan.planned === plan.monthlyTotal) return null;
  return (
    <div className="mt-2 rounded-md bg-sunken px-4 py-3 text-body-sm">
      <p className="m-0">
        These add up to {formatZAR(plan.monthlyTotal)} a month.{" "}
        {plan.planned === null
          ? `This month's plan doesn't have a ${label} line yet.`
          : `This month's plan for ${label} is ${formatZAR(plan.planned)}.`}
      </p>
      <GoalPlanButton
        kind={kind}
        label={`Use ${formatZAR(plan.monthlyTotal)} in this month's plan`}
      />
    </div>
  );
}

export default async function Page({ searchParams }: PageProps<"/app/goals">) {
  await verifySession("/app/goals");
  const params = await searchParams;
  const { goals, funds, plan, period } = await loadGoals();
  const example =
    funds.find((f) => f.fund?.status === "short") ??
    funds.find((f) => f.fund?.status === "on-track");

  return (
    <>
      <PageHeader
        eyebrow="Saving"
        title="Goals and sinking funds"
        actions={<ButtonLink href={"/app/goals/new" as never}>+ New goal or fund</ButtonLink>}
      />
      <Notice
        value={params.notice}
        messages={{
          archived: "Archived. Its history stays in your budget.",
          deleted: "Deleted.",
        }}
      />
      {goals.length + funds.length === 0 ? (
        <Card>
          <EmptyState
            icon={Crosshair}
            title="No goals yet"
            action={<ButtonLink href={"/app/goals/new" as never}>Add a goal</ButtonLink>}
          >
            No goals yet. Add something you&apos;re saving towards, big or small.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <Eyebrow>Savings goals</Eyebrow>
            <h2 className="mb-1 mt-1 text-h3">Things you&apos;re saving towards</h2>
            <p className="text-body-sm text-fg-muted">With or without a deadline.</p>
            {goals.length ? (
              <>
                <ul className="m-0 list-none p-0">
                  {goals.map((g) => (
                    <GoalCard key={g.id} g={g} />
                  ))}
                </ul>
                <PlanNote kind="goal" label="Savings goals" plan={plan.goal} />
              </>
            ) : (
              <p className="text-fg-muted">
                None yet. <Link href={"/app/goals/new?kind=goal" as never}>Add a savings goal</Link>
              </p>
            )}
          </Card>
          <Card>
            <Eyebrow>Sinking funds</Eyebrow>
            <h2 className="mb-1 mt-1 text-h3">Costs you know are coming</h2>
            <p className="text-body-sm text-fg-muted">
              Money set aside each month until it&apos;s due.
            </p>
            {funds.length ? (
              <>
                <ul className="m-0 list-none p-0">
                  {funds.map((g) => (
                    <GoalCard key={g.id} g={g} />
                  ))}
                </ul>
                <PlanNote kind="sinking_fund" label="Sinking funds" plan={plan.sinking_fund} />
                {example?.fund && example.due ? (
                  <Working
                    summary="How “short” and “on track” are worked out"
                    rows={[
                      [`${example.name} saved`, formatZAR(example.saved)],
                      [
                        `${formatZAR(example.monthly)} × ${example.fund.contributionsLeft} ${example.fund.contributionsLeft === 1 ? "month" : "months"}${
                          example.fund.contributionsLeft
                            ? ` (${formatPeriod(addMonths(period, 1), "short")}–${formatPeriod(addMonths(example.due, -1), "short")})`
                            : ""
                        }`,
                        formatZAR(example.monthly * example.fund.contributionsLeft),
                      ],
                      [
                        `Expected by ${formatPeriod(example.due)}`,
                        formatZAR(example.fund.projected),
                      ],
                      ["Target", formatZAR(example.target)],
                    ]}
                    total={
                      example.fund.shortBy
                        ? ["Short by", formatZAR(example.fund.shortBy)]
                        : ["Short by", formatZAR(0)]
                    }
                    note="Months counted are the ones after this month and before the due month. This is arithmetic on your own numbers, not a recommendation."
                  />
                ) : null}
              </>
            ) : (
              <p className="text-fg-muted">
                None yet.{" "}
                <Link href={"/app/goals/new?kind=sinking_fund" as never}>Add a sinking fund</Link>
              </p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
