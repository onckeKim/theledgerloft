"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/budget/actions";

/**
 * State for a small form that calls one server action: values, field errors, a focus token for the
 * error summary, and a status message. A new submit clears the last message so it can't stand for this one.
 */
export function useFormAction<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [pending, start] = useTransition();

  const set = (k: keyof T, v: string) => setValues((s) => ({ ...s, [k]: v }));
  const run = (
    action: () => Promise<ActionResult>,
    onOk?: (r: ActionResult) => void,
    onOther?: (r: ActionResult) => boolean,
  ) => {
    setMessage(null);
    start(async () => {
      const r = await action();
      if (onOther?.(r)) return;
      if (r.status === "ok") {
        setErrors({});
        setMessage(r.message ?? "Saved.");
        onOk?.(r);
      } else {
        setErrors(r.errors ?? (r.message ? { form: r.message } : {}));
        setFocusToken((t) => t + 1);
      }
    });
  };
  const summary = (prefix: string) =>
    Object.entries(errors)
      .filter(([k]) => k !== "form")
      .map(([k, m]) => ({ href: `#${prefix}-${k}`, message: m }));

  return { values, setValues, set, errors, message, focusToken, pending, run, summary };
}
