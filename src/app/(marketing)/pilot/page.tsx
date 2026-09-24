import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Card, Eyebrow } from "@/components/ui/card";

export const metadata: Metadata = { title: "Founding pilot" };

// Offer shape from docs/l1/pilot-offer.md. Price, size and dates come from the owner (product brief question 3).
export default function PilotPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16">
      <Eyebrow>Founding members</Eyebrow>
      <h1 className="mb-4 mt-2 text-h1">The Ledger Loft founding pilot</h1>
      <p className="text-body-lg text-fg-muted">
        A small group of early members will use the planner as it&apos;s built, and help shape it
        with honest feedback.
      </p>
      <Card className="my-8">
        <h2 className="mb-3 text-h3">What&apos;s included</h2>
        <ul className="m-0 grid gap-2 pl-5">
          <li>
            Three months of access as each part is released: setup, monthly budget, goals, debts and
            monthly summaries
          </li>
          <li>A free digital Ledger Loft planner of your choice</li>
          <li>A direct line to the founder for feedback</li>
        </ul>
        <h2 className="mb-3 mt-6 text-h3">What it isn&apos;t</h2>
        <p className="m-0 text-fg-muted">
          It isn&apos;t financial advice or money coaching, and it&apos;s early software, so
          features arrive over time.
        </p>
      </Card>
      <Alert tone="info">
        <p>
          <strong>Sign-ups open soon.</strong> Price and dates will be announced here first.
        </p>
      </Alert>
    </div>
  );
}
