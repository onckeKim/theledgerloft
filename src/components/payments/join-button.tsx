"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/lib/payments/actions";
import { useHydrated } from "@/lib/use-hydrated";

/** Creates the pending payment on the server, then posts the signed form to PayFast (PRD US-06 AC2). */
export function JoinButton({ label }: { label: string }) {
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      {error ? (
        <Alert tone="danger" live className="mb-4">
          <p>{error}</p>
        </Alert>
      ) : null}
      <Button
        type="button"
        disabled={!hydrated || pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await startCheckout().catch(() => null);
            if (!r || r.status === "error") {
              setError(r?.message ?? "We couldn't start the payment. Please try again.");
              return;
            }
            const form = document.createElement("form");
            form.method = "post";
            form.action = r.action;
            for (const [name, value] of r.fields) {
              const input = document.createElement("input");
              input.type = "hidden";
              input.name = name;
              input.value = value;
              form.appendChild(input);
            }
            document.body.appendChild(form);
            form.submit();
          })
        }
      >
        {pending ? "Taking you to PayFast…" : label}
      </Button>
    </div>
  );
}
