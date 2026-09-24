"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isActive } from "./nav-items";

/** Phone navigation (<768px): four tabs plus a More menu for the rest. */
export function TabBar() {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((typeof value === "function" ? value(open) : value) ? pathname : null);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabs = NAV_ITEMS.slice(0, 4);
  const more = NAV_ITEMS.slice(4);
  const moreActive = more.some((i) => isActive(pathname, i.href));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    document.addEventListener("keydown", onKey);
    menuRef.current?.querySelector("a")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const item =
    "flex min-h-14 flex-col items-center gap-0.5 py-2 text-label-sm font-semibold tracking-[0.04em] no-underline";
  return (
    <>
      {open ? (
        <div
          ref={menuRef}
          id="more-menu"
          className="fixed bottom-16 right-2 z-30 min-w-52 rounded-md border border-border bg-raised p-2 shadow-md md:hidden"
        >
          {more.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className="flex items-center gap-3 rounded-sm p-3 no-underline hover:bg-sunken"
            >
              <Icon aria-hidden="true" size={20} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>
      ) : null}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-raised pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {tabs.map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                item,
                active ? "text-fg shadow-[inset_0_2px_0_var(--ll-accent)]" : "text-fg-muted",
              )}
            >
              <Icon aria-hidden="true" size={22} strokeWidth={1.5} />
              {short}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="more-menu"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            item,
            "cursor-pointer border-0 bg-transparent",
            moreActive ? "text-fg shadow-[inset_0_2px_0_var(--ll-accent)]" : "text-fg-muted",
          )}
        >
          <Ellipsis aria-hidden="true" size={22} strokeWidth={1.5} />
          More
        </button>
      </nav>
    </>
  );
}
