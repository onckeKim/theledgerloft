import type { Metadata } from "next";
import { Confirming } from "@/components/payments/confirming";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Confirming your payment" };

/** PayFast sends the payer back here. It never grants access itself (PRD US-06 AC3). */
export default async function Page() {
  await verifySession("/app/join/return");
  return (
    <>
      <PageHeader eyebrow="Founding pilot" title="Thank you" />
      <Card className="max-w-[640px]">
        <Confirming />
      </Card>
    </>
  );
}
