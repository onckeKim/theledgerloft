import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Label above, optional help, input, then error. Pass a stable `id`; help and error ids derive from it.
 * Inputs use 17px text so iOS doesn't zoom (design system §4).
 */
export function TextField({
  id,
  label,
  help,
  error,
  money,
  className,
  ...input
}: Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  help?: string;
  error?: string;
  money?: boolean;
}) {
  const describedBy =
    [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("mb-5", className)}>
      <label htmlFor={id} className="mb-1 block font-semibold">
        {label}
      </label>
      {help ? (
        <p id={`${id}-help`} className="mb-2 text-body-sm text-fg-muted">
          {help}
        </p>
      ) : null}
      <div className="relative">
        {money ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body-lg text-fg-muted"
          >
            R
          </span>
        ) : null}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          inputMode={money ? "decimal" : input.inputMode}
          className={cn(
            "h-12 w-full rounded-md border border-control bg-raised px-3 text-body-lg text-fg placeholder:text-fg-faint",
            money && "pl-8 tabular-nums",
            error && "border-2 border-negative",
          )}
          {...input}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-body-sm text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
