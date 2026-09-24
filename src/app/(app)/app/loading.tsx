import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="w-32" />
      <Skeleton className="mb-8 h-9 w-72" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Skeleton className="w-24" />
            <Skeleton className="h-8 w-40" />
          </Card>
        ))}
      </div>
    </div>
  );
}
