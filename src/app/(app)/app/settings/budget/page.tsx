import type { Metadata } from "next";
import Link from "next/link";
import { BudgetSetupForm } from "@/components/settings/budget-setup-form";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Budget setup" };

export default async function Page() {
  await verifySession("/app/settings/budget");
  const supabase = await createClient();
  const { data: h } = await supabase
    .from("households")
    .select("pay_frequency, month_start_day, budget_style, setup_completed_at")
    .single();
  return (
    <>
      <PageHeader eyebrow="Settings" title="Budget setup" />
      <Card className="max-w-[720px]">
        {h?.setup_completed_at ? (
          <BudgetSetupForm
            initial={{
              payFrequency: h.pay_frequency,
              monthStartDay: String(h.month_start_day),
              budgetStyle: h.budget_style,
            }}
          />
        ) : (
          <>
            <p>Finish setting up your planner first. These choices are part of the first step.</p>
            <ButtonLink href={"/app/setup" as never}>Continue setup</ButtonLink>
          </>
        )}
      </Card>
      <p className="mt-4">
        <Link href={"/app/settings" as never}>Back to settings</Link>
      </p>
    </>
  );
}
