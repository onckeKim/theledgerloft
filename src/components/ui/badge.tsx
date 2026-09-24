import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "neutral";
const tones: Record<Tone, string> = {
  info: "bg-[var(--ll-alert-info-bg)] text-[var(--ll-alert-info-edge)]",
  success: "bg-[var(--ll-alert-success-bg)] text-positive",
  neutral: "bg-sunken text-fg-muted",
};

export function Badge({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-pill px-2.5 py-0.5 align-middle font-sans text-label-sm font-semibold uppercase tracking-[0.2em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Every projection carries this (L1 rule, PRD R2). */
export function EstimateBadge() {
  return <Badge tone="info">Estimate</Badge>;
}
