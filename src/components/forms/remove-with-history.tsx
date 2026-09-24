"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/budget/actions";

/**
 * Remove a goal or debt (PRD US-33 AC2). With history, the choice defaults to keeping it (archive);
 * deleting everything also removes the matching transactions. The server redirects when it's done.
 */
export function RemoveWithHistory({
  name,
  what,
  historyCount,
  action,
}: {
  name: string;
  what: "goal" | "fund" | "debt";
  historyCount: number;
  action: (mode: "archive" | "delete") => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"archive" | "delete">("archive");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const txWord = historyCount === 1 ? "transaction" : "transactions";

  if (!open)
    return (
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>
        Remove this {what}
      </Button>
    );
  return (
    <div className="rounded-md border border-border p-4">
      {historyCount > 0 ? (
        <fieldset className="m-0 mb-4 border-0 p-0">
          <legend className="mb-2 font-semibold">What should happen to {name}?</legend>
          <label className="mb-2 flex items-start gap-3">
            <input
              type="radio"
              name="remove-mode"
              checked={mode === "archive"}
              onChange={() => setMode("archive")}
              className="mt-1 size-[18px] accent-[var(--ll-btn-bg)]"
            />
            <span>
              Keep its history
              <span className="block text-body-sm text-fg-muted">
                It&apos;s hidden from this page. Its {historyCount} {txWord} stay in your budget.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="remove-mode"
              checked={mode === "delete"}
              onChange={() => setMode("delete")}
              className="mt-1 size-[18px] accent-[var(--ll-btn-bg)]"
            />
            <span>
              Delete everything
              <span className="block text-body-sm text-fg-muted">
                Also deletes its {historyCount} {txWord}. This can&apos;t be undone.
              </span>
            </span>
          </label>
        </fieldset>
      ) : (
        <p className="mb-4">Remove {name}? Nothing has been recorded for it yet.</p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await action(historyCount > 0 ? mode : "delete");
              if (r?.status === "error") setError(r.message ?? "Couldn't remove it just now.");
            })
          }
        >
          {pending
            ? "Removing…"
            : historyCount > 0 && mode === "archive"
              ? "Archive it"
              : "Yes, remove"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mb-0 mt-3 text-body-sm text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
