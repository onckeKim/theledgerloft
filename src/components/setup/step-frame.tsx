import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { stepInfo, type StepSlug } from "@/lib/setup/steps";

/** Step header: "Step n of 6 · Name", time left, progress bar, heading and intro (docs/l3/screens.md §1). */
export function StepFrame({
  step,
  title,
  intro,
  children,
}: {
  step: StepSlug;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  const info = stepInfo(step);
  const percent = Math.round((info.number / info.total) * 100);
  return (
    <>
      <div className="mb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="ll-label">
            Step {info.number} of {info.total} · {info.label}
          </span>
          <span className="text-body-sm text-fg-muted">
            About {info.minutesLeft} {info.minutesLeft === 1 ? "minute" : "minutes"} left
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar label="Setup progress" value={percent} max={100} tone="navy" />
        </div>
      </div>
      <h1 className="mb-2 text-h1">{title}</h1>
      <div className="mb-6 text-body-lg text-fg-muted">{intro}</div>
      {children}
    </>
  );
}

export function SaveStatusText({
  status,
}: {
  status: "idle" | "saving" | "saved" | "unsaved" | "failed";
}) {
  const text = {
    idle: "",
    saving: "Saving…",
    saved: "All changes saved",
    unsaved: "Changes not saved yet. Finish the fields above to save.",
    failed: "Couldn't save just now. We'll try again when you continue.",
  }[status];
  return (
    <p role="status" aria-live="polite" className="m-0 min-h-5 text-body-sm text-fg-muted">
      {text}
    </p>
  );
}

export function StepNav({
  back,
  onContinue,
  pending,
  continueLabel = "Save and continue",
  skipHref,
}: {
  back: string;
  onContinue: () => void;
  pending: boolean;
  continueLabel?: string;
  skipHref?: string;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
      <Link href={back as never} className={buttonClasses({ variant: "secondary" })}>
        Back
      </Link>
      <div className="flex flex-wrap items-center gap-3 max-sm:w-full max-sm:flex-col-reverse">
        {skipHref ? (
          <Link href={skipHref as never} className={buttonClasses({ variant: "quiet" })}>
            Skip for now
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onContinue}
          disabled={pending}
          className={`${buttonClasses()} max-sm:w-full`}
        >
          {pending ? "Saving…" : continueLabel}
        </button>
      </div>
    </div>
  );
}
