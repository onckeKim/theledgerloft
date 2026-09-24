/** Guided setup steps (PRD US-10…US-16, docs/l3/screens.md §1). */
export const SETUP_STEPS = [
  { slug: "basics", label: "Basics", minutes: 2 },
  { slug: "income", label: "Income", minutes: 2 },
  { slug: "bills", label: "Fixed bills", minutes: 2 },
  { slug: "spending", label: "Everyday spending", minutes: 2 },
  { slug: "debts-goals", label: "Debts & goals", minutes: 3 },
  { slug: "review", label: "Review", minutes: 1 },
] as const;

export type StepSlug = (typeof SETUP_STEPS)[number]["slug"];
export type SetupRoute = StepSlug | "welcome";

export function stepInfo(slug: StepSlug) {
  const index = SETUP_STEPS.findIndex((s) => s.slug === slug);
  const step = SETUP_STEPS[index]!;
  const minutesLeft = SETUP_STEPS.slice(index).reduce((a, s) => a + s.minutes, 0);
  return {
    ...step,
    number: index + 1,
    total: SETUP_STEPS.length,
    minutesLeft,
    prev: index === 0 ? "welcome" : SETUP_STEPS[index - 1]!.slug,
    next: index === SETUP_STEPS.length - 1 ? null : SETUP_STEPS[index + 1]!.slug,
  };
}

export function isSetupRoute(value: string): value is SetupRoute {
  return value === "welcome" || SETUP_STEPS.some((s) => s.slug === value);
}

/** Where to resume: the step after the last one saved (households.setup_step), or the welcome page. */
export function resumeRoute(savedStep: string | null): SetupRoute {
  if (!savedStep) return "welcome";
  const index = SETUP_STEPS.findIndex((s) => s.slug === savedStep);
  if (index < 0) return "basics";
  return SETUP_STEPS[Math.min(index + 1, SETUP_STEPS.length - 1)]!.slug;
}

/** Suggestions are shown as unticked chips, never pre-filled (PRD US-13). */
export const BILL_SUGGESTIONS = [
  "Housing",
  "Electricity & water",
  "Phone & data",
  "Insurance",
  "Medical aid",
  "School fees",
];
export const SPENDING_SUGGESTIONS = ["Groceries", "Transport", "Personal & fun", "Eating out"];
