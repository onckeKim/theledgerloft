"use client";

import { useOptimistic, useTransition } from "react";
import { setChecklistHidden } from "@/lib/budget/actions";

/** Choose which default checklist items show each month (PRD US-25 AC2). */
export function ChecklistSettings({
  items,
  hidden,
}: {
  items: { key: string; label: string }[];
  hidden: string[];
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    hidden,
    (state, change: { key: string; hide: boolean }) =>
      change.hide ? [...state, change.key] : state.filter((k) => k !== change.key),
  );
  const [, start] = useTransition();
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-body-sm text-fg-muted underline underline-offset-4">
        Choose checklist items
      </summary>
      <fieldset className="m-0 mt-2 border-0 p-0">
        <legend className="sr-only">Show these items every month</legend>
        {items.map((item) => {
          const id = `show-${item.key}`;
          return (
            <div key={item.key} className="flex items-start gap-3 py-1 text-body-sm">
              <input
                id={id}
                type="checkbox"
                checked={!optimistic.includes(item.key)}
                onChange={(e) => {
                  const hide = !e.target.checked;
                  start(async () => {
                    setOptimistic({ key: item.key, hide });
                    await setChecklistHidden(item.key, hide);
                  });
                }}
                className="mt-0.5 size-[18px] shrink-0 accent-[var(--ll-btn-bg)]"
              />
              <label htmlFor={id}>Show “{item.label}”</label>
            </div>
          );
        })}
      </fieldset>
    </details>
  );
}
