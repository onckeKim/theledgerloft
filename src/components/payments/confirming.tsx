"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { accessStatus } from "@/lib/payments/actions";

/**
 * "Confirming your payment…" (PRD US-06 AC3). Only reads access, every 2 seconds for up to 2 minutes; access is
 * granted by PayFast's verified notification, never by this page.
 */
export function Confirming() {
  const [state, setState] = useState<"waiting" | "done" | "slow">("waiting");
  useEffect(() => {
    let tries = 0;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      tries += 1;
      const r = await accessStatus().catch(() => ({ active: false }));
      if (stopped) return;
      if (r.active) setState("done");
      else if (tries >= 60) setState("slow");
      else setTimeout(tick, 2000);
    };
    void tick();
    return () => {
      stopped = true;
    };
  }, []);
  return (
    <div role="status" aria-live="polite">
      {state === "done" ? (
        <>
          <p className="text-body-lg font-semibold">
            You&apos;re in. Welcome to the founding pilot.
          </p>
          <Link href={"/app" as never}>Start setting up your planner</Link>
        </>
      ) : state === "slow" ? (
        <p>
          This is taking longer than usual. If you paid, your access will appear once PayFast
          confirms it. Refresh this page in a few minutes.
        </p>
      ) : (
        <p className="text-body-lg">Confirming your payment…</p>
      )}
    </div>
  );
}
