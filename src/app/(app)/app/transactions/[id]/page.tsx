import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireAccess } from "@/lib/auth/dal";
import { getTransaction, listCategories } from "@/lib/budget/transactions";
import { todayInJohannesburg } from "@/lib/calc/period";
import { centsToInput } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit transaction" };

export default async function Page({ params }: PageProps<"/app/transactions/[id]">) {
  const { id } = await params;
  await requireAccess(`/app/transactions/${id}`);
  const tx = await getTransaction(id);
  if (!tx) notFound();
  const supabase = await createClient();
  const [{ data: household }, categories] = await Promise.all([
    supabase.from("households").select("month_start_day").single(),
    listCategories(),
  ]);
  const startDay = household?.month_start_day ?? 1;
  const back = `/app/transactions?period=${tx.period}`;
  const goalId = tx.goal_contributions[0]?.goal_id;
  const debtId = tx.debt_payments[0]?.debt_id;

  if (goalId || debtId)
    return (
      <>
        <PageHeader eyebrow="Transactions" title="Edit transaction" />
        <Card className="max-w-[560px]">
          <p>
            This transaction was recorded from {goalId ? "a goal" : "a debt"}, so it changes from
            there. That keeps {goalId ? "the amount saved" : "the balance"} and your budget in step.
          </p>
          <Link href={(goalId ? `/app/goals/${goalId}` : `/app/debts/${debtId}`) as never}>
            Open the {goalId ? "goal" : "debt"}
          </Link>
        </Card>
        <p className="mt-4">
          <Link href={back as never}>Back to transactions</Link>
        </p>
      </>
    );

  return (
    <>
      <PageHeader eyebrow="Transactions" title="Edit transaction" />
      <Card className="max-w-[560px]">
        <TransactionForm
          id={tx.id}
          categories={categories
            .filter((c) => !c.system_key || c.id === tx.category_id)
            .map((c) => ({ id: c.id, name: c.name, group: c.category_group }))}
          monthStartDay={startDay}
          today={todayInJohannesburg()}
          afterSave={back}
          initial={{
            kind: tx.kind,
            amount: centsToInput(tx.amount_cents),
            description: tx.description ?? "",
            categoryId: tx.category_id ?? "",
            date: tx.occurred_on,
          }}
        />
      </Card>
      <p className="mt-4">
        <Link href={back as never}>Back to transactions</Link>
      </p>
    </>
  );
}
