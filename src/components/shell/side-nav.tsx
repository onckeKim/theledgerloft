"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isActive } from "./nav-items";

/** Navy icon rail at 768–1023px, full side nav from 1024px (docs/l3/screens.md). */
export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line-dark bg-navy-deep px-2 py-6 text-cream md:flex lg:px-4">
      <Link
        href="/app"
        className="mb-8 block text-center font-display text-[22px] font-semibold text-cream no-underline lg:pl-3 lg:text-left"
      >
        <span className="hidden lg:inline">
          The Ledger Loft
          <small className="block font-sans text-label-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Planner
          </small>
        </span>
        <span className="lg:hidden" aria-hidden="true">
          LL
        </span>
        <span className="sr-only lg:hidden">The Ledger Loft</span>
      </Link>
      <nav aria-label="Main">
        <ul className="m-0 list-none p-0">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "mb-0.5 flex items-center justify-center gap-3 rounded-sm border-l-[3px] p-3 no-underline outline-gold lg:justify-start",
                    active
                      ? "border-l-gold bg-navy-soft text-cream"
                      : "border-l-transparent text-nav-muted hover:bg-navy-soft hover:text-cream",
                  )}
                >
                  <Icon aria-hidden="true" size={22} strokeWidth={1.5} />
                  <span className="sr-only lg:not-sr-only">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
