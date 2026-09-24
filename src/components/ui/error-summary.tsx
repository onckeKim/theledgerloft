"use client";

import { useEffect, useRef } from "react";
import { Alert } from "./alert";

/**
 * Error summary at the top of a form. Receives focus whenever `focusToken` changes (after a failed submit)
 * and links to each field so keyboard and screen reader users can jump straight to it.
 */
export function ErrorSummary({
  items,
  message,
  focusToken,
}: {
  items: { href: string; message: string }[];
  message?: string;
  focusToken: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusToken > 0) ref.current?.focus();
  }, [focusToken]);
  if (!items.length && !message) return null;
  const count = items.length;
  return (
    <div ref={ref} tabIndex={-1} className="mb-6 outline-none">
      <Alert tone="danger" live>
        <p className="font-semibold">
          {message ?? (count === 1 ? "There's 1 thing to fix" : `There are ${count} things to fix`)}
        </p>
        {count ? (
          <ul className="mb-0 mt-1 pl-5">
            {items.map((i) => (
              <li key={i.href}>
                <a href={i.href}>{i.message}</a>
              </li>
            ))}
          </ul>
        ) : null}
      </Alert>
    </div>
  );
}
