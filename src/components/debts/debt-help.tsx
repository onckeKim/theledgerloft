/** "Need help with debt?" (L1 §5, PRD US-37 AC4): signposting only, no advice. */
export function DebtHelp({ minimumsOverIncome = false }: { minimumsOverIncome?: boolean }) {
  return (
    <aside
      aria-labelledby="debt-help-h"
      className="rounded-md border border-border border-l-[3px] border-l-border-strong bg-raised p-6 shadow-sm"
    >
      <h2 id="debt-help-h" className="mb-2 text-h3">
        Need help with debt?
      </h2>
      <p className="m-0 text-fg-muted">
        {minimumsOverIncome
          ? "Your minimum debt payments are more than the income you've entered. That's hard, and you're not alone. "
          : "If repayments feel unmanageable, independent help is available. "}
        The National Credit Regulator explains your rights and how to find a registered debt
        counsellor. This app can keep helping you organise your numbers either way.
      </p>
    </aside>
  );
}
