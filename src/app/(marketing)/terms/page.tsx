import type { Metadata } from "next";
import Link from "next/link";
import { SupportContact } from "@/components/marketing/support-contact";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SHORT_DISCLAIMER } from "@/content/disclaimer";
import { PILOT_REFUND } from "@/lib/payments/offer";

export const metadata: Metadata = { title: "Terms of use" };

// Draft written from what the app and the pilot offer do (docs/l1/pilot-offer.md, D-043, D-048). Points needing the
// owner's judgement are listed in docs/legal/review-notes.md. TODO(legal): publish the reviewed version before launch.
export default function Page() {
  return (
    <article className="mx-auto grid max-w-[720px] gap-4 px-4 py-16">
      <div>
        <Badge tone="neutral">Draft for review</Badge>
        <h1 className="mb-2 mt-3 text-h1">Terms of use</h1>
        <p className="text-fg-muted">Draft of 24 September 2026. Not yet in force.</p>
      </div>
      <Alert tone="info">
        <p>
          This draft hasn&apos;t been reviewed by a lawyer yet, and it may change before accounts
          open.
        </p>
      </Alert>

      <h2 className="mt-4 text-h2">About these terms</h2>
      <p>
        These terms apply when you use The Ledger Loft, a budgeting web app made by The Ledger Loft
        &amp; Co. By creating an account, you agree to them. How we handle your information is
        explained in the{" "}
        <Link className="underline" href="/privacy">
          privacy notice
        </Link>
        .
      </p>

      <h2 className="mt-4 text-h2">Not financial advice</h2>
      <p>
        {SHORT_DISCLAIMER} Please read the full{" "}
        <Link className="underline" href="/disclaimer">
          disclaimer
        </Link>
        .
      </p>

      <h2 className="mt-4 text-h2">Your account</h2>
      <ul className="m-0 grid list-disc gap-2 pl-5">
        <li>Each account is for one person. Please don&apos;t share your sign-in.</li>
        <li>Use an email address you can receive mail at, and keep your password to yourself.</li>
        <li>Tell us straight away if you think someone else has used your account.</li>
      </ul>

      <h2 className="mt-4 text-h2">Your information</h2>
      <p>
        What you enter stays yours. You can download all of it or delete your account at any time
        under Settings → Your data.
      </p>

      <h2 className="mt-4 text-h2">The founding pilot</h2>
      <ul className="m-0 grid list-disc gap-2 pl-5">
        <li>
          Access costs a once-off payment for a set number of days, both shown before you pay (for
          the founding pilot, R 50,00 for 90 days). Nothing renews automatically.
        </li>
        <li>
          Payments are processed by PayFast. Your access starts once PayFast confirms the payment.
        </li>
        <li>{PILOT_REFUND}</li>
        <li>
          When your access ends, your information isn&apos;t deleted. You can still download it or
          delete your account.
        </li>
      </ul>

      <h2 className="mt-4 text-h2">Early software</h2>
      <p>
        The Ledger Loft is new and still being built. Features may change, and the app may sometimes
        be unavailable while we fix or improve it. We&apos;ll try to give notice of planned
        downtime.
      </p>

      <h2 className="mt-4 text-h2">Fair use</h2>
      <p>Please don&apos;t:</p>
      <ul className="m-0 grid list-disc gap-2 pl-5">
        <li>try to access anyone else&apos;s account or information;</li>
        <li>try to break, overload or get around the app&apos;s security;</li>
        <li>copy the app or its content using automated tools;</li>
        <li>use the app for anything unlawful.</li>
      </ul>
      <p>
        If an account breaks these rules, we may suspend or close it. Where it&apos;s reasonable,
        we&apos;ll tell you first.
      </p>

      <h2 className="mt-4 text-h2">Changes to these terms</h2>
      <p>
        If we change these terms in a way that matters, we&apos;ll update the date above and email
        account holders before the change applies.
      </p>

      <h2 className="mt-4 text-h2">Contact</h2>
      <p>
        Questions about these terms: <SupportContact />.
      </p>
    </article>
  );
}
