import { goalProgress, sinkingFund } from "@/lib/calc/goals";

/** Goal and sinking-fund rows with their L4 §5 results. Pure: shared by the dashboard and the goals pages. */
export type GoalRecord = {
  id: string;
  kind: string;
  name: string;
  target_cents: number;
  monthly_cents: number;
  starting_cents: number;
  due_period: string | null;
};
export type ContributionRecord = { goal_id: string; direction: string; amount_cents: number };

/** Saved = starting amount + money added − money taken out (L4 §5). */
export function savedByGoal(goals: GoalRecord[], contributions: ContributionRecord[]) {
  const saved = new Map(goals.map((g) => [g.id, g.starting_cents]));
  for (const c of contributions)
    if (saved.has(c.goal_id))
      saved.set(
        c.goal_id,
        saved.get(c.goal_id)! + (c.direction === "in" ? c.amount_cents : -c.amount_cents),
      );
  return saved;
}

export function withProgress(
  goals: GoalRecord[],
  contributions: ContributionRecord[],
  currentPeriod: string,
) {
  const saved = savedByGoal(goals, contributions);
  return goals.map((g) => {
    const s = saved.get(g.id)!;
    const base = {
      id: g.id,
      name: g.name,
      kind: (g.kind === "sinking_fund" ? "sinking_fund" : "goal") as "goal" | "sinking_fund",
      saved: s,
      target: g.target_cents,
      monthly: g.monthly_cents,
      starting: g.starting_cents,
      due: g.due_period,
    };
    return g.kind === "sinking_fund" && g.due_period
      ? {
          ...base,
          fund: sinkingFund({
            saved: s,
            target: g.target_cents,
            monthly: g.monthly_cents,
            currentPeriod,
            duePeriod: g.due_period,
          }),
          goal: null,
        }
      : {
          ...base,
          goal: goalProgress({
            saved: s,
            target: g.target_cents,
            monthly: g.monthly_cents,
            currentPeriod,
          }),
          fund: null,
        };
  });
}

export type GoalWithProgress = ReturnType<typeof withProgress>[number];
