"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("App error", error.digest ?? "(client error)");
  }, [error]);
  return (
    <div className="py-8">
      <Alert tone="danger" live>
        <p>
          <strong>We couldn&apos;t load this page.</strong> Your data is safe. Check your connection
          and try again.
        </p>
      </Alert>
      <Button className="mt-6" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
