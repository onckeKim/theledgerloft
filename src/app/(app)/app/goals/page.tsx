import type { Metadata } from "next";
import { Crosshair } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Goals and sinking funds" };

export default async function Page() {
  await verifySession("/app/goals");
  return (
    <ComingSoon eyebrow="Saving" title="Goals and sinking funds" icon={Crosshair} slice="L7">
      {"Track savings goals and set money aside for costs you know are coming."}
    </ComingSoon>
  );
}
