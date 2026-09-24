"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ExportResult } from "@/lib/export/actions";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Creates a short-lived export and starts the download (PRD US-39, US-43). With `reflectionsOption`,
 * reflections are left out unless the box is ticked.
 */
export function DownloadButton({
  label,
  failure,
  create,
  reflectionsOption,
}: {
  label: string;
  failure: string;
  create: (includeReflections: boolean) => Promise<ExportResult>;
  reflectionsOption?: boolean;
}) {
  const hydrated = useHydrated();
  const [include, setInclude] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      setError(null);
      setMessage(null);
      const r = await create(include).catch(() => null);
      if (r?.status === "ok" && r.url) {
        setMessage("Your download is starting. The link works for 10 minutes.");
        window.location.assign(r.url);
      } else setError(r?.message ?? failure);
    });

  return (
    <div>
      {reflectionsOption ? (
        <div className="mb-4 flex items-start gap-3">
          <input
            id="include-reflections"
            type="checkbox"
            checked={include}
            disabled={!hydrated}
            onChange={(e) => setInclude(e.target.checked)}
            className="mt-0.5 size-[18px] shrink-0 accent-[var(--ll-btn-bg)]"
          />
          <label htmlFor="include-reflections">
            Include my reflections
            <span className="block text-body-sm text-fg-muted">
              They&apos;re private to your household. Leave this off if you&apos;ll share the PDF.
            </span>
          </label>
        </div>
      ) : null}
      {error ? (
        <Alert tone="danger" live className="mb-4">
          <p className="mb-2">{error}</p>
          <Button type="button" size="sm" variant="secondary" onClick={run} disabled={pending}>
            Try again
          </Button>
        </Alert>
      ) : null}
      <Button type="button" onClick={run} disabled={pending || !hydrated}>
        {pending ? "Preparing…" : label}
      </Button>
      <p role="status" className="m-0 mt-3 min-h-5 text-body-sm text-fg-muted">
        {message}
      </p>
    </div>
  );
}
