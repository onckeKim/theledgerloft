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
