import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Reviews" };

export default async function Page() {
  await verifySession("/app/review");
  return (
    <ComingSoon eyebrow="Monthly review" title="Reviews" icon={FileText} slice="L8">
      {"Check in at month end, reflect, and download a planner-style summary."}
    </ComingSoon>
  );
}
