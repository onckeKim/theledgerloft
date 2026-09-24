"use client";

import { useOptimistic, useTransition } from "react";
import { setChecklist } from "@/lib/budget/actions";

export function Checklist({
  budgetId,
  items,
  done,
}: {
  budgetId: string;
  items: { key: string; label: string; hint?: string }[];
  done: Record<string, boolean>;
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    done,
    (state, change: { key: string; checked: boolean }) => ({
      ...state,
      [change.key]: change.checked,
    }),
  );
  const [, start] = useTransition();
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item) => {
        const id = `check-${item.key}`;
        const checked = Boolean(optimistic[item.key]);
        return (
          <li key={item.key} className="flex items-start gap-3 py-2">
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                const value = e.target.checked;
                start(async () => {
                  setOptimistic({ key: item.key, checked: value });
                  await setChecklist(budgetId, item.key, value);
                });
              }}
              className="mt-0.5 size-[18px] shrink-0 accent-[var(--ll-btn-bg)]"
            />
            <label htmlFor={id} className={checked ? "text-fg-muted line-through" : undefined}>
              {item.label}
              {item.hint ? (
                <span className="text-body-sm text-fg-muted"> ({item.hint})</span>
              ) : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
