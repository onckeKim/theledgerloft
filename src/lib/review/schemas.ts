import type { FieldErrors, Result } from "@/lib/budget/schemas";

/** Monthly check-in (PRD US-38 AC3): optional reflections up to 1 000 characters, up to 5 next-month actions. */
export type CheckinInput = { wentWell: string; surprised: string; nextActions: string[] };
export const MAX_REFLECTION = 1000;
export const MAX_ACTIONS = 5;
export const MAX_ACTION = 120;

export function parseCheckin(input: CheckinInput): Result<CheckinInput> {
  const errors: FieldErrors = {};
  const wentWell = (input.wentWell ?? "").trim();
  const surprised = (input.surprised ?? "").trim();
  if (wentWell.length > MAX_REFLECTION)
    errors.wentWell = `Use ${MAX_REFLECTION} characters or fewer`;
  if (surprised.length > MAX_REFLECTION)
    errors.surprised = `Use ${MAX_REFLECTION} characters or fewer`;
  const raw = Array.isArray(input.nextActions) ? input.nextActions : [];
  const nextActions = raw
    .map((a) => (typeof a === "string" ? a.trim().replace(/\s+/g, " ") : ""))
    .filter(Boolean);
  if (raw.length > MAX_ACTIONS || nextActions.length > MAX_ACTIONS)
    errors.nextActions = `Add up to ${MAX_ACTIONS} actions`;
  nextActions.forEach((a, i) => {
    if (a.length > MAX_ACTION) errors[`action-${i}`] = `Use ${MAX_ACTION} characters or fewer`;
  });
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { wentWell, surprised, nextActions } };
}
