import { formatZAR } from "@/lib/money";
import type { CategoryStatus } from "@/lib/calc/budget";

/** Words for a category's position this month (L4 §4 status table). Never colour or sign alone. */
export function remainingText(c: {
  status: CategoryStatus;
  remaining: number;
  over: number;
  actual: number;
  planned: number;
}): string {
  if (c.actual < 0) return `${formatZAR(-c.actual)} refunded`;
  switch (c.status) {
    case "over":
      return `${formatZAR(c.over)} over`;
    case "unplanned":
      return `${formatZAR(c.actual)} not planned`;
    case "empty":
      return "Not planned yet";
    case "spent":
      return "Spent as planned";
    default:
      return `${formatZAR(c.remaining)} left`;
  }
}

export function barLabel(
  name: string,
  c: { status: CategoryStatus; over: number; actual: number },
): string | undefined {
  if (c.status === "over") return `${formatZAR(c.over)} over plan`;
  if (c.status === "unplanned") return `${formatZAR(c.actual)} not planned`;
  return undefined;
}

/** Left-to-budget message by budgeting style (PRD US-22). */
export function leftToBudgetNote(style: "flexible" | "zero_based", left: number): string {
  if (left < 0)
    return `You've planned ${formatZAR(-left)} more than your income. Adjust a category to balance.`;
  if (left === 0)
    return style === "zero_based"
      ? "Every rand has a job this month."
      : "Everything is planned for this month.";
  return style === "zero_based"
    ? `Assign ${formatZAR(left)} to reach R 0,00.`
    : "Unassigned. With a flexible budget that's fine.";
}
