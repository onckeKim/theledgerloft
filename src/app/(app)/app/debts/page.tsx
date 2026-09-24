import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Debts" };

export default async function Page() {
  await verifySession("/app/debts");
  return (
    <ComingSoon eyebrow="Debts" title="Debts" icon={CreditCard} slice="L7">
      {"List your debts and explore snowball and avalanche estimates."}
    </ComingSoon>
  );
}
