import { SHORT_DISCLAIMER } from "@/content/disclaimer";

export function DisclaimerFooter() {
  return (
    <p className="mt-16 border-t border-border pt-4 text-body-sm text-fg-muted">
      {SHORT_DISCLAIMER}
    </p>
  );
}
