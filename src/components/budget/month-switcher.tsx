import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatPeriod } from "@/lib/calc/period";

/** Previous / next month, keeping the current page (PRD route map: ?period=YYYY-MM). */
export function MonthSwitcher({
  base,
  period,
  prev,
  next,
}: {
  base: string;
  period: string;
  prev: string;
  next: string;
}) {
  const link =
    "inline-flex size-11 items-center justify-center rounded-md no-underline hover:bg-sunken";
  return (
    <nav aria-label="Month" className="flex items-center gap-1">
      <Link
        href={`${base}?period=${prev}` as never}
        className={link}
        aria-label={`Previous month, ${formatPeriod(prev)}`}
      >
        <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.5} />
      </Link>
      <span className="min-w-[9ch] text-center font-semibold" aria-current="date">
        {formatPeriod(period, "short")}
      </span>
      <Link
        href={`${base}?period=${next}` as never}
        className={link}
        aria-label={`Next month, ${formatPeriod(next)}`}
      >
        <ChevronRight aria-hidden="true" size={20} strokeWidth={1.5} />
      </Link>
    </nav>
  );
}
