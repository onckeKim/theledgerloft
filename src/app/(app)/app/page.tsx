import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { House } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";
import { setupStatus } from "@/lib/setup/queries";

export const metadata: Metadata = { title: "Your month at a glance" };

export default async function Page({ searchParams }: PageProps<"/app">) {
  await verifySession("/app");
  const status = await setupStatus();

  // First visit: go straight to the welcome step. Part-way through: offer to continue (PRD US-16 AC4).
  if (!status.completed && !status.started) redirect("/app/setup" as Route);
  if (!status.completed) {
    return (
      <>
        <PageHeader eyebrow="Home" title="Welcome back" />
        <Card accent className="max-w-[640px]">
          <h2 className="mb-2 text-h3">Finish setting up your planner</h2>
          <p className="text-fg-muted">
            Your answers so far are saved. Pick up where you left off.
          </p>
          <ButtonLink href={"/app/setup" as never}>Continue setup</ButtonLink>
        </Card>
      </>
    );
  }

  const { welcome } = await searchParams;
  return (
    <>
      {welcome ? (
        <Alert tone="success" live className="mb-6">
          <p>
            <strong>Your plan is ready.</strong> Your dashboard fills in as you add spending.
          </p>
        </Alert>
      ) : null}
      <ComingSoon eyebrow="Home" title="Your month at a glance" icon={House} slice="L7">
        {
          "Your dashboard will show income, planned spending, what's left to budget and your progress."
        }
      </ComingSoon>
    </>
  );
}
