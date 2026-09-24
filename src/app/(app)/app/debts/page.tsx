import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { StatCard } from "@/components/budget/stat-card";
import { Working } from "@/components/budget/working";
import { DebtHelp } from "@/components/debts/debt-help";
import { Badge, EstimateBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";
import { formatPeriod } from "@/lib/calc/period";
import { setDebtMethod } from "@/lib/debts/actions";
import { loadDebts } from "@/lib/debts/queries";
import { centsToInput, formatRate, formatZAR, parseRandToCents } from "@/lib/money";

export const metadata: Metadata = { title: "Debts" };

const METHOD_TEXT = {
  snowball:
    "Snowball orders debts from the smallest balance. When one is paid off, its payment moves to the next. You choose the method; both are shown as estimates.",
  avalanche:
    "Avalanche orders debts from the highest interest rate. When one is paid off, its payment moves to the next. You choose the method; both are shown as estimates.",
} as const;
const NOT_COVERING =
  "At this payment the balance isn't going down, so we can't estimate a payoff date.";
const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));

export default async function Page({ searchParams }: PageProps<"/app/debts">) {
  await verifySession("/app/debts");
  const params = await searchParams;
  const rawExtra = typeof params.extra === "string" ? params.extra.trim() : "";
  const extra = rawExtra ? parseRandToCents(rawExtra) : 0;
  const d = await loadDebts(extra ?? 0);
  const p = d.projection;
  const byId = new Map(d.open.map((x) => [x.id, x]));
  const header = (
    <PageHeader
      eyebrow="Debts"
      title="Your debts"
      actions={<ButtonLink href={"/app/debts/new" as never}>+ Add a debt</ButtonLink>}
    />
  );
  const notice = (
    <Notice
      value={params.notice}
      messages={{
        archived: "Archived. Its payments stay in your budget.",
        deleted: "Deleted.",
      }}
    />
  );

  if (d.open.length + d.paidOff.length === 0)
    return (
      <>
        {header}
        {notice}
        <Card className="mb-4">
          <EmptyState
            icon={CreditCard}
            title="No debts added"
            action={<ButtonLink href={"/app/debts/new" as never}>Add a debt</ButtonLink>}
          >
            No debts added. If you have any, adding them helps you see the whole picture.
          </EmptyState>
        </Card>
        <DebtHelp />
      </>
    );

  return (
    <>
      {header}
      {notice}
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total owed"
          cents={d.totalOwed}
          size="md"
          sub={`Across ${d.open.length} ${d.open.length === 1 ? "debt" : "debts"}`}
        />
        <StatCard
          label="Monthly payments"
          cents={p.monthlyBudget}
          size="md"
          sub={
            d.extra
              ? `Minimum payments plus ${formatZAR(d.extra)} extra (exploring)`
              : "Minimum payments you entered"
          }
        />
        <Card accent>
          <Eyebrow>Debt-free around</Eyebrow>
          <div className="my-2 font-display text-h2 font-semibold">
            {p.debtFree
              ? formatPeriod(p.debtFree.period, "short")
              : d.open.length
                ? "No estimate"
                : "Paid off"}
          </div>
          <div className="text-body-sm text-fg-muted">
            <EstimateBadge /> If payments stay the same
          </div>
        </Card>
      </div>

      {d.open.length ? (
        <Card className="mb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Eyebrow>Estimate</Eyebrow>
              <h2 className="mb-2 mt-1 text-h3">Payoff order</h2>
            </div>
            <form
              action={setDebtMethod}
              className="inline-flex overflow-hidden rounded-md border border-control"
            >
              {(["snowball", "avalanche"] as const).map((m, i) => (
                <button
                  key={m}
                  type="submit"
                  name="method"
                  value={m}
                  aria-pressed={d.method === m}
                  className={`min-h-11 cursor-pointer border-0 px-4 text-body-sm font-semibold ${i ? "border-l border-control" : ""} ${d.method === m ? "bg-fg text-bg" : "bg-transparent text-fg"}`}
                >
                  {m === "snowball" ? "Snowball" : "Avalanche"}
                </button>
              ))}
            </form>
          </div>
          <p className="text-fg-muted">{METHOD_TEXT[d.method]}</p>

          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full border-collapse text-left tabular-nums">
              <caption className="sr-only">
                Debts in {d.method} order with estimated payoff months
              </caption>
              <thead>
                <tr className="border-b border-border-strong text-body-sm text-fg-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Debt
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Balance
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Interest
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Payment
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-semibold">
                    Paid off (est.)
                  </th>
                </tr>
              </thead>
              <tbody>
                {p.order.map((id, i) => {
                  const debt = byId.get(id)!;
                  const est = p.debts[i]!;
                  return (
                    <tr key={id} className="border-b border-border">
                      <th scope="row" className="py-3 pr-3 text-left font-normal">
                        {i + 1}. <Link href={`/app/debts/${id}` as never}>{debt.name}</Link>
                        {p.notCovering.includes(id) && !est.period ? (
                          <span className="block text-body-sm text-fg-muted">{NOT_COVERING}</span>
                        ) : null}
                      </th>
                      <td className="px-3 py-3 text-right">
                        <Money cents={debt.balance} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        {debt.rateBp === null ? (
                          <span className="text-body-sm text-fg-muted">Interest not included</span>
                        ) : (
                          formatRate(debt.rateBp)
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Money cents={debt.minPayment} />
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {est.period ? formatPeriod(est.period, "short") : "No estimate"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-fg-muted">Estimated interest until debt-free</span>
            <strong className="tabular-nums">
              {p.debtFree ? <Money cents={p.totalInterest} /> : "No estimate"}
            </strong>
          </div>
          <Working
            summary="What this estimate assumes"
            rows={[
              ["Monthly debt payments", formatZAR(p.monthlyBudget)],
              ["Months until debt-free", p.debtFree ? String(p.debtFree.months) : "No estimate"],
            ]}
            total={["Estimated interest", p.debtFree ? formatZAR(p.totalInterest) : "No estimate"]}
            note="Rates and payments stay as you entered them. Interest is estimated monthly from the yearly rate. Fees, rate changes and missed payments aren't included. Debts with no rate have interest not included."
          />

          <form method="get" className="mt-5 border-t border-border pt-5">
            <label htmlFor="extra" className="mb-1 block font-semibold">
              Explore paying extra each month
            </label>
            <p id="extra-help" className="mb-2 text-body-sm text-fg-muted">
              Just to see the estimate change. It doesn&apos;t change your plan.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-[200px]">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
                >
                  R
                </span>
                <input
                  id="extra"
                  name="extra"
                  inputMode="decimal"
                  defaultValue={d.extra ? centsToInput(d.extra) : rawExtra}
                  aria-describedby={extra === null ? "extra-help extra-error" : "extra-help"}
                  aria-invalid={extra === null ? true : undefined}
                  placeholder="0,00"
                  className={`h-12 w-full rounded-md border bg-raised pl-8 pr-3 text-body-lg tabular-nums text-fg ${extra === null ? "border-2 border-negative" : "border-control"}`}
                />
              </div>
              <Button type="submit" variant="secondary">
                Show estimate
              </Button>
              {d.extra ? (
                <Link href={"/app/debts" as never} className="py-3 text-body-sm">
                  Clear
                </Link>
              ) : null}
            </div>
            {extra === null ? (
              <p id="extra-error" className="mb-0 mt-1 text-body-sm text-negative">
                Enter an amount, like 500,00
              </p>
            ) : null}
          </form>
        </Card>
      ) : null}

      {d.paidOff.length ? (
        <Card className="mb-4">
          <Eyebrow>Done</Eyebrow>
          <h2 className="mb-3 mt-1 text-h3">Paid off</h2>
          <ul className="m-0 list-none p-0">
            {d.paidOff.map((x) => (
              <li
                key={x.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2 last:border-b-0"
              >
                <Link href={`/app/debts/${x.id}` as never}>{x.name}</Link>
                <span className="text-body-sm">
                  <Badge tone="success">Paid off</Badge>
                  {x.paidOffOn ? ` ${longDate(x.paidOffOn)}` : null}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <DebtHelp />
    </>
  );
}
