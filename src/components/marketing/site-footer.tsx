import Link from "next/link";
import { SHORT_DISCLAIMER } from "@/content/disclaimer";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-[1120px] px-4 py-8 text-body-sm text-fg-muted">
        <p className="mb-4">{SHORT_DISCLAIMER}</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/disclaimer">Disclaimer</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <p className="mt-4 mb-0">© The Ledger Loft &amp; Co</p>
      </div>
    </footer>
  );
}
