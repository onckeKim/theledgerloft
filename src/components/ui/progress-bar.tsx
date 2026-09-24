import { cn } from "@/lib/cn";

/**
 * Progress bar with a text-safe accessible value. When `value` exceeds `max` (over plan) the bar
 * is full in the negative colour, aria-valuenow stays within range and aria-valuetext says why.
 * Widths follow L4 §2.2: permille rounded down, capped at 1000.
 */
export function ProgressBar({
  label,
  value,
  max,
  overText,
  tone = "sage",
}: {
  label: string;
  value: number;
  max: number;
  overText?: string;
  tone?: "sage" | "navy";
}) {
  const over = max === 0 ? value > 0 : value > max;
  const permille =
    max === 0
      ? value > 0
        ? 1000
        : 0
      : Math.min(1000, Math.floor((Math.max(value, 0) * 1000) / max));
  const percent = Math.floor(permille / 10);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={over ? overText : undefined}
      className="h-2 overflow-hidden rounded-pill bg-sunken"
    >
      <div
        className={cn("h-full", over ? "bg-negative" : tone === "navy" ? "bg-fg" : "bg-sage")}
        style={{ width: `${permille / 10}%` }}
      />
    </div>
  );
}
