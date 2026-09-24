"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { applyGoalPlan } from "@/lib/goals/actions";

/** Sets this month's plan line to the goals' monthly total, only when the user asks. */
export function GoalPlanButton({ kind, label }: { kind: "goal" | "sinking_fund"; label: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="mt-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await applyGoalPlan(kind);
            setMessage(r.message ?? null);
          })
        }
      >
        {label}
      </Button>
      <p role="status" className="m-0 mt-1 text-body-sm empty:hidden">
        {message}
      </p>
    </div>
  );
}
