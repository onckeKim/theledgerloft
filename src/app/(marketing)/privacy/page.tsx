import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Privacy notice" };

// TODO(legal): publish the reviewed Privacy notice before launch (docs/release-checklist.md, section F).
export default function Page() {
  return (
    <article className="mx-auto max-w-[720px] px-4 py-16">
      <Badge tone="neutral">Draft for review</Badge>
      <h1 className="mb-6 mt-3 text-h1">Privacy notice</h1>
      <p className="text-fg-muted">
        The full privacy notice will be published here before accounts open.
      </p>
    </article>
  );
}
