import type { ReactNode } from "react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Money } from "@/components/ui/money";

export function StatCard({
  label,
  cents,
  sub,
  accent,
  children,
  size = "lg",
}: {
  label: string;
  cents: number;
  sub?: ReactNode;
  accent?: boolean;
  children?: ReactNode;
  size?: "lg" | "md";
}) {
  return (
    <Card accent={accent}>
      <Eyebrow>{label}</Eyebrow>
      <div
        className={`my-2 font-display font-semibold tabular-nums ${size === "lg" ? "text-num-lg" : "text-h2"}`}
      >
        <Money cents={cents} />
      </div>
      {sub ? <div className="text-body-sm text-fg-muted">{sub}</div> : null}
      {children}
    </Card>
  );
}
