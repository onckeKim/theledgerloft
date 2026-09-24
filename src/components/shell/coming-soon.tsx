import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

/** Placeholder for screens whose slice isn't built yet (PRD §10). */
export function ComingSoon({
  eyebrow,
  title,
  icon,
  slice,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  slice: string;
  children: string;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <Card>
        <EmptyState icon={icon} title={`Arrives in build step ${slice}`}>
          {children}
        </EmptyState>
      </Card>
    </>
  );
}
