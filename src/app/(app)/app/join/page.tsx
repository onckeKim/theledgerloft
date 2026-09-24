import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { JoinButton } from "@/components/payments/join-button";
import { Card, Eyebrow } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { getAccess, verifySession } from "@/lib/auth/dal";
import { payfastConfig } from "@/lib/env";
import { formatZAR } from "@/lib/money";
import { PILOT_ASK, PILOT_INCLUDES, PILOT_REFUND } from "@/lib/payments/offer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Join the founding pilot" };

/** Pilot offer and checkout (PRD US-06 AC1). Signed in, no access needed. */
export default async function Page({ searchParams }: PageProps<"/app/join">) {
  await verifySession("/app/join");
  if ((await getAccess()).active) redirect("/app" as Route);
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("plan_offer", {});
  const offer = data?.[0];
  const open = Boolean(offer?.open && offer.price_cents && payfastConfig());

  return (
    <>
      <PageHeader eyebrow="Founding pilot" title="Join the founding pilot" />
      <Notice
        value={notice}
        messages={{ cancelled: "No payment was taken. You can join whenever you're ready." }}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card>
          <Eyebrow>What&apos;s included</Eyebrow>
          <h2 className="mb-3 mt-1 text-h3">The Ledger Loft planner, as it&apos;s built</h2>
          <ul className="mb-4 list-disc pl-5">
            {PILOT_INCLUDES.map((i) => (
              <li key={i} className="mb-1">
                {i}
              </li>
            ))}
          </ul>
          <p className="text-fg-muted">{PILOT_ASK}</p>
          <h3 className="mb-1 mt-5 font-sans text-body font-semibold">Refunds</h3>
          <p className="text-fg-muted">{PILOT_REFUND}</p>
          <p className="mb-0 text-body-sm text-fg-muted">
            The Ledger Loft is a budgeting and planning tool. It doesn&apos;t give financial advice.
          </p>
        </Card>
        <Card accent>
          {open && offer?.price_cents ? (
            <>
              <Eyebrow>Once-off</Eyebrow>
              <div className="my-2 font-display text-num-lg font-semibold tabular-nums">
                {formatZAR(offer.price_cents)}
              </div>
              <p className="text-fg-muted">
                {offer.access_days} days of access. No subscription, nothing renews automatically.
              </p>
              <JoinButton label="Pay with PayFast" />
              <p className="mb-0 mt-3 text-body-sm text-fg-muted">
                You&apos;ll pay on PayFast&apos;s secure page. We never see your card details.
              </p>
            </>
          ) : (
            <>
              <Eyebrow>Coming soon</Eyebrow>
              <h2 className="mb-2 mt-1 text-h3">Not open for payment yet</h2>
              <p className="mb-0 text-fg-muted">
                The founding pilot isn&apos;t taking payments yet. Your account is ready for when it
                opens.
              </p>
            </>
          )}
        </Card>
      </div>
      <p className="mt-4 text-body-sm">
        <Link href={"/app/settings" as never}>Settings and your data</Link>
      </p>
    </>
  );
}
