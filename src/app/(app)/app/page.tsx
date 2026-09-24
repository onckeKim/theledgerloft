import type { Metadata } from "next";
import { House } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Your month at a glance" };

export default async function Page() {
  await verifySession("/app");
  return (
    <ComingSoon eyebrow="Home" title="Your month at a glance" icon={House} slice="L7">
      {
        "Your dashboard will show income, planned spending, what's left to budget and your progress."
      }
    </ComingSoon>
  );
}
