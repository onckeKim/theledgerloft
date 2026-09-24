import "server-only";
import { periodFor, todayInJohannesburg } from "@/lib/calc/period";
import { createClient } from "@/lib/supabase/server";

/**
 * The budget month today belongs to (L4 §3.1): the budget covering today if there is one (its dates can differ from
 * the start-day rule after a start-day change, D-041), otherwise the start-day rule. Read as the user (RLS).
 */
export async function currentPeriod(startDay: number): Promise<string> {
  const today = todayInJohannesburg();
  const supabase = await createClient();
  const { data } = await supabase
    .from("budgets")
    .select("period")
    .lte("starts_on", today)
    .gte("ends_on", today)
    .limit(1)
    .maybeSingle();
  return data?.period ?? periodFor(today, startDay).label;
}
