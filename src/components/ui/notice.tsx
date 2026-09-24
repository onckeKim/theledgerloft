/**
 * Page-level confirmation after a redirect (?notice=…). Only fixed messages are shown, chosen by key,
 * so a crafted link can't put its own words on the page. The live region is always rendered.
 */
export function Notice<K extends string>({
  value,
  messages,
}: {
  value: string | string[] | undefined;
  messages: Record<K, string>;
}) {
  const text = typeof value === "string" && value in messages ? messages[value as K] : null;
  return (
    <p
      role="status"
      className="mb-5 mt-0 rounded-md border border-border bg-raised px-4 py-3 empty:hidden"
    >
      {text}
    </p>
  );
}
