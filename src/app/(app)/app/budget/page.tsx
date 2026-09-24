import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Budget" };

export default async function Page() {
  await verifySession("/app/budget");
  return (
    <ComingSoon eyebrow="Monthly budget" title="Budget" icon={Wallet} slice="L7">
      {"Plan each month by category and see planned against actual."}
    </ComingSoon>
  );
}
