import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { FULL_DISCLAIMER } from "@/content/disclaimer";

export const metadata: Metadata = { title: "Disclaimer" };

export default function DisclaimerPage() {
  return (
    <article className="mx-auto max-w-[720px] px-4 py-16">
      <Badge tone="neutral">Draft for review</Badge>
      <h1 className="mb-6 mt-3 text-h1">Disclaimer</h1>
      {FULL_DISCLAIMER.map((p) => (
        <p key={p.slice(0, 24)}>{p}</p>
      ))}
    </article>
  );
}
