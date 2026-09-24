/**
 * Budget periods (docs/l4/calculation-spec.md §3). Must match scripts/calc-reference.mjs and the database
 * functions public.period_for / public.period_bounds (vectors P1–P7).
 */
const pad = (n: number) => String(n).padStart(2, "0");

export type Period = `${number}-${string}`;

export function addMonths(period: string, k: number): string {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const t = y * 12 + (m - 1) + k;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
}

export function monthsBetween(from: string, to: string): number {
  const [a, b] = from.split("-").map(Number) as [number, number];
  const [c, d] = to.split("-").map(Number) as [number, number];
  return c * 12 + d - (a * 12 + b);
}

export function periodFor(
  date: string,
  startDay: number,
): { label: string; start: string; end: string } {
  if (!Number.isInteger(startDay) || startDay < 1 || startDay > 28)
    throw new RangeError("startDay must be 1–28");
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const startMonth = d >= startDay ? `${y}-${pad(m)}` : addMonths(`${y}-${pad(m)}`, -1);
  const label = startDay === 1 ? startMonth : addMonths(startMonth, 1);
  const [ny, nm] = addMonths(startMonth, 1).split("-").map(Number) as [number, number];
  const end = new Date(Date.UTC(ny, nm - 1, startDay) - 86_400_000);
  return {
    label,
    start: `${startMonth}-${pad(startDay)}`,
    end: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`,
  };
}

/** First and last day of a labelled period (L4 §3: the label is the month the period ends in). */
export function periodRange(label: string, startDay: number): { start: string; end: string } {
  const start = startDay === 1 ? `${label}-01` : `${addMonths(label, -1)}-${pad(startDay)}`;
  const r = periodFor(start, startDay);
  return { start: r.start, end: r.end };
}

/** Add days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date in South Africa (L4 §1 time zone), as YYYY-MM-DD. */
export function todayInJohannesburg(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(now);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** `2026-09` → `September 2026` (long) or `Sep 2026` (short). */
export function formatPeriod(period: string, style: "long" | "short" = "long"): string {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const name = MONTHS[m - 1] ?? "";
  return `${style === "short" ? name.slice(0, 3) : name} ${y}`;
}
