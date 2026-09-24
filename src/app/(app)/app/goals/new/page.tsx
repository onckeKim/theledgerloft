import type { Metadata } from "next";
import Link from "next/link";
import { GoalForm } from "@/components/goals/goal-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireAccess } from "@/lib/auth/dal";
import { addMonths } from "@/lib/calc/period";
import { loadGoals } from "@/lib/goals/queries";

export const metadata: Metadata = { title: "New goal or fund" };

export default async function Page({ searchParams }: PageProps<"/app/goals/new">) {
  await requireAccess("/app/goals/new");
  const { kind } = await searchParams;
  const { period } = await loadGoals();
  return (
    <>
      <PageHeader eyebrow="Saving" title="New goal or fund" />
      <Card className="max-w-[640px]">
        <GoalForm
          initial={{
            kind: kind === "sinking_fund" ? "sinking_fund" : "goal",
            name: "",
            target: "",
            monthly: "",
            starting: "",
            due: "",
          }}
          minDue={addMonths(period, 1)}
          maxDue={addMonths(period, 120)}
        />
      </Card>
      <p className="mt-4">
        <Link href={"/app/goals" as never}>Back to goals</Link>
      </p>
    </>
  );
}
