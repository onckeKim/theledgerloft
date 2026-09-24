import {
  Crosshair,
  CreditCard,
  FileText,
  House,
  List,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";

export type NavItem = { href: Route; label: string; short: string; icon: LucideIcon };

/** Order and labels follow docs/l3/screens.md (navigation). The first four are phone tabs; the rest live under More. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", short: "Home", icon: House },
  { href: "/app/budget", label: "Budget", short: "Budget", icon: Wallet },
  { href: "/app/transactions", label: "Transactions", short: "Transactions", icon: List },
  { href: "/app/goals", label: "Goals & funds", short: "Goals", icon: Crosshair },
  { href: "/app/debts", label: "Debts", short: "Debts", icon: CreditCard },
  { href: "/app/review", label: "Reviews", short: "Reviews", icon: FileText },
  { href: "/app/settings", label: "Settings", short: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/app"
    ? pathname === "/app"
    : pathname === href || pathname.startsWith(`${href}/`);
}
