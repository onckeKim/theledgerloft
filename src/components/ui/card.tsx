import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** White card on cream (bg-raised on dark). `accent` adds the single gold edge for the highlighted card. */
export function Card({
  accent,
  className,
  ...props
}: ComponentProps<"div"> & { accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-raised p-6 shadow-sm",
        accent && "border-l-[3px] border-l-accent",
        className,
      )}
      {...props}
    />
  );
}

/** Small uppercase eyebrow label (uses the approved sageText label colour). */
export function Eyebrow({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("ll-label block", className)} {...props} />;
}
