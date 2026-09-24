import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  await verifySession("/app/settings");
  return (
    <ComingSoon eyebrow="Account" title="Settings" icon={Settings} slice="A4">
      {"Manage your profile, budget setup and your data."}
    </ComingSoon>
  );
}
