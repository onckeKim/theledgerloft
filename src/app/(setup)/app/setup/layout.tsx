import Link from "next/link";
import { DisclaimerFooter } from "@/components/shell/disclaimer-footer";

// Onboarding has its own quiet frame: no app navigation, just the brand and a way out (docs/l3/screens.md §1).
// Protection is in each page via verifySession() (see src/app/pages-guard.test.ts).
export default function SetupLayout({ children }: LayoutProps<"/app/setup">) {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-4 px-4 py-4">
          <Link href="/app" className="font-display text-[19px] font-semibold no-underline">
            The Ledger Loft &amp; Co
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
          >
            Save and finish later
          </Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-[640px] px-4 pb-16 pt-8">
        {children}
        <DisclaimerFooter />
      </main>
    </>
  );
}
