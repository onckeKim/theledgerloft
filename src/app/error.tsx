"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Next.js 16 error boundary: `retry` re-fetches and re-renders the segment.
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Only the digest is logged: messages from server errors are generic in production and may hold data in dev.
    console.error("Unhandled error", error.digest ?? "(client error)");
  }, [error]);

  return (
    <main id="main" className="mx-auto max-w-[640px] px-4 py-24 text-center">
      <span className="ll-label">Something went wrong</span>
      <h1 className="mb-4 mt-2 text-h1">We couldn&apos;t load this page</h1>
      <p className="mb-8 text-body-lg text-fg-muted">
        Your data is safe. Check your connection and try again.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
