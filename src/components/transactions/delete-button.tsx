"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteTransaction, restoreTransaction } from "@/lib/budget/actions";

/** Delete with a 10-second undo (PRD US-27 AC1). Confirmation is the undo window, so nothing is lost by a slip. */
export function DeleteTransactionButton({ id, label }: { id: string; label: string }) {
  const [state, setState] = useState<"idle" | "deleted" | "restored" | "failed">("idle");
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [pending, start] = useTransition();
  const router = useRouter();

  // When the undo window closes, refresh so totals and the list reflect the deletion.
  useEffect(() => {
    if (state === "deleted" && secondsLeft === 0) router.refresh();
  }, [state, secondsLeft, router]);

  useEffect(() => {
    if (state !== "deleted") return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [state]);

  if (state === "deleted" && secondsLeft > 0) {
    return (
      <span role="status" className="inline-flex items-center gap-2 text-body-sm">
        Deleted.
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () =>
              setState((await restoreTransaction(id)).status === "ok" ? "restored" : "failed"),
            )
          }
          className="cursor-pointer border-0 bg-transparent p-1 font-semibold underline underline-offset-4"
        >
          Undo ({secondsLeft})
        </button>
      </span>
    );
  }
  if (state === "failed")
    return (
      <span role="status" className="text-body-sm text-negative">
        Couldn&apos;t do that. Please try again.
      </span>
    );
  if (state === "deleted") return <span className="text-body-sm text-fg-muted">Deleted</span>;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await deleteTransaction(id);
          if (r.status === "ok") {
            setSecondsLeft(10);
            setState("deleted");
          } else setState("failed");
        })
      }
      className="cursor-pointer border-0 bg-transparent p-1 text-body-sm text-fg-muted underline underline-offset-4"
    >
      Delete<span className="sr-only"> {label}</span>
    </button>
  );
}
