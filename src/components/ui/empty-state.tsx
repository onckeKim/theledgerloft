import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** One heading, one sentence, at most one primary action (PRD §7). */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <Icon aria-hidden="true" size={40} strokeWidth={1.5} className="mx-auto mb-3 text-sage" />
      <h2 className="mb-2 text-h3">{title}</h2>
      <p className="mx-auto mb-5 max-w-[40ch] text-fg-muted">{children}</p>
      {action}
    </div>
  );
}
