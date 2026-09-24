import { addMonths, monthsBetween } from "./period";

/** Savings goals and sinking funds (docs/l4/calculation-spec.md §5). Must pass vectors G1–G5 and S1–S8. */

const divCeil = (n: number, d: number) => (n <= 0 ? 0 : Math.floor((n + d - 1) / d));

export function goalProgress({
  saved,
  target,
  monthly = 0,
  currentPeriod,
}: {
  saved: number;
  target: number;
  monthly?: number;
  currentPeriod: string;
}) {
  if (!(target > 0)) throw new RangeError("target must be > 0");
  const complete = saved >= target;
  const percent = complete ? 100 : Math.max(0, Math.floor((saved * 100) / target));
  const remaining = Math.max(0, target - saved);
  let estimate: { months: number; period: string } | null = null;
  if (!complete && monthly > 0) {
    const months = divCeil(remaining, monthly);
    estimate = { months, period: addMonths(currentPeriod, months) };
  }
  return { percent, remaining, complete, estimate };
}

export type SinkingStatus = "funded" | "on-track" | "short" | "due-now" | "past-due";

export function sinkingFund({
  saved,
  target,
  monthly = 0,
  currentPeriod,
  duePeriod,
}: {
  saved: number;
  target: number;
  monthly?: number;
  currentPeriod: string;
  duePeriod: string;
}) {
  if (!(target > 0)) throw new RangeError("target must be > 0");
  const remaining = Math.max(0, target - saved);
  const contributionsLeft = Math.max(0, monthsBetween(currentPeriod, duePeriod) - 1);
  const projected = saved + monthly * contributionsLeft;
  const shortBy = Math.max(0, target - projected);
  const requiredMonthly =
    remaining === 0 ? 0 : contributionsLeft === 0 ? null : divCeil(remaining, contributionsLeft);
  let status: SinkingStatus;
  if (remaining === 0) status = "funded";
  else if (contributionsLeft === 0)
    status = monthsBetween(currentPeriod, duePeriod) < 0 ? "past-due" : "due-now";
  else status = shortBy === 0 ? "on-track" : "short";
  const reachPeriod =
    remaining === 0
      ? currentPeriod
      : monthly > 0 && shortBy === 0
        ? addMonths(currentPeriod, divCeil(remaining, monthly))
        : null;
  return {
    remaining,
    contributionsLeft,
    projected,
    shortBy,
    requiredMonthly,
    status,
    reachPeriod,
    percent: remaining === 0 ? 100 : Math.floor((Math.max(saved, 0) * 100) / target),
  };
}
