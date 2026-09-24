# Decision Log

Format: ID · date · decision · reason · status.

| ID | Date | Decision | Reason | Status |
|---|---|---|---|---|
| D-001 | 2026-09-24 | Follow the Claude Build Playbook (App 3: Ledger Loft) one step at a time, with a quality gate after each phase | Keeps changes small and verifiable | Accepted |
| D-002 | 2026-09-24 | MVP uses manual entry only, with no bank integrations | Lower security and regulatory risk; faster to validate | Accepted |
| D-003 | 2026-09-24 | Product is positioned as a budgeting and organisation tool, not financial advice | Avoids regulated-advice obligations | Accepted |
| D-004 | 2026-09-24 | Stack is Next.js + TypeScript, Supabase, Tailwind, Vercel, PayFast sandbox | Playbook baseline; to be confirmed in A3 | Proposed |
| D-005 | 2026-09-24 | Money is stored as integer minor units (cents), ZAR by default | Avoids floating-point rounding errors | Proposed |
| D-006 | 2026-09-24 | Primary MVP audience is existing and prospective planner buyers who already want to budget; people in acute debt distress are signposted to regulated help, not served | Keeps the product inside the organisation/education boundary | Proposed (confirm after interviews) |
| D-007 | 2026-09-24 | Debt features show snowball and avalanche as user-chosen orderings labelled "Estimate", never as a recommendation | Avoids advice and debt-counselling territory | Accepted |
| D-008 | 2026-09-24 | Pilot is a paid, capped founding offer using a once-off PayFast payment; prices set by owner | Paying pilots give real demand signal; once-off avoids early subscription integration | Proposed |
| D-009 | 2026-09-24 | App uses The Ledger Loft Co store design tokens unchanged; `design/tokens/tokens.json` is the source of truth, checked by `scripts/check-tokens.mjs` | App, store and planners read as one brand | Accepted |
| D-010 | 2026-09-24 | Add an app-only layer (`design/tokens/app.css`) with darker sage/gold/warning text tones, a navy focus ring and inkMuted control borders | Several store pairings fail WCAG 2.2 AA for small text and form controls. Approved 2026-09-24: `sageText`, `goldText`, `warningText` added to the brand tokens and the light `label` switched to `sageText` | Accepted |
| D-011 | 2026-09-24 | Money format is `R 1 234,56` (en-ZA: non-breaking space thousands separator, comma decimal, real minus sign) in the app and exports | Owner choice; matches the local convention | Accepted |
| D-012 | 2026-09-24 | Money is integer cents and rates are integer basis points; rounding happens only in the four places listed in the L4 spec (percent down, bar permille down, monthly interest half away from zero, needed-per-month up) | Exact, repeatable numbers across app, exports and tests | Accepted |
| D-013 | 2026-09-24 | Budget period is labelled by the month it ends in; month start day limited to 1–28 ("last working day" out of MVP) | Payday budgeting reads naturally; every month has the day | Accepted |
| D-014 | 2026-09-24 | Debt projection: fixed order per run, monthly interest then minimums then roll-over, 600-month cap, always labelled Estimate; user picks snowball or avalanche with no default recommendation | Simple, explainable, inside the L1 advice boundary | Accepted |
| D-015 | 2026-09-24 | MVP assumptions A-01…A-07 adopted as defaults (Etsy buyers first, single-person households, monthly period with 4 pay frequencies, PDF + CSV export, accounts created at build time, POPIA-aware region choice, English only) | Owner said go before answering; conservative defaults keep scope small and reversible | Proposed (owner to confirm) |
| D-016 | 2026-09-24 | Analytics never receive amounts, free text or names; no session replay in the app | Financial data is C3; keeps the trust promise | Accepted |
| D-017 | 2026-09-24 | PRD decisions P-1…P-7: sign up then pay; no manual accounts or transfers in MVP; goal, sinking fund and debt actions create matching budget transactions; debt interest never added automatically (user updates balance); new periods copy the last plan; categories with history are archived, not deleted | Keeps one consistent money model across budget, goals and debts; smallest MVP | Accepted |
