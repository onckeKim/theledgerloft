import { formatPeriod } from "@/lib/calc/period";
import { formatZAR } from "@/lib/money";
import type { GoalWithProgress } from "./progress";

/**
 * Status copy for goals and sinking funds (L4 §5, L1 safety boundary): arithmetic on the user's own numbers,
 * no advice, no pressure. `estimate` is true when the sentence is a projection (shown with the Estimate badge).
 */
export function goalStatus(g: GoalWithProgress): {
  badge: string | null;
  text: string;
  estimate: boolean;
} {
  if (g.goal) {
    if (g.goal.complete)
      return {
        badge: "Goal reached",
        text: `You've reached ${formatZAR(g.target)}.`,
        estimate: false,
      };
    if (!g.goal.estimate)
      return { badge: null, text: "Add a monthly amount to see an estimate.", estimate: false };
    return {
      badge: null,
      text: `Reaches ${formatZAR(g.target)} around ${formatPeriod(g.goal.estimate.period, "short")} at ${formatZAR(g.monthly)} a month.`,
      estimate: true,
    };
  }
  const f = g.fund!;
  const due = formatPeriod(g.due!);
  switch (f.status) {
    case "funded":
      return {
        badge: "Funded",
        text: `You've set aside the full ${formatZAR(g.target)}.`,
        estimate: false,
      };
    case "on-track":
      return {
        badge: "On track",
        text: `On track to reach ${formatZAR(g.target)} by ${formatPeriod(f.reachPeriod ?? g.due!)}.`,
        estimate: true,
      };
    case "short":
      return {
        badge: null,
        text: `${formatZAR(f.shortBy)} short by ${due} at this rate. ${formatZAR(f.requiredMonthly ?? 0)} a month would reach it.`,
        estimate: true,
      };
    case "due-now":
      return {
        badge: null,
        text: `Due in ${due}. ${formatZAR(f.remaining)} still to find.`,
        estimate: false,
      };
    case "past-due":
      return {
        badge: null,
        text: `${due} has passed with ${formatZAR(f.remaining)} still to find. You can change the due month or target.`,
        estimate: false,
      };
  }
}
