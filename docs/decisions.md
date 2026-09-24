# Decision Log

Format: ID · date · decision · reason · status.

| ID | Date | Decision | Reason | Status |
|---|---|---|---|---|
| D-001 | 2026-09-24 | Follow the Claude Build Playbook (App 3: Ledger Loft) one step at a time, with a quality gate after each phase | Keeps changes small and verifiable | Accepted |
| D-002 | 2026-09-24 | MVP uses manual entry only, with no bank integrations | Lower security and regulatory risk; faster to validate | Accepted |
| D-003 | 2026-09-24 | Product is positioned as a budgeting and organisation tool, not financial advice | Avoids regulated-advice obligations | Accepted |
| D-004 | 2026-09-24 | Stack is Next.js + TypeScript, Supabase, Tailwind, Vercel, PayFast sandbox | Playbook baseline; to be confirmed in A3 | Proposed |
| D-005 | 2026-09-24 | Money is stored as integer minor units (cents), ZAR by default | Avoids floating-point rounding errors | Proposed |
