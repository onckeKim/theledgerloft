import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DebtForm } from "@/components/debts/debt-form";
import { AmountForm } from "@/components/forms/amount-form";
import { RemoveWithHistory } from "@/components/forms/remove-with-history";
import { Badge } from "@/components/ui/badge";
import { Card, Eyebrow } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";
import { todayInJohannesburg } from "@/lib/calc/period";
import { recordPayment, removeDebt, setBalance } from "@/lib/debts/actions";
import { getDebt } from "@/lib/debts/queries";
import { bpToInput, centsToInput, formatRate } from "@/lib/money";

export const metadata: Metadata = { title: "Debt" };

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));

export default async function Page({ params, searchParams }: PageProps<"/app/debts/[id]">) {
  const { id } = await params;
  await verifySession(`/app/debts/${id}`);
  const data = await getDebt(id);
  if (!data) notFound();
  const { debt: d, history } = data;
  const { notice } = await searchParams;
  const today = todayInJohannesburg();
  const payments = history.filter((h) => h.kind === "payment").length;

  return (
    <>
      <PageHeader eyebrow="Debt" title={d.name} />
      <Notice
        value={notice}
        messages={{ created: "Added. Record payments here as you make them." }}
      />

      <Card accent className="mb-4">
        <Eyebrow>Balance</Eyebrow>
        <div className="my-2 flex flex-wrap items-baseline gap-3">
          <span className="font-display text-num-lg font-semibold tabular-nums">
            <Money cents={d.balance} />
          </span>
          {d.balance === 0 ? <Badge tone="success">Paid off</Badge> : null}
        </div>
        <p className="m-0 text-body-sm text-fg-muted">
          {d.balance === 0 && d.paidOffOn ? `Paid off on ${longDate(d.paidOffOn)}. ` : null}
          Minimum payment <Money cents={d.minPayment} /> ·{" "}
          {d.rateBp === null ? "Interest not included" : `${formatRate(d.rateBp)} a year`}
          {d.note ? ` · ${d.note}` : null}
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="record-payment">
          <Eyebrow>Record a payment</Eyebrow>
          <h2 className="mb-2 mt-1 text-h3">Record a payment</h2>
          {d.balance === 0 ? (
            <p className="text-fg-muted">
              This debt is paid off. If the balance has changed, update it from your statement.
            </p>
          ) : (
            <>
              <p className="mb-4 text-body-sm text-fg-muted">
                Lowers the balance and is recorded as spending in Debt payments.
              </p>
              <AmountForm
                id="pay"
                amountLabel="Amount paid"
                submitLabel="Record payment"
                today={today}
                withNote
                action={recordPayment.bind(null, d.id)}
              />
            </>
          )}
        </Card>
        <Card>
          <Eyebrow>From your statement</Eyebrow>
          <h2 className="mb-2 mt-1 text-h3">Update the balance</h2>
          <p className="mb-4 text-body-sm text-fg-muted">
            Use this when your statement shows a different balance, for example after interest or
            fees. It isn&apos;t recorded as spending.
          </p>
          <AmountForm
            id="balance"
            amountLabel="Balance on your statement"
            submitLabel="Update balance"
            today={today}
            withNote
            action={setBalance.bind(null, d.id)}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <Eyebrow>History</Eyebrow>
          <h2 className="mb-3 mt-1 text-h3">Payments and updates</h2>
          {history.length ? (
            <ul className="m-0 list-none p-0">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex justify-between gap-4 border-b border-border py-2 last:border-b-0"
                >
                  <span>
                    {h.kind === "payment" ? "Payment" : "Balance updated"}
                    <span className="block text-body-sm text-fg-muted">
                      {longDate(h.date)}
                      {h.note ? ` · ${h.note}` : null}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {h.kind === "payment" ? (
                      <>
                        −<Money cents={h.cents ?? 0} />
                      </>
                    ) : (
                      <>
                        to <Money cents={h.newBalance ?? 0} />
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">
              Nothing recorded yet. Started at <Money cents={d.opening} />.
            </p>
          )}
        </Card>
        <Card>
          <Eyebrow>Edit</Eyebrow>
          <h2 className="mb-3 mt-1 text-h3">Change the details</h2>
          <DebtForm
            id={d.id}
            initial={{
              name: d.name,
              balance: "",
              minPayment: centsToInput(d.minPayment),
              rate: d.rateBp === null ? "" : bpToInput(d.rateBp),
              note: d.note ?? "",
            }}
          />
          <div className="mt-6 border-t border-border pt-5">
            <RemoveWithHistory
              name={d.name}
              what="debt"
              historyCount={payments}
              action={removeDebt.bind(null, d.id)}
            />
          </div>
        </Card>
      </div>
      <p className="mt-4">
        <Link href={"/app/debts" as never}>Back to debts</Link>
      </p>
    </>
  );
}
