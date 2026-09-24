import type { Metadata } from "next";
import Link from "next/link";
import { SupportContact } from "@/components/marketing/support-contact";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Privacy notice" };

// Draft written from what the app does (docs/data-classification.md, D-046, D-048). Points needing the owner's
// judgement are listed in docs/legal/review-notes.md. TODO(legal): publish the reviewed version before launch.
export default function Page() {
  return (
    <article className="mx-auto grid max-w-[720px] gap-4 px-4 py-16">
      <div>
        <Badge tone="neutral">Draft for review</Badge>
        <h1 className="mb-2 mt-3 text-h1">Privacy notice</h1>
        <p className="text-fg-muted">Draft of 24 September 2026. Not yet in force.</p>
      </div>
      <Alert tone="info">
        <p>
          This draft describes how The Ledger Loft works today. It hasn&apos;t been reviewed by a
          lawyer yet, and it may change before accounts open.
        </p>
      </Alert>

      <h2 className="mt-4 text-h2">Who we are</h2>
      <p>
        The Ledger Loft is a budgeting web app made by The Ledger Loft &amp; Co, a small South
        African business (a trading name, not a registered company). We decide how your information
        is used, and the owner is responsible for protecting it. Contact: <SupportContact />.
      </p>

      <h2 className="mt-4 text-h2">What we collect</h2>
      <ul className="m-0 grid list-disc gap-2 pl-5">
        <li>
          <strong>Your account:</strong> your email address, the name you choose to show, and your
          password. The password is stored only as a scrambled hash, which we can&apos;t read.
        </li>
        <li>
          <strong>What you enter:</strong> income, bills, spending categories, transactions, goals,
          debts and your monthly check-in notes. Please don&apos;t put information about health,
          religion or other sensitive matters into notes or names.
        </li>
        <li>
          <strong>Payments:</strong> if you join the founding pilot, the PayFast payment reference,
          the amount and whether it was confirmed. Your card details go to PayFast and never reach
          us.
        </li>
        <li>
          <strong>Security records:</strong> a note that certain things happened (for example
          signing up, finishing setup, downloading your data or moving money to a goal), without
          amounts or what you typed. Supabase keeps a log of sign-ins, and our hosting providers
          keep short technical logs, which include IP addresses.
        </li>
      </ul>
      <p>We never ask for bank logins, account or card numbers, your ID number or your address.</p>

      <h2 className="mt-4 text-h2">How we use it</h2>
      <ul className="m-0 grid list-disc gap-2 pl-5">
        <li>To run the app for you: your plan, calculations, reviews and downloads.</li>
        <li>To keep your account secure and to find and fix problems.</li>
        <li>To process your pilot payment and give you access.</li>
        <li>To answer you when you contact us.</li>
        <li>
          To improve the app using counts only (for example how many people finished setup), never
          your amounts or what you wrote.
        </li>
      </ul>
      <p>
        We don&apos;t sell your information, show adverts or use it for marketing profiles. There
        are no advertising or tracking tools in the app.
      </p>

      <h2 className="mt-4 text-h2">Cookies</h2>
      <p>We only use cookies the app needs to work:</p>
      <ul className="m-0 grid list-disc gap-2 pl-5">
        <li>sign-in cookies that keep you signed in, removed when you sign out;</li>
        <li>
          one cookie that remembers your light or dark appearance on this device, kept for about 13
          months.
        </li>
      </ul>

      <h2 className="mt-4 text-h2">Who helps us</h2>
      <ul className="m-0 grid list-disc gap-2 pl-5">
        <li>
          <strong>Supabase</strong> stores the database and handles sign-in and account emails. The
          database is in London, United Kingdom.
        </li>
        <li>
          <strong>Vercel</strong> hosts the website. The app&apos;s server code runs in London.
        </li>
        <li>
          <strong>PayFast</strong> (South Africa) processes pilot payments.
        </li>
      </ul>
      <p>
        Because the database is in the United Kingdom, your information is stored outside South
        Africa. These providers may only use it to provide their service to us.
      </p>

      <h2 className="mt-4 text-h2">How long we keep it</h2>
      <ul className="m-0 grid list-disc gap-2 pl-5">
        <li>Your account and everything you entered: until you delete your account.</li>
        <li>Transactions you delete: removed completely after 30 days.</li>
        <li>Records of downloads you made: 7 days. The files themselves are never stored.</li>
        <li>Security records: 12 months.</li>
        <li>
          Backup copies: a deleted account can stay in backups for up to 4 weeks before the backup
          itself is deleted.
        </li>
        <li>Payment records: as long as the law requires for accounting.</li>
      </ul>

      <h2 className="mt-4 text-h2">Your rights</h2>
      <ul className="m-0 grid list-disc gap-2 pl-5">
        <li>
          <strong>See your information:</strong> download all of it any time under Settings → Your
          data.
        </li>
        <li>
          <strong>Correct it:</strong> change anything you entered, your name or your email in the
          app.
        </li>
        <li>
          <strong>Delete it:</strong> delete your account under Settings → Your data. This removes
          your household&apos;s information straight away.
        </li>
        <li>
          <strong>Ask or object:</strong> contact us at <SupportContact />.
        </li>
        <li>
          <strong>Complain:</strong> you can complain to the Information Regulator (South Africa).
        </li>
      </ul>

      <h2 className="mt-4 text-h2">Keeping it safe</h2>
      <p>
        Your information is encrypted in transit and at rest by our providers. Each household can
        only see its own information, and this is tested. Only the owner can access the systems
        behind the app, and not to browse your finances. If something goes wrong that affects your
        information, we&apos;ll tell you.
      </p>

      <h2 className="mt-4 text-h2">Changes</h2>
      <p>
        If we change this notice in a way that matters, we&apos;ll update the date above and email
        account holders before the change applies. See also the{" "}
        <Link className="underline" href="/terms">
          terms of use
        </Link>{" "}
        and the{" "}
        <Link className="underline" href="/disclaimer">
          disclaimer
        </Link>
        .
      </p>
    </article>
  );
}
