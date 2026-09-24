# Changelog

All notable changes to this project are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- L6 guided onboarding: welcome, basics, income, fixed bills, everyday spending, debts and goals, review; autosave (only when a step is valid), error summaries that take focus, resume where you left off, review matching the L4 plan, "finish" creating the app-managed budget lines. Dashboard sends new users to setup and offers "Continue setup".
- Setup database functions (one atomic call per step, household from the session, setup-only, per-household lock) and `supabase/tests/setup_flow.sql` (17 checks).
- TypeScript L4 period and budget calculations tested against the vectors; rate parsing.
- Local Supabase stack (`npm run db:start`, `db:test`, `db:reset`), end-to-end setup test against it, and a CI job that runs both.
- A4 + L5: Supabase project (London); schema for households, income, categories, budgets, transactions, debts, goals, check-ins, exports and audit events with RLS on every table, composite cross-household foreign keys, sign-up provisioning and audit triggers; rollback scripts; RLS isolation test (60 checks, always rolls back); synthetic local seed; generated database types.
- Supabase Auth: sign-up with email confirmation, sign-in, password reset, email-link callback, sign-out; `proxy.ts` with per-request CSP nonce and session refresh; `getClaims()`-based data access layer.
- A3 app bootstrap: Next.js 16 + TypeScript + Tailwind 4 wired to the brand tokens; public marketing pages (landing from the L1 concept, pilot, legal drafts), auth placeholders, protected app shell (side nav, icon rail, phone tab bar) with per-page `verifySession()`; error, not-found and loading states; env validation (Zod); money formatting and parsing in cents; ESLint, Prettier, Vitest (62 unit tests), Playwright smoke tests with axe (26); CI workflow; `CLAUDE.md` project rules.
- L2 MVP PRD (`docs/l2/prd.md`): 40 user stories with acceptance criteria, route map, empty states, privacy requirements and release slices.
- A2 project docs: product brief, personas, user journeys, MVP scope, non-functional requirements, data classification, threat model, analytics plan and release checklist (`docs/`).
- L4 calculation spec (`docs/l4/calculation-spec.md`), 43 test vectors (`docs/l4/test-vectors.json`), reference implementation and verifier (`scripts/calc-reference.mjs`, `scripts/verify-calc.mjs`).
- L3 screen prototypes in `design/screens/` (onboarding, dashboard, budget, transactions, goals and sinking funds, debts, reports and export, settings, states) with a shared app shell, plus `docs/l3/screens.md`.
- Shared component stylesheet `design/components.css` (used by the style guide and the screens).

### Changed
- Links are underlined by default (accessibility); button-styled links opt out.
- Removed the temporary `APP_PREVIEW` mode (D-020). Every page now renders per request so the CSP nonce applies.
- Scripts in `scripts/` reformatted with Prettier (no behaviour change).
- Transactions prototype: "Transfer" replaced with "Refund"; journey J1 now signs up before paying (PRD P-1, P-2).
- Screen prototypes aligned with L4: debt interest totals R 3 061,62 / R 3 057,67, car fund reached in February, school fees 66%, valid progress-bar values when over plan, "last working day" month start removed.
- Brand tokens gain `sageText`, `goldText` and `warningText`. The light `label` token now uses `sageText` (D-010 accepted).
- Money format fixed as `R 1 234,56` (D-011 accepted).
- Ledger Loft Co store design tokens in `design/tokens/` (JSON, CSS, Kotlin, Swift), app accessibility layer `app.css`, token check script `scripts/check-tokens.mjs`, style guide `design/preview.html`, and L3 design system spec `docs/l3/design-system.md`.
- L1 positioning pack in `docs/l1/`: positioning, safety boundary and disclaimer, customer interview guide, landing page concept, founding pilot offer.
- Project operating plan (`docs/operating-plan.md`), decision log, changelog and `.env.example` placeholder.
