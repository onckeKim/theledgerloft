import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptText, SearchX } from "lucide-react";
import { MonthSwitcher } from "@/components/budget/month-switcher";
import { DeleteTransactionButton } from "@/components/transactions/delete-button";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { buttonClasses } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireAccess } from "@/lib/auth/dal";
import { isPeriod, isUuid } from "@/lib/budget/schemas";
import { PAGE_SIZE, listCategories, listTransactions } from "@/lib/budget/transactions";
import { addMonths, formatPeriod, periodFor, todayInJohannesburg } from "@/lib/calc/period";
import { formatZAR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Transactions" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));

export default async function Page({ searchParams }: PageProps<"/app/transactions">) {
  await requireAccess("/app/transactions");
  const params = await searchParams;
  const supabase = await createClient();
  const { data: household } = await supabase.from("households").select("month_start_day").single();
  const startDay = household?.month_start_day ?? 1;
  const today = todayInJohannesburg();
  const current = periodFor(today, startDay).label;
  const period = isPeriod(one(params.period)) ? one(params.period)! : current;
  const categoryId = isUuid(one(params.category)) ? one(params.category) : undefined;
  const q = (one(params.q) ?? "").slice(0, 60);
  const page = Math.min(50, Math.max(1, Number(one(params.page)) || 1));

  const [{ rows, total }, categories] = await Promise.all([
    listTransactions({ period, categoryId, q, page }),
    listCategories(),
  ]);
  const filtered = Boolean(categoryId || q);
  const byDate = new Map<string, typeof rows>();
  for (const r of rows) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
  const qs = (extra: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const all = { period, category: categoryId, q: q || undefined, ...extra };
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== "") p.set(k, String(v));
    return `/app/transactions?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Transactions"
        title="What happened this month"
        actions={
          <MonthSwitcher
            base="/app/transactions"
            period={period}
            prev={addMonths(period, -1)}
            next={addMonths(period, 1)}
          />
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="list-h">
          <Card>
            <h2 id="list-h" className="sr-only">
              Transactions in {formatPeriod(period)}
            </h2>
            <form
              method="get"
              action="/app/transactions"
              className="mb-2 flex flex-wrap items-end gap-3"
              role="search"
            >
              <input type="hidden" name="period" value={period} />
              <div className="min-w-[200px] flex-1">
                <label htmlFor="q" className="mb-1 block text-body-sm font-semibold">
                  Search descriptions
                </label>
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={q}
                  className="h-11 w-full rounded-md border border-control bg-raised px-3 text-fg"
                />
              </div>
              <div>
                <label htmlFor="category" className="mb-1 block text-body-sm font-semibold">
                  Filter by category
                </label>
                <select
                  id="category"
                  name="category"
                  defaultValue={categoryId ?? ""}
                  className="h-11 rounded-md border border-control bg-raised px-3 text-fg"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                Filter
              </button>
              {filtered ? (
                <Link
                  href={qs({ category: undefined, q: undefined }) as never}
                  className="py-2 text-body-sm"
                >
                  Clear filters
                </Link>
              ) : null}
            </form>

            {rows.length === 0 ? (
              filtered ? (
                <EmptyState
                  icon={SearchX}
                  title="Nothing matches these filters"
                  action={
                    <Link href={qs({ category: undefined, q: undefined }) as never}>
                      Clear filters
                    </Link>
                  }
                >
                  Try another word or category.
                </EmptyState>
              ) : (
                <EmptyState
                  icon={ReceiptText}
                  title={`No transactions in ${formatPeriod(period)} yet`}
                >
                  Add your spending and income as it happens. It takes a few seconds each time.
                </EmptyState>
              )
            ) : (
              <>
                {[...byDate].map(([date, items]) => (
                  <section key={date} aria-label={longDate(date)}>
                    <h3 className="ll-label mb-0 mt-5">{longDate(date)}</h3>
                    <ul className="m-0 list-none p-0">
                      {items.map((t) => {
                        const title =
                          t.description ??
                          t.category ??
                          (t.kind === "income" ? "Income" : "Transaction");
                        const sub =
                          t.kind === "income"
                            ? "Income"
                            : t.kind === "refund"
                              ? `Refund · ${t.category ?? ""}`
                              : (t.category ?? "");
                        const amount =
                          t.kind === "outflow"
                            ? `−${formatZAR(t.cents)}`
                            : `+${formatZAR(t.cents)}`;
                        return (
                          <li
                            key={t.id}
                            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <strong className="block truncate">{title}</strong>
                              <span className="text-body-sm text-fg-muted">{sub}</span>
                            </div>
                            <span
                              className={`whitespace-nowrap tabular-nums ${t.kind === "outflow" ? "" : "text-positive"}`}
                            >
                              {amount}
                            </span>
                            <span className="flex w-full items-center justify-end gap-3 sm:w-auto">
                              {t.linked ? (
                                <Link href={t.linked.href as never} className="p-1 text-body-sm">
                                  Open {t.linked.label.toLowerCase()}
                                  <span className="sr-only"> for {title}</span>
                                </Link>
                              ) : (
                                <>
                                  <Link
                                    href={`/app/transactions/${t.id}` as never}
                                    className="p-1 text-body-sm"
                                  >
                                    Edit<span className="sr-only"> {title}</span>
                                  </Link>
                                  <DeleteTransactionButton id={t.id} label={title} />
                                </>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
                <p className="mb-0 mt-4 text-body-sm text-fg-muted">
                  Showing {rows.length} of {total} {total === 1 ? "transaction" : "transactions"}.{" "}
                  {rows.length < total && page < 50 ? (
                    <Link href={qs({ page: page + 1 }) as never}>Show more</Link>
                  ) : null}
                </p>
              </>
            )}
          </Card>
        </section>

        <aside aria-labelledby="add-h" className="lg:sticky lg:top-6">
          <Card>
            <Eyebrow>Add</Eyebrow>
            <h2 id="add-h" className="mb-4 mt-1 text-h3">
              New transaction
            </h2>
            <TransactionForm
              categories={categories
                .filter((c) => !c.system_key)
                .map((c) => ({
                  id: c.id,
                  name: c.name,
                  group: c.category_group,
                }))}
              monthStartDay={startDay}
              today={today}
            />
            <p className="mb-0 mt-4 border-t border-border pt-4 text-body-sm text-fg-muted">
              Adding to a goal or paying a debt? Use <Link href={"/app/goals" as never}>Goals</Link>{" "}
              or <Link href={"/app/debts" as never}>Debts</Link> so its balance updates too.
            </p>
          </Card>
        </aside>
      </div>
      <p className="sr-only">Page size {PAGE_SIZE}</p>
    </>
  );
}
