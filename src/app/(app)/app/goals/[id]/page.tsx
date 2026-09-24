import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AmountForm } from "@/components/forms/amount-form";
import { RemoveWithHistory } from "@/components/forms/remove-with-history";
import { GoalForm } from "@/components/goals/goal-form";
import { Badge, EstimateBadge } from "@/components/ui/badge";
import { Card, Eyebrow } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { verifySession } from "@/lib/auth/dal";
import { addMonths, todayInJohannesburg } from "@/lib/calc/period";
import { moveGoalMoney, removeGoal } from "@/lib/goals/actions";
import { goalStatus } from "@/lib/goals/copy";
import { getGoal } from "@/lib/goals/queries";
import { centsToInput, formatZAR } from "@/lib/money";

export const metadata: Metadata = { title: "Goal" };

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));

export default async function Page({ params, searchParams }: PageProps<"/app/goals/[id]">) {
  const { id } = await params;
  await verifySession(`/app/goals/${id}`);
  const data = await getGoal(id);
  if (!data) notFound();
  const { goal: g, history, period } = data;
  const { notice } = await searchParams;
  const s = goalStatus(g);
  const fund = g.kind === "sinking_fund";
  const what = fund ? "fund" : "goal";
  const today = todayInJohannesburg();

  return (
    <>
      <PageHeader eyebrow={fund ? "Sinking fund" : "Savings goal"} title={g.name} />
      <Notice value={notice} messages={{ created: `Added. You can add money to it below.` }} />

      <Card accent className="mb-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-display text-h2 font-semibold tabular-nums">
            <Money cents={g.saved} /> <span className="font-sans text-body text-fg-muted">of</span>{" "}
            <Money cents={g.target} />
          </span>
          {s.badge ? (
            <Badge tone={s.badge === "On track" ? "info" : "success"}>{s.badge}</Badge>
          ) : null}
        </div>
        <ProgressBar label={`${g.name} progress`} value={Math.max(g.saved, 0)} max={g.target} />
        <p className="mb-0 mt-3">
          {s.estimate ? (
            <>
              <EstimateBadge />{" "}
            </>
          ) : null}
          {s.text}
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="add-money">
          <Eyebrow>Add money</Eyebrow>
          <h2 className="mb-2 mt-1 text-h3">Add money</h2>
          <p className="mb-4 text-body-sm text-fg-muted">
            Also recorded as spending in {fund ? "Sinking funds" : "Savings goals"}, so your budget
            stays in step.
          </p>
          <AmountForm
            id="add"
            submitLabel="Add money"
            today={today}
            action={moveGoalMoney.bind(null, g.id, "in")}
          />
        </Card>
        <Card>
          <Eyebrow>Take money out</Eyebrow>
          <h2 className="mb-2 mt-1 text-h3">Take money out</h2>
          <p className="mb-4 text-body-sm text-fg-muted">
            Recorded as a refund in the same category. You can take out up to{" "}
            {formatZAR(Math.max(g.saved, 0))}.
          </p>
          <AmountForm
            id="out"
            submitLabel="Take money out"
            today={today}
            action={moveGoalMoney.bind(null, g.id, "out")}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <Eyebrow>History</Eyebrow>
          <h2 className="mb-3 mt-1 text-h3">Money in and out</h2>
          {history.length ? (
            <ul className="m-0 list-none p-0">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex justify-between gap-4 border-b border-border py-2 last:border-b-0"
                >
                  <span>
                    {h.direction === "in" ? "Added" : "Taken out"}
                    <span className="block text-body-sm text-fg-muted">{longDate(h.date)}</span>
                  </span>
                  <span className="tabular-nums">
                    {h.direction === "in" ? "+" : "−"}
                    <Money cents={h.cents} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">Nothing added yet.</p>
          )}
          {g.starting ? (
            <p className="mb-0 mt-3 text-body-sm text-fg-muted">
              Includes {formatZAR(g.starting)} you&apos;d already saved when you added it.
            </p>
          ) : null}
        </Card>
        <Card>
          <Eyebrow>Edit</Eyebrow>
          <h2 className="mb-3 mt-1 text-h3">Change the details</h2>
          <GoalForm
            id={g.id}
            kindLocked
            initial={{
              kind: g.kind,
              name: g.name,
              target: centsToInput(g.target),
              monthly: g.monthly ? centsToInput(g.monthly) : "",
              starting: g.starting ? centsToInput(g.starting) : "",
              due: g.due ?? "",
            }}
            minDue={addMonths(period, 1)}
            maxDue={addMonths(period, 120)}
          />
          <div className="mt-6 border-t border-border pt-5">
            <RemoveWithHistory
              name={g.name}
              what={what}
              historyCount={history.length}
              action={removeGoal.bind(null, g.id)}
            />
          </div>
        </Card>
      </div>
      <p className="mt-4">
        <Link href={"/app/goals" as never}>Back to goals</Link>
      </p>
    </>
  );
}
