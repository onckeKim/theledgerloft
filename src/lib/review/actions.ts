"use server";

import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth/dal";
import type { ActionResult } from "@/lib/budget/actions";
import { isPeriod } from "@/lib/budget/schemas";
import { formatPeriod } from "@/lib/calc/period";
import { createClient } from "@/lib/supabase/server";
import { loadReview } from "./queries";
import { parseCheckin, type CheckinInput } from "./schemas";

/** Save the monthly check-in (PRD US-38 AC3, AC4). Only once the review is open; editable afterwards. */
export async function saveCheckin(period: string, input: CheckinInput): Promise<ActionResult> {
  await requireAccess(`/app/review/${period}`);
  if (!isPeriod(period)) return { status: "error", message: "Choose a month to check in." };
  const review = await loadReview(period);
  if (!review?.open) return { status: "error", message: "This check-in isn't open yet." };
  const parsed = parseCheckin(input);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_checkin", {
    p_period: period,
    p_went_well: parsed.data.wentWell,
    p_surprised: parsed.data.surprised,
    p_next: parsed.data.nextActions,
  });
  if (error)
    return { status: "error", message: "We couldn't save that just now. Please try again." };
  revalidatePath("/app", "layout");
  return { status: "ok", message: `Saved. Your ${formatPeriod(period)} check-in is complete.` };
}
