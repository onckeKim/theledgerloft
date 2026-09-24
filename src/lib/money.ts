/**
 * Money helpers. All money is integer cents (docs/l4/calculation-spec.md §1, §7).
 * Formatting must match the L4 vectors F1–F5 and R1–R3 exactly.
 */

declare const centsBrand: unique symbol;
/** An integer number of cents. Create with `toCents()` or `parseRandToCents()`. */
export type Cents = number & { readonly [centsBrand]: true };

/** Smallest and largest amount a user may enter: R 0,01 to R 99 999 999,99 (L4 §1). */
export const MIN_ENTERED_CENTS = 1;
export const MAX_ENTERED_CENTS = 9_999_999_999;

export function toCents(value: number): Cents {
  if (!Number.isSafeInteger(value))
    throw new RangeError(`Money must be an integer number of cents, got ${value}`);
  return value as Cents;
}

const NBSP = " ";
const MINUS = "−";

/** `R 1 234,56` with non-breaking spaces; negatives as `−R 250,00` (real minus sign). */
export function formatZAR(cents: number): string {
  const whole = toCents(cents);
  const abs = Math.abs(whole);
  const rands = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const c = String(abs % 100).padStart(2, "0");
  return `${whole < 0 ? MINUS : ""}R${NBSP}${rands},${c}`;
}

/** Annual rate in basis points to `20,75%`. */
export function formatRate(basisPoints: number): string {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0)
    throw new RangeError("Rate must be a non-negative integer of basis points");
  return `${Math.floor(basisPoints / 100)},${String(basisPoints % 100).padStart(2, "0")}%`;
}

/**
 * Parse what a person types into cents. Accepts `1 234,56`, `1234.56`, `1,234.56`, `R 250`, `12,5`.
 * The last `,` or `.` followed by 1–2 digits is the decimal separator; any others must separate groups of 3.
 * Returns null for anything else, including negatives, 3+ decimals and amounts outside the allowed range.
 */
export function parseRandToCents(input: string): Cents | null {
  const s = input.trim().replace(/^R/i, "").replace(/[\s ]/g, "");
  const match = /^(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?$/.exec(s);
  if (!match) return null;
  const rands = Number(match[1]!.replace(/[.,]/g, ""));
  const decimals = (match[2] ?? "").padEnd(2, "0");
  const cents = rands * 100 + Number(decimals);
  if (!Number.isSafeInteger(cents) || cents < MIN_ENTERED_CENTS || cents > MAX_ENTERED_CENTS)
    return null;
  return cents as Cents;
}
