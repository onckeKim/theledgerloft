"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { removeCategory } from "@/lib/budget/actions";

/**
 * Remove (or archive) a category. The row can disappear once it's gone, so the confirmation is shown
 * by the page (?removed=deleted|archived), not here.
 */
export function RemoveCategoryButton({
  categoryId,
  name,
  period,
}: {
  categoryId: string;
  name: string;
  period: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (message)
    return (
      <span role="alert" className="text-body-sm text-negative">
        {message}
      </span>
    );
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="cursor-pointer border-0 bg-transparent p-1 text-body-sm text-fg-muted underline underline-offset-4"
      >
        Remove<span className="sr-only"> {name}</span>
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-body-sm">
      <span>Remove {name}?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await removeCategory(categoryId);
            if (r.status === "ok" && r.removed)
              router.replace(`/app/budget?period=${period}&removed=${r.removed}` as Route, {
                scroll: false,
              });
            else setMessage(r.message ?? "Couldn't remove it just now.");
          })
        }
        className="cursor-pointer border-0 bg-transparent p-1 font-semibold text-negative underline underline-offset-4"
      >
        Yes, remove
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="cursor-pointer border-0 bg-transparent p-1 underline underline-offset-4"
      >
        Cancel
      </button>
    </span>
  );
}
