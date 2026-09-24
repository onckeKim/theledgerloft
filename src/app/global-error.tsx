"use client";

import "./globals.css";

// Replaces the root layout when it fails, so it renders its own document.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  console.error("Unhandled root error", error.digest ?? "(client error)");
  return (
    <html lang="en-ZA">
      <body>
        <title>Something went wrong · The Ledger Loft</title>
        <main
          style={{ maxWidth: 640, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}
        >
          <h1>We couldn&apos;t load The Ledger Loft</h1>
          <p>Your data is safe. Please try again in a moment.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ minHeight: 44, padding: "0 24px", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
