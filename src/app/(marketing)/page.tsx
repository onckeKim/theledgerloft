import { CalendarCheck, Crosshair, LockKeyhole, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { EstimateBadge } from "@/components/ui/badge";

// Copy from docs/l1/landing-page-concept.md; wording rules in docs/l1/safety-boundary.md.
const steps = [
  {
    title: "Set up in one sitting",
    body: "A guided walk-through of your income, bills, debts and goals.",
  },
  { title: "Plan each month", body: "Give every rand a job, or keep it flexible. Your choice." },
  {
    title: "Check in and reflect",
    body: "Record what happened, see your progress, and download a planner-style summary.",
  },
];

const features = [
  {
    icon: Wallet,
    title: "Monthly budget",
    body: "Planned vs actual and what's left to budget, with the working shown for every number.",
  },
  {
    icon: Crosshair,
    title: "Goals and sinking funds",
    body: "Save for the costs you know are coming, like school fees, the car licence and December.",
  },
  {
    icon: CalendarCheck,
    title: "Monthly check-in",
    body: "Reflection prompts and a printable summary in The Ledger Loft style.",
  },
];

const faqs = [
  {
    q: "Is this financial advice?",
    a: "No. It's a budgeting and planning tool. It helps you organise the numbers you enter.",
  },
  {
    q: "Do I need to link my bank?",
    a: "No. Everything is entered by you. We never ask for bank logins.",
  },
  {
    q: "Does it work with my printed planner?",
    a: "Yes. Use them side by side, and print your monthly summaries.",
  },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-[1120px] px-4 pb-16 pt-16 md:pt-24">
        <Eyebrow>The Ledger Loft &amp; Co</Eyebrow>
        <h1 className="mt-3 max-w-[18ch] text-[40px] leading-[1.1] md:text-display">
          Your Ledger Loft planner, with the maths done for you.
        </h1>
        <p className="mt-5 max-w-[56ch] text-body-lg text-fg-muted">
          Plan your month, track what really happened, and watch your goals and debts move, all
          without linking your bank account.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/pilot">Join the founding pilot</ButtonLink>
          <ButtonLink href="#how-it-works" variant="secondary">
            See how it works
          </ButtonLink>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-h"
        className="mx-auto max-w-[1120px] scroll-mt-8 px-4 py-12"
      >
        <h2 id="how-h" className="text-h2">
          How it works
        </h2>
        <ol className="mt-6 grid list-none gap-4 p-0 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <Eyebrow>Step {i + 1}</Eyebrow>
                <h3 className="mb-2 mt-1 text-h3">{s.title}</h3>
                <p className="m-0 text-fg-muted">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features-h" className="mx-auto max-w-[1120px] px-4 py-12">
        <h2 id="features-h" className="text-h2">
          What&apos;s inside
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <Icon aria-hidden="true" size={24} strokeWidth={1.5} className="text-sage" />
              <h3 className="mb-2 mt-3 text-h3">{title}</h3>
              <p className="m-0 text-fg-muted">{body}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-4" accent>
          <h3 className="mb-2 text-h3">
            Debts, clearly listed <EstimateBadge />
          </h3>
          <p className="m-0 text-fg-muted">
            See your debts in snowball or avalanche order. Payoff dates are estimates based only on
            what you enter, and you choose the method.
          </p>
        </Card>
      </section>

      <section aria-labelledby="privacy-h" className="mx-auto max-w-[1120px] px-4 py-12">
        <Card className="bg-sunken shadow-none">
          <LockKeyhole aria-hidden="true" size={24} strokeWidth={1.5} className="text-sage" />
          <h2 id="privacy-h" className="mb-3 mt-3 text-h2">
            Private by design
          </h2>
          <ul className="m-0 grid gap-2 pl-5">
            <li>No bank logins, ever. You enter only what you choose.</li>
            <li>Download or delete your data at any time.</li>
            <li>We don&apos;t sell your personal financial data.</li>
          </ul>
        </Card>
      </section>

      <section aria-labelledby="faq-h" className="mx-auto max-w-[720px] px-4 py-12">
        <h2 id="faq-h" className="text-h2">
          Questions
        </h2>
        <dl className="mt-6">
          {faqs.map(({ q, a }) => (
            <div key={q} className="border-b border-border py-4">
              <dt className="font-semibold">{q}</dt>
              <dd className="m-0 mt-1 text-fg-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
