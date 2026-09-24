import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "info" | "warning" | "danger";

const tones: Record<Tone, { box: string; icon: typeof Info }> = {
  success: {
    box: "bg-[var(--ll-alert-success-bg)] border-l-positive [&_svg]:text-positive",
    icon: CircleCheck,
  },
  info: {
    box: "bg-[var(--ll-alert-info-bg)] border-l-[var(--ll-alert-info-edge)] [&_svg]:text-[var(--ll-alert-info-edge)]",
    icon: Info,
  },
  warning: {
    box: "bg-[var(--ll-alert-warning-bg)] border-l-[var(--ll-alert-warning-edge)] [&_svg]:text-[var(--ll-alert-warning-edge)]",
    icon: TriangleAlert,
  },
  danger: {
    box: "bg-[var(--ll-alert-danger-bg)] border-l-negative [&_svg]:text-negative",
    icon: CircleAlert,
  },
};

/** Status message: tinted background, 3px edge, icon, and text in ink (never colour alone). */
export function Alert({
  tone,
  children,
  live,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  live?: boolean;
  className?: string;
}) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
      className={cn(
        "flex gap-3 rounded-md border-l-[3px] px-4 py-3 text-[var(--ll-alert-text)]",
        box,
        className,
      )}
    >
      <Icon aria-hidden="true" size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      <div className="[&>p]:m-0">{children}</div>
    </div>
  );
}
