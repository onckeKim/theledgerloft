"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { FieldErrors } from "@/lib/setup/schemas";
import type { Intent, SaveState } from "@/app/(setup)/app/setup/actions";

export type SaveStatus = "idle" | "saving" | "saved" | "unsaved" | "failed";

/**
 * Shared behaviour for setup steps:
 * - autosave on blur, but only when the whole step is valid (so a half-typed row can never overwrite saved data)
 * - "Save and continue" validates on the server and shows the error summary
 * - saves run one at a time, and each save includes the ids returned by earlier saves, so a quick
 *   blur-then-click can't insert the same new row twice (the database also serialises setup saves)
 * Values are read through a ref so a save always sends the latest state, never a stale render's copy.
 */
export function useStepForm<T>(opts: {
  values: T;
  validate: (values: T) => FieldErrors | null;
  save: (values: T, intent: Intent) => Promise<SaveState>;
  /** Copy known database ids onto rows that don't have one yet. */
  withIds?: (values: T, ids: Record<string, string>) => T;
  applyIds?: (ids: Record<string, string>) => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [focusToken, setFocusToken] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [autosaveRequest, setAutosaveRequest] = useState(0);
  const latest = useRef(opts);
  const lastSaved = useRef<string>(JSON.stringify(opts.values));
  const knownIds = useRef<Record<string, string>>({});
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [, startTransition] = useTransition();

  useEffect(() => {
    latest.current = opts;
  });

  const runNow = useCallback(
    async (intent: Intent) => {
      const { validate, save, withIds, applyIds } = latest.current;
      const values = withIds
        ? withIds(latest.current.values, knownIds.current)
        : latest.current.values;
      const snapshot = JSON.stringify(values);
      if (intent === "autosave") {
        if (snapshot === lastSaved.current) return;
        if (validate(values)) {
          setStatus("unsaved");
          return;
        }
      } else {
        setSubmitting(true);
      }
      setStatus("saving");
      try {
        // Inside a transition so a successful "continue" (a server-side redirect) navigates normally.
        const result = await new Promise<SaveState>((resolve, reject) =>
          startTransition(async () => {
            try {
              resolve(await save(values, intent));
            } catch (e) {
              reject(e);
            }
          }),
        );
        if (result.ids) {
          Object.assign(knownIds.current, result.ids);
          applyIds?.(result.ids);
        }
        if (result.status === "saved") {
          lastSaved.current = withIds
            ? JSON.stringify(withIds(values, knownIds.current))
            : snapshot;
          setErrors({});
          setStatus("saved");
        } else {
          setStatus(result.errors?.form ? "failed" : "unsaved");
          if (intent === "continue") {
            setErrors(result.errors ?? {});
            setFocusToken((t) => t + 1);
          }
        }
      } catch {
        setStatus("failed");
      } finally {
        if (intent === "continue") setSubmitting(false);
      }
    },
    [startTransition],
  );

  const run = useCallback(
    (intent: Intent) => {
      // One save at a time; a failure never blocks the saves queued after it.
      queue.current = queue.current.then(() => runNow(intent)).catch(() => undefined);
      return queue.current;
    },
    [runNow],
  );

  // Autosave requested by a change that isn't a blur (removing a row): runs after the new state has rendered.
  useEffect(() => {
    if (autosaveRequest > 0) void run("autosave");
  }, [autosaveRequest, run]);

  return {
    errors,
    status,
    pending: submitting,
    focusToken,
    autosave: () => void run("autosave"),
    requestAutosave: () => setAutosaveRequest((n) => n + 1),
    submit: () => void run("continue"),
  };
}
