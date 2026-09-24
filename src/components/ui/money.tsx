import { formatZAR } from "@/lib/money";
import { cn } from "@/lib/cn";

/** An amount that never wraps and uses tabular numbers. */
export function Money({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>{formatZAR(cents)}</span>
  );
}
