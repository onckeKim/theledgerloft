import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { CalendarX2 } from "lucide-react";
import { Checklist } from "@/components/budget/checklist";
import { ChecklistSettings } from "@/components/budget/checklist-settings";
import { DebtHelp } from "@/components/debts/debt-help";
import { MonthSwitcher } from "@/components/budget/month-switcher";
import { StatCard } from "@/components/budget/stat-card";
import { Working } from "@/components/budget/working";
import { Alert } from "@/components/ui/alert";
import { EstimateBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { verifySession } from "@/lib/auth/dal";
import { barLabel } from "@/lib/budget/copy";
import { loadMonth } from "@/lib/budget/month";
import { CHECKLIST } from "@/lib/budget/schemas";
import { formatPeriod, todayInJohannesburg } from "@/lib/calc/period";
import { checkinOpensOn } from "@/lib/review/review";
import { formatZAR } from "@/lib/money";
import { setupStatus } from "@/lib/setup/queries";
import { leftToBudgetNote } from "@/lib/budget/copy";

export const metadata: Metadata = { title: "Your month at a glance" };

const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

export default async function Page({ searchParams }: PageProps<"/app">) {
  await verifySession("/app");
  const status = await setupStatus();

  // First visit: go straight to the welcome step. Part-way through: offer to continue (PRD US-16 AC4).
  if (!status.completed && !status.started) redirect("/app/setup" as Route);
  if (!status.completed) {
    return (
      <>
        <PageHeader eyebrow="Home" title="Welcome back" />
        <Card accent className="max-w-[640px]">
          <h2 className="mb-2 text-h3">Finish setting up your planner</h2>
          <p className="text-fg-muted">
            Your answers so far are saved. Pick up where you left off.
          </p>
          <ButtonLink href={"/app/setup" as never}>Continue setup</ButtonLink>
        </Card>
      </>
    );
  }

  const params = await searchParams;
  const m = await loadMonth(params.period);
  const switcher = <MonthSwitcher base="/app" period={m.period} prev={m.prev} next={m.next} />;

  if (!m.plannable || !m.budget) {
    return (
      <>
        <PageHeader
          eyebrow={formatPeriod(m.period)}
          title="Your month at a glance"
          actions={switcher}
        />
        <Card>
          <EmptyState
            icon={CalendarX2}
            title={`Nothing planned for ${formatPeriod(m.period)}`}
            action={<ButtonLink href={"/app" as never}>Go to this month</ButtonLink>}
          >
            You can plan from your first month up to next month.
          </EmptyState>
        </Card>
      </>
    );
  }

  const s = m.summary;
  const spending = m.categories.filter((c) => c.planned > 0 || c.actual !== 0);
  const top = [...spending]
    .sort(
      (a, b) =>
        b.over - a.over ||
        (a.planned ? a.remaining / a.planned : 1) - (b.planned ? b.remaining / b.planned : 1),
    )
    .slice(0, 3);
  const spentPct = s.plannedTotal
    ? Math.min(100, Math.floor((Math.max(s.actualTotal, 0) * 100) / s.plannedTotal))
    : 0;
  const firstOver = m.categories.find((c) => c.status === "over");
  const goals = [...m.goals]
    .sort(
      (a, b) =>
        (a.due ?? "9999-99").localeCompare(b.due ?? "9999-99") ||
        (a.goal?.percent ?? a.fund?.percent ?? 0) - (b.goal?.percent ?? b.fund?.percent ?? 0),
    )
    .slice(0, 3);
  const nextDebt = m.debts.projection.order[0]
    ? m.debts.rows.find((d) => d.id === m.debts.projection.order[0])
    : undefined;
  const nextDebtEstimate = m.debts.projection.debts[0];
  const checkinOpens = checkinOpensOn(m.budget.endsOn);
  const checkinOpen = todayInJohannesburg() >= checkinOpens;
  const checklist = CHECKLIST.map((c) => ({
    key: c.key,
    label:
      c.key === "left" && s.leftToBudget > 0
        ? `Decide what to do with the ${formatZAR(s.leftToBudget)} left to budget`
        : c.label,
    hint: c.key === "checkin" && !checkinOpen ? `opens ${dayMonth(checkinOpens)}` : undefined,
  }));

  return (
    <>
      {params.welcome ? (
        <Alert tone="success" live className="mb-6">
          <p>
            <strong>Your plan is ready.</strong> Your dashboard fills in as you add spending.
          </p>
        </Alert>
      ) : null}
      <PageHeader
        eyebrow={formatPeriod(m.period)}
        title="Your month at a glance"
        actions={switcher}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <StatCard label="Income" cents={s.incomePlanned} sub="Planned for the month" />
        <StatCard
          label="Planned"
          cents={s.plannedTotal}
          sub={`Across ${m.categories.length} ${m.categories.length === 1 ? "category" : "categories"}`}
        />
        <StatCard
          label="Left to budget"
          cents={s.leftToBudget}
          accent
          sub={leftToBudgetNote(m.budgetStyle, s.leftToBudget)}
        >
          <Working
            rows={[
              ["Income", formatZAR(s.incomePlanned)],
              ["Planned", formatZAR(-s.plannedTotal)],
            ]}
            total={["Left to budget", formatZAR(s.leftToBudget)]}
          />
        </StatCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <Eyebrow>Spending</Eyebrow>
              <h2 className="mb-3 mt-1 text-h3">Categories</h2>
            </div>
            <Link href={`/app/budget?period=${m.period}` as never} className="text-body-sm">
              See all {m.categories.length}
            </Link>
          </div>
          {s.actualTotal === 0 ? (
            <div className="py-4">
              <p className="text-fg-muted">
                Your plan is ready. Add your first spending to see it come alive.
              </p>
              <ButtonLink href={"/app/transactions" as never} variant="secondary">
                Add spending
              </ButtonLink>
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-body-sm text-fg-muted">Spent so far</span>
                <span className="tabular-nums">
                  <strong>
                    <Money cents={s.actualTotal} />
                  </strong>{" "}
                  of <Money cents={s.plannedTotal} />
                </span>
              </div>
              <ProgressBar label="Total spent" value={spentPct} max={100} tone="navy" />
              <ul className="m-0 mt-3 list-none p-0">
                {top.map((c) => (
                  <li
                    key={c.categoryId}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 border-b border-border py-3 last:border-b-0"
                  >
                    <span>{c.name}</span>
                    <span className="text-right text-body-sm tabular-nums">
                      {c.status === "over" ? (
                        <span className="font-semibold text-negative">
                          <Money cents={c.over} /> over ·{" "}
                        </span>
                      ) : null}
                      <Money cents={c.actual} /> of <Money cents={c.planned} />
                    </span>
                    <div className="col-span-2">
                      <ProgressBar
                        label={c.name}
                        value={Math.max(c.actual, 0)}
                        max={c.planned}
                        overText={barLabel(c.name, c)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {firstOver ? (
                <p className="mb-0 mt-3 text-body-sm text-fg-muted">
                  {firstOver.name} is {formatZAR(firstOver.over)} over plan this month.{" "}
                  <Link href={`/app/budget?period=${m.period}#move-money` as never}>
                    Move money from another category?
                  </Link>
                </p>
              ) : null}
            </>
          )}
        </Card>

        <Card>
          <Eyebrow>This month</Eyebrow>
          <h2 className="mb-2 mt-1 text-h3">Checklist</h2>
          {checklist.some((c) => !m.checklistHidden.includes(c.key)) ? (
            <Checklist
              budgetId={m.budget.id}
              items={checklist.filter((c) => !m.checklistHidden.includes(c.key))}
              done={m.checklistDone}
            />
          ) : (
            <p className="text-fg-muted">All checklist items are hidden.</p>
          )}
          {checkinOpen ? (
            <p className="mb-0 mt-2">
              <Link href={`/app/review/${m.period}` as never}>
                Open your {formatPeriod(m.period).split(" ")[0]} check-in
              </Link>
            </p>
          ) : null}
          <ChecklistSettings
            items={CHECKLIST.map((c) => ({ key: c.key, label: c.label }))}
            hidden={m.checklistHidden}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <Eyebrow>Saving</Eyebrow>
              <h2 className="mb-3 mt-1 text-h3">Goals and sinking funds</h2>
            </div>
            <Link href={"/app/goals" as never} className="text-body-sm">
              View
            </Link>
          </div>
          {goals.length === 0 ? (
            <p className="text-fg-muted">
              No goals yet. Add something you&apos;re saving towards, big or small.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {goals.map((g) => (
                <li
                  key={g.id}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 border-b border-border py-3 last:border-b-0"
                >
                  <span>
                    {g.name}
                    {g.due ? (
                      <span className="text-body-sm text-fg-muted">
                        {" "}
                        · {formatPeriod(g.due, "short")}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right text-body-sm tabular-nums">
                    <Money cents={g.saved} /> of <Money cents={g.target} />
                  </span>
                  <div className="col-span-2">
                    <ProgressBar label={g.name} value={Math.max(g.saved, 0)} max={g.target} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <Eyebrow>Debts</Eyebrow>
              <h2 className="mb-3 mt-1 text-h3">Debt snapshot</h2>
            </div>
            <Link href={"/app/debts" as never} className="text-body-sm">
              View
            </Link>
          </div>
          {m.debts.rows.length === 0 ? (
            <p className="text-fg-muted">
              No debts added. If you have any, adding them helps you see the whole picture.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-body-sm text-fg-muted">Total owed</span>
                  <div className="font-display text-h2 font-semibold tabular-nums">
                    <Money cents={m.debts.totalOwed} />
                  </div>
                </div>
                <div>
                  <span className="text-body-sm text-fg-muted">Paid this month</span>
                  <div className="font-display text-h2 font-semibold tabular-nums">
                    <Money cents={m.debts.paidThisMonth} />
                  </div>
                </div>
              </div>
              {nextDebt ? (
                <>
                  <p className="mb-1 mt-4">
                    Next in your {m.debts.method} order: <strong>{nextDebt.name}</strong>,{" "}
                    <Money cents={nextDebt.balance} /> left.
                  </p>
                  <p className="m-0 text-body-sm text-fg-muted">
                    <EstimateBadge />{" "}
                    {nextDebtEstimate?.period
                      ? `Paid off around ${formatPeriod(nextDebtEstimate.period, "short")} at your current payments.`
                      : "At this payment the balance isn't going down, so we can't estimate a payoff date."}
                  </p>
                </>
              ) : null}
            </>
          )}
        </Card>
      </div>

      {m.debts.totalMinimums > s.incomePlanned && m.debts.rows.length ? (
        <div className="mt-4">
          <DebtHelp minimumsOverIncome />
        </div>
      ) : null}
    </>
  );
}
