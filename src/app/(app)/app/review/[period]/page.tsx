import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CalendarX2 } from "lucide-react";
import { MonthSwitcher } from "@/components/budget/month-switcher";
import { StatCard } from "@/components/budget/stat-card";
import { Working } from "@/components/budget/working";
import { DownloadButton } from "@/components/export/download-button";
import { CheckinForm } from "@/components/review/checkin-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { requireAccess } from "@/lib/auth/dal";
import { formatPeriod } from "@/lib/calc/period";
import { createReviewPdf } from "@/lib/export/actions";
import { loadReview } from "@/lib/review/queries";
import { leftOverNote } from "@/lib/review/review";
import { formatZAR } from "@/lib/money";

export async function generateMetadata({
  params,
}: PageProps<"/app/review/[period]">): Promise<Metadata> {
  const { period } = await params;
  return {
    title: /^\d{4}-(0[1-9]|1[0-2])$/.test(period) ? `Review: ${formatPeriod(period)}` : "Review",
  };
}

const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

export default async function Page({ params }: PageProps<"/app/review/[period]">) {
  const { period } = await params;
  await requireAccess(`/app/review/${period}`);
  const r = await loadReview(period);
  if (!r) notFound();
  const month = formatPeriod(period);
  const shortMonth = month.split(" ")[0];
  const header = (
    <PageHeader
      eyebrow="Monthly review"
      title={month}
      actions={
        <MonthSwitcher base="/app/review" period={period} prev={r.prev} next={r.next} pathStyle />
      }
    />
  );

  if (!r.open)
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={CalendarClock}
            title={`Your ${shortMonth} review opens on ${dayMonth(r.opensOn)}`}
            action={<ButtonLink href={"/app" as never}>Back to dashboard</ButtonLink>}
          >
            Check in near the end of the month to see how it went and plan the next one.
          </EmptyState>
        </Card>
      </>
    );
  if (r.review.empty)
    return (
      <>
        {header}
        <Card>
          <EmptyState icon={CalendarX2} title="Nothing was recorded for this month">
            There&apos;s no plan or transactions for {month}.
          </EmptyState>
        </Card>
      </>
    );

  const rv = r.review;
  const note = leftOverNote(rv.leftOver);
  return (
    <>
      {header}
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <StatCard label="Income" cents={rv.income.actual} size="md" sub="Recorded this month" />
        <StatCard
          label="Spent & set aside"
          cents={rv.spent}
          size="md"
          sub="Including goals and debt payments"
        />
        <StatCard label="Left over" cents={rv.leftOver} size="md" accent sub={note ?? undefined}>
          <Working
            rows={[
              ["Income recorded", formatZAR(rv.income.actual)],
              ["Spent & set aside", formatZAR(-rv.spent)],
            ]}
            total={["Left over", formatZAR(rv.leftOver)]}
          />
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <Card>
            <Eyebrow>{shortMonth}</Eyebrow>
            <h2 className="mb-3 mt-1 text-h3">Plan vs actual</h2>
            <div
              className="-mx-6 overflow-x-auto px-6"
              role="region"
              aria-label="Plan vs actual table"
              tabIndex={0}
            >
              <table className="w-full border-collapse text-left tabular-nums">
                <caption className="sr-only">
                  Planned and actual amounts for {month}, with the difference in words
                </caption>
                <thead>
                  <tr className="border-b border-border-strong text-body-sm text-fg-muted">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Category
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Planned
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Actual
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-semibold">
                      Difference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <th scope="row" className="py-3 pr-3 text-left font-normal">
                      Income
                    </th>
                    <td className="px-3 py-3 text-right">
                      <Money cents={rv.income.planned} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Money cents={rv.income.actual} />
                    </td>
                    <td className="py-3 pl-3 text-right">{rv.income.difference}</td>
                  </tr>
                  {rv.rows.map((c) => (
                    <tr key={c.name} className="border-b border-border">
                      <th scope="row" className="py-3 pr-3 text-left font-normal">
                        {c.name}
                      </th>
                      <td className="px-3 py-3 text-right">
                        <Money cents={c.planned} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Money cents={c.actual} />
                      </td>
                      <td className={`py-3 pl-3 text-right ${c.over ? "font-semibold" : ""}`}>
                        {c.difference}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-strong font-semibold">
                    <th scope="row" className="py-3 pr-3 text-left">
                      Total spending
                    </th>
                    <td className="px-3 py-3 text-right">
                      <Money cents={rv.total.planned} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Money cents={rv.total.actual} />
                    </td>
                    <td className="py-3 pl-3 text-right">{rv.total.difference}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {!r.hasBudget ? (
              <p className="mb-0 mt-3 text-body-sm text-fg-muted">
                There was no plan for this month, so everything shows as not planned.
              </p>
            ) : null}
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                [`Saved in ${shortMonth}`, rv.saved, "Nothing added to goals or funds."],
                ["Debt payments", rv.debtPayments, "No debt payments recorded."],
              ] as const
            ).map(([title, items, empty]) => (
              <Card key={title}>
                <h2 className="mb-3 text-h3">{title}</h2>
                {items.length ? (
                  <ul className="m-0 list-none p-0">
                    {items.map((i) => (
                      <li
                        key={i.name}
                        className="flex justify-between gap-4 border-b border-border py-2 tabular-nums last:border-b-0"
                      >
                        <span>{i.name}</span>
                        <Money cents={i.cents} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-fg-muted">{empty}</p>
                )}
              </Card>
            ))}
          </div>
          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <Eyebrow>Your reflection</Eyebrow>
                <h2 className="mb-2 mt-1 text-h3">Looking back</h2>
              </div>
              {r.checkin.completedAt ? <Badge tone="success">Checked in</Badge> : null}
            </div>
            <p className="mb-4 text-body-sm text-fg-muted">
              Optional. Your reflections are private to your household and go into the PDF only if
              you choose.
            </p>
            <CheckinForm
              period={period}
              completed={Boolean(r.checkin.completedAt)}
              initial={{
                wentWell: r.checkin.wentWell,
                surprised: r.checkin.surprised,
                nextActions: r.checkin.nextActions,
              }}
            />
          </Card>
        </div>

        <Card className="lg:sticky lg:top-6">
          <Eyebrow>Export</Eyebrow>
          <h2 className="mb-2 mt-1 text-h3">Monthly summary PDF</h2>
          <p className="text-body-sm text-fg-muted">
            An A4 page in your planner style with this month&apos;s numbers. Only your
            household&apos;s data is used, and each download is recorded in your account activity.
          </p>
          <DownloadButton
            label="Download PDF"
            failure="We couldn't create your PDF. Your data is safe. Try again."
            create={createReviewPdf.bind(null, period)}
            reflectionsOption
          />
          <p className="mb-0 mt-2 text-body-sm">
            <Link href={`/app/budget?period=${period}` as never}>See the {shortMonth} plan</Link>
          </p>
        </Card>
      </div>
    </>
  );
}
