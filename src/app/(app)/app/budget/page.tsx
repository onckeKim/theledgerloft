import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { AddCategoryForm } from "@/components/budget/add-category-form";
import { MonthSwitcher } from "@/components/budget/month-switcher";
import { MoveMoneyForm } from "@/components/budget/move-money-form";
import { PlannedCell } from "@/components/budget/planned-cell";
import { RemoveCategoryButton } from "@/components/budget/remove-category-button";
import { RenameCategory } from "@/components/budget/rename-category";
import { StatCard } from "@/components/budget/stat-card";
import { Working } from "@/components/budget/working";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireAccess } from "@/lib/auth/dal";
import { barLabel, leftToBudgetNote, remainingText } from "@/lib/budget/copy";
import { GROUP_LABELS, loadMonth, type CategoryGroup } from "@/lib/budget/month";
import { formatPeriod } from "@/lib/calc/period";
import { formatZAR } from "@/lib/money";

export const metadata: Metadata = { title: "Budget" };

const GROUP_ORDER: CategoryGroup[] = ["fixed", "everyday", "debts", "saving"];
// Stacked rows on phones: each cell shows its column name (docs/l3/screens.md §3).
const cell =
  "px-3 py-3 max-sm:flex max-sm:justify-between max-sm:gap-3 max-sm:px-0 max-sm:py-1 max-sm:before:text-fg-muted max-sm:before:content-[attr(data-label)]";

export default async function Page({ searchParams }: PageProps<"/app/budget">) {
  await requireAccess("/app/budget");
  const params = await searchParams;
  const m = await loadMonth(params.period);
  const switcher = (
    <MonthSwitcher base="/app/budget" period={m.period} prev={m.prev} next={m.next} />
  );
  const title = `${formatPeriod(m.period)} plan`;

  if (!m.plannable || !m.budget) {
    return (
      <>
        <PageHeader eyebrow="Monthly budget" title={title} actions={switcher} />
        <Card>
          <EmptyState
            icon={CalendarX2}
            title={`Nothing planned for ${formatPeriod(m.period)}`}
            action={<ButtonLink href={"/app/budget" as never}>Go to this month</ButtonLink>}
          >
            You can plan from your first month up to next month.
          </EmptyState>
        </Card>
      </>
    );
  }

  const s = m.summary;
  const example =
    m.categories.find((c) => c.status === "over") ??
    m.categories.find((c) => c.actual > 0) ??
    m.categories[0];
  const budgetId = m.budget.id;

  return (
    <>
      <PageHeader
        eyebrow="Monthly budget"
        title={title}
        actions={
          <>
            <ButtonLink href={"/app/transactions" as never} variant="secondary" size="sm">
              + Add spending
            </ButtonLink>
            {switcher}
          </>
        }
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <StatCard label="Income" cents={s.incomePlanned} size="md" />
        <StatCard label="Planned" cents={s.plannedTotal} size="md" />
        <StatCard label="Left to budget" cents={s.leftToBudget} size="md" accent />
      </div>

      <Alert tone={s.leftToBudget < 0 ? "warning" : "info"} className="mb-5">
        <p>
          <strong>
            {m.budgetStyle === "zero_based" ? "Zero-based budget." : "Flexible budget."}
          </strong>{" "}
          {leftToBudgetNote(m.budgetStyle, s.leftToBudget)}{" "}
          {m.budgetStyle === "flexible" && s.leftToBudget > 0
            ? "Prefer every rand to have a job? Switch to zero-based in Settings."
            : null}
        </p>
      </Alert>

      <p
        role="status"
        className="m-0 empty:hidden mb-5 rounded-md border border-border bg-raised px-4 py-3"
      >
        {params.removed === "deleted"
          ? "Category removed."
          : params.removed === "archived"
            ? "Category archived. It stays in past months and won't be copied into new ones."
            : null}
      </p>

      <Card className="mb-5">
        <h2 className="mb-3 text-h3">Categories</h2>
        {m.categories.length === 0 ? (
          <p className="text-fg-muted">Nothing planned for this month yet. Add a category below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse tabular-nums max-sm:block">
              <caption className="sr-only">
                Planned and actual by category for {formatPeriod(m.period)}
              </caption>
              <thead className="max-sm:sr-only">
                <tr className="border-b-2 border-border-strong">
                  <th scope="col" className="ll-label px-3 py-2 text-left">
                    Category
                  </th>
                  <th scope="col" className="ll-label px-3 py-2 text-right">
                    Planned
                  </th>
                  <th scope="col" className="ll-label px-3 py-2 text-right">
                    Actual
                  </th>
                  <th scope="col" className="ll-label px-3 py-2 text-right">
                    Remaining
                  </th>
                </tr>
              </thead>
              {GROUP_ORDER.map((g) => {
                const rows = m.categories.filter((c) => c.group === g);
                if (!rows.length) return null;
                return (
                  <tbody key={g} className="max-sm:block">
                    <tr className="max-sm:block">
                      <th
                        colSpan={4}
                        scope="colgroup"
                        className="ll-label px-3 pb-2 pt-5 text-left max-sm:block max-sm:px-0"
                      >
                        {GROUP_LABELS[g]}
                      </th>
                    </tr>
                    {rows.map((c) => (
                      <tr
                        key={c.categoryId}
                        className="border-b border-border max-sm:block max-sm:py-3"
                      >
                        <th
                          scope="row"
                          className="px-3 py-3 text-left font-normal max-sm:block max-sm:px-0"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="font-semibold sm:font-normal">{c.name}</span>
                            {c.archived ? <Badge tone="neutral">Archived</Badge> : null}
                            {!c.system && !c.archived ? (
                              <>
                                <RenameCategory
                                  categoryId={c.categoryId}
                                  name={c.name}
                                  group={c.group}
                                />
                                <RemoveCategoryButton
                                  categoryId={c.categoryId}
                                  name={c.name}
                                  period={m.period}
                                />
                              </>
                            ) : null}
                            {c.system ? (
                              <Link
                                href={
                                  (c.system === "debt_payments"
                                    ? "/app/debts"
                                    : "/app/goals") as never
                                }
                                className="p-1 text-body-sm"
                              >
                                {c.system === "debt_payments" ? "Debts" : "Goals"}
                                <span className="sr-only"> page for {c.name}</span>
                              </Link>
                            ) : null}
                          </div>
                          <div className="mt-2 max-w-[320px]">
                            <ProgressBar
                              label={c.name}
                              value={Math.max(c.actual, 0)}
                              max={c.planned}
                              overText={barLabel(c.name, c)}
                            />
                          </div>
                        </th>
                        <td data-label="Planned" className={`${cell} text-right`}>
                          <PlannedCell
                            budgetId={budgetId}
                            categoryId={c.categoryId}
                            name={c.name}
                            cents={c.planned}
                          />
                        </td>
                        <td data-label="Actual" className={`${cell} text-right`}>
                          <Money cents={c.actual} />
                        </td>
                        <td
                          data-label="Remaining"
                          className={`${cell} whitespace-nowrap text-right ${c.status === "over" || c.status === "unplanned" ? "font-semibold text-negative" : ""}`}
                        >
                          {remainingText(c)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                );
              })}
              <tfoot className="max-sm:block">
                <tr className="border-t-2 border-border-strong font-semibold max-sm:block max-sm:pt-3">
                  <th scope="row" className="px-3 py-3 text-left max-sm:block max-sm:px-0">
                    Total
                  </th>
                  <td data-label="Planned" className={`${cell} text-right`}>
                    <Money cents={s.plannedTotal} />
                  </td>
                  <td data-label="Actual" className={`${cell} text-right`}>
                    <Money cents={s.actualTotal} />
                  </td>
                  <td data-label="Remaining" className={`${cell} whitespace-nowrap text-right`}>
                    {s.planRemaining < 0
                      ? `${formatZAR(-s.planRemaining)} over`
                      : `${formatZAR(s.planRemaining)} left`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {example ? (
          <Working
            summary="How “Remaining” is calculated"
            rows={[
              [`${example.name} planned`, formatZAR(example.planned)],
              [`${example.name} actual (spending minus refunds)`, formatZAR(-example.actual)],
            ]}
            total={[
              "Remaining",
              `${formatZAR(example.remaining)}${example.remaining < 0 ? " (over)" : ""}`,
            ]}
            note="Planned amounts save when you leave the box or press Enter."
          />
        ) : null}
        {s.unbudgeted.length ? (
          <p className="mb-0 mt-3 text-body-sm text-fg-muted">
            Also spent in categories not in this month&apos;s plan:{" "}
            <Money cents={s.unbudgeted.reduce((a, u) => a + u.actual, 0)} /> (included in the
            totals).
          </p>
        ) : null}
      </Card>

      {m.categories.length > 1 ? (
        <Card className="mb-5" id="move-money">
          <h2 className="mb-1 text-h3">Move money</h2>
          <p className="text-body-sm text-fg-muted">
            Move part of one category&apos;s plan to another. Your total planned stays the same.
          </p>
          <MoveMoneyForm
            budgetId={budgetId}
            categories={m.categories
              .filter((c) => !c.archived)
              .map((c) => ({ id: c.categoryId, name: c.name, planned: c.planned }))}
            defaultTo={m.categories.find((c) => c.status === "over")?.categoryId}
          />
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-1 text-h3">Add a category</h2>
        <p className="text-body-sm text-fg-muted">
          Debt payments, sinking funds and savings goals are managed from their own pages.
        </p>
        <AddCategoryForm budgetId={budgetId} />
      </Card>
    </>
  );
}
