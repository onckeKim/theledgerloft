import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { verifySession } from "@/lib/auth/dal";
import { formatPeriod } from "@/lib/calc/period";
import { listReviews } from "@/lib/review/queries";

export const metadata: Metadata = { title: "Reviews" };

const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

export default async function Page() {
  await verifySession("/app/review");
  const months = await listReviews();
  return (
    <>
      <PageHeader eyebrow="Monthly review" title="Reviews" />
      {months.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No months to review yet"
            action={<ButtonLink href={"/app" as never}>Back to dashboard</ButtonLink>}
          >
            Your first review opens near the end of your first month.
          </EmptyState>
        </Card>
      ) : (
        <Card className="max-w-[720px]">
          <p className="text-fg-muted">
            Each month&apos;s check-in opens 3 days before the month ends and stays open afterwards.
          </p>
          <ul className="m-0 list-none p-0">
            {months.map((m) => (
              <li
                key={m.period}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
              >
                {m.open ? (
                  <Link href={`/app/review/${m.period}` as never} className="font-semibold">
                    {formatPeriod(m.period)}
                  </Link>
                ) : (
                  <span className="font-semibold">{formatPeriod(m.period)}</span>
                )}
                {m.completedAt ? (
                  <Badge tone="success">Checked in</Badge>
                ) : m.open ? (
                  <Badge tone="info">Ready</Badge>
                ) : (
                  <span className="text-body-sm text-fg-muted">Opens {dayMonth(m.opensOn)}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
