import type { Metadata } from "next";
import { AccountsSoon } from "@/components/marketing/accounts-soon";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

// Supabase Auth replaces this placeholder in A4 (PRD US-02…US-05).
export default function Page() {
  return <AccountsSoon title="Create an account" />;
}
