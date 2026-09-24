import type { ReactNode } from "react";

/** "How this was calculated" (PRD R1): the inputs and the result, with the result on a ruled total line. */
export function Working({
  rows,
  total,
  summary = "How this was calculated",
  note,
}: {
  rows: [string, string][];
  total: [string, string];
  summary?: string;
  note?: ReactNode;
}) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-body-sm text-fg-muted underline underline-offset-4">
        {summary}
      </summary>
      <div className="mt-3 rounded-md bg-sunken px-4 py-3">
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-fg-muted">{k}</dt>
              <dd className="m-0 whitespace-nowrap text-right">{v}</dd>
            </div>
          ))}
          <dt className="border-t border-border-strong pt-1 font-semibold">{total[0]}</dt>
          <dd className="m-0 whitespace-nowrap border-t border-border-strong pt-1 text-right font-semibold">
            {total[1]}
          </dd>
        </dl>
        {note ? <p className="mb-0 mt-2 text-body-sm text-fg-muted">{note}</p> : null}
      </div>
    </details>
  );
}
