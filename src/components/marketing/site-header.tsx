import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="font-display text-[19px] font-semibold no-underline sm:text-[22px]"
        >
          The Ledger Loft &amp; Co
        </Link>
        <nav aria-label="Site" className="flex items-center gap-2">
          <ButtonLink href="/sign-in" variant="quiet" className="whitespace-nowrap">
            Sign in
          </ButtonLink>
          <ButtonLink href="/pilot" size="sm" className="max-sm:hidden">
            Founding pilot
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
