import type { Metadata } from "next";
import Link from "next/link";
import { DebtForm } from "@/components/debts/debt-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Add a debt" };

export default async function Page() {
  await verifySession("/app/debts/new");
  return (
    <>
      <PageHeader eyebrow="Debts" title="Add a debt" />
      <Card className="max-w-[640px]">
        <DebtForm initial={{ name: "", balance: "", minPayment: "", rate: "", note: "" }} />
      </Card>
      <p className="mt-4">
        <Link href={"/app/debts" as never}>Back to debts</Link>
      </p>
    </>
  );
}
