import { Crosshair, CreditCard, LockKeyhole, Wallet } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";

export function Welcome() {
  return (
    <div className="pt-4">
      <span className="ll-label">Welcome</span>
      <h1 className="mb-4 mt-2 text-[40px] leading-[1.1]">Let&apos;s set up your planner</h1>
      <p className="text-body-lg text-fg-muted">
        We&apos;ll walk through your income, bills, debts and goals, one step at a time. It takes
        about 10 minutes, and you can stop and come back whenever you like.
      </p>
      <ul className="my-6 grid list-none gap-3 p-0">
        {[
          { icon: Wallet, text: "Your monthly plan, with the maths done for you" },
          { icon: Crosshair, text: "Goals and sinking funds for the costs you know are coming" },
          { icon: CreditCard, text: "A clear list of debts, with estimates you can explore" },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <Icon
              aria-hidden="true"
              size={20}
              strokeWidth={1.5}
              className="mt-0.5 shrink-0 text-sage"
            />
            {text}
          </li>
        ))}
      </ul>
      <Alert tone="info">
        <p>
          <LockKeyhole
            aria-hidden="true"
            size={16}
            strokeWidth={1.5}
            className="mr-1 inline align-[-2px]"
          />
          <strong>No bank logins, ever.</strong> You type in only what you choose to, and you can
          download or delete your data at any time.
        </p>
      </Alert>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <p className="m-0 max-w-[40ch] text-body-sm text-fg-muted">
          Estimates only. This isn&apos;t financial advice.
        </p>
        <ButtonLink href={"/app/setup/basics" as never} className="max-sm:w-full">
          Start setup
        </ButtonLink>
      </div>
    </div>
  );
}
