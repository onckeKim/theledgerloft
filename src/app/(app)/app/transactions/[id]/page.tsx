import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";
import { getTransaction, listCategories } from "@/lib/budget/transactions";
import { periodFor, todayInJohannesburg } from "@/lib/calc/period";
import { centsToInput } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit transaction" };

export default async function Page({ params }: PageProps<"/app/transactions/[id]">) {
  const { id } = await params;
  await verifySession(`/app/transactions/${id}`);
  const tx = await getTransaction(id);
  if (!tx) notFound();
  const supabase = await createClient();
  const [{ data: household }, categories] = await Promise.all([
    supabase.from("households").select("month_start_day").single(),
    listCategories(),
  ]);
  const startDay = household?.month_start_day ?? 1;
  const back = `/app/transactions?period=${periodFor(tx.occurred_on, startDay).label}`;

  return (
    <>
      <PageHeader eyebrow="Transactions" title="Edit transaction" />
      <Card className="max-w-[560px]">
        <TransactionForm
          id={tx.id}
          categories={categories.map((c) => ({ id: c.id, name: c.name, group: c.category_group }))}
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
