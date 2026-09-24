import type { Metadata } from "next";
import { List } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Transactions" };

export default async function Page() {
  await verifySession("/app/transactions");
  return (
    <ComingSoon eyebrow="Transactions" title="Transactions" icon={List} slice="L7">
      {"Add, find and categorise your income and spending."}
    </ComingSoon>
  );
}
