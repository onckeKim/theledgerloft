import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("my-2 h-3.5 animate-pulse rounded-sm bg-sunken", className)}
    />
  );
}
