# The Ledger Loft — Project Operating Plan

Status: Draft v0.1 (Playbook step A1) · Owner: Kim Oncke · Date: 2026-09-24

## 1. Current repository state

| Item | State |
|---|---|
| Branches | `main` (initial commit), `claude/new-session-213b5r` (working branch) |
| Files | `README.md` only |
| Application code | None |
| Infrastructure | None provisioned from this repo yet (no Supabase project, Vercel project or PayFast merchant linked) |

Everything below is a plan, not a record of work done.

## 2. Product in one paragraph

The Ledger Loft is growing from downloadable Etsy planners into a guided budgeting web app for South African users.
It helps people **plan, organise and reflect** on their money: manual income, expenses, budgets, goals, debts and
sinking funds, plus exportable monthly summaries. It is **not financial advice**. It makes no promises about savings,
credit, investment or debt outcomes, and the MVP has **no bank integrations**.

## 3. Working rules (from Prompt A1)

1. No invented requirements, credentials, API behaviour, statistics or legal conclusions. Assumptions are labelled `ASSUMPTION:`.
2. Inspect the repository before each change and summarise what is there.
3. Each step makes the smallest production-minded change it needs, and only for the current step.
4. TypeScript, accessible responsive UI, server-side validation, secure secret handling and least-privilege access.
5. Service-role keys and payment secrets never reach client code or the repo.
6. Every DB change comes with a migration, rollback notes and RLS policies.
7. Every change runs lint, type-check and unit tests, and comes with a manual test checklist.
8. `README.md`, `CHANGELOG.md`, `.env.example` and `docs/decisions.md` stay current.
9. Each step ends with: files changed, commands run, test results, risks and the next step.

## 4. Baseline stack (ASSUMPTION: playbook recommendation, to confirm in A3)

| Concern | Choice |
|---|---|
| Web app | Next.js (App Router) + TypeScript |
| Styling / UI | Tailwind CSS + one component library (chosen in A3) |
| Data, auth, storage | Supabase (PostgreSQL with RLS, Auth, Storage) |
| Hosting | Vercel |
| Payments | PayFast, **sandbox first**; subscriptions only if the merchant setup supports them |
| Currency | ZAR by default, stored as integer cents |

## 5. Build sequence

One step per conversation turn. Each step ends with the A5 quality gate before moving on.

| # | Playbook step | Output | Gate to pass |
|---|---|---|---|
| 0 | **A1** Operating plan | This document, repo hygiene files | Owner reviews the plan |
| 1 | **L1** Positioning and safety boundary ✅ drafted (`docs/l1/`) | Positioning, disclaimer boundary, interview guide, pilot offer | Disclaimer wording reviewed; no outcome promises |
| 2 | **Validate** (manual, owner-led) | 5–10 interviews with planner buyers, pilot target | Real users confirm the problem |
| 3 | **A2** Project docs ✅ (assumptions A-01…A-07 in `docs/product-brief.md`) | `docs/product-brief.md`, personas, journeys, MVP scope, NFRs, data classification, threat model, analytics plan, release checklist | Measurable acceptance criteria exist |
| 4 | **L2** MVP PRD | PRD, user stories, route map, out-of-scope list | PRD approved |
| 5 | **L4** Calculation spec ✅ (`docs/l4/`, 43 vectors passing) | Formulas, rounding, edge cases, worked synthetic examples | Every formula has test vectors |
| 6 | **L3** Brand and UX system ✅ tokens, components and screen prototypes (`docs/l3/`, `design/screens/`) | Tokens, components, responsive flows, microcopy | WCAG 2.2 AA contrast checked |
| 7 | **A3** Repo bootstrap | Next.js app, lint, format, env validation, test setup | CI green |
| 8 | **A4 + L5** Supabase foundation and schema | Migrations, RLS, synthetic seed, generated types | Cross-household isolation tests pass |
| 9 | **L6** Guided onboarding slice | End-to-end onboarding | A5 gate |
| 10 | **L7** Budget dashboard | Dashboard and calculation unit tests | A5 gate |
| 11 | **L8** Reports and export | Monthly review and branded export with audit event | A5 gate |
| 12 | **L9** Pricing and PayFast sandbox | Server-side entitlements, verified ITN handling | Duplicate/forged notification tests pass |
| 13 | **L10** Etsy-to-app funnel | Lead magnet, emails, referral, ethical analytics | Etsy policy questions answered from official docs |
| 14 | **Release review** | Release-candidate report with go/no-go | Commercial launch gate (playbook section E) |

The plan put L4 before L3. In practice the L3 screens came first, so L4's test vectors were written to reproduce every number on the screens, and the screens were corrected where the spec's rounding differed.

## 6. Scope guardrails

**In MVP:** register, guided setup, manual income, expenses and transactions, manual categorisation,
zero-based or flexible monthly budget, savings goals, debts and payments, sinking funds, monthly check-in, summary export.

**Out of scope for MVP:** bank or account connections, investment recommendations, credit scoring, automated debt
counselling, AI features, native mobile apps.

## 7. Security and privacy baseline

- Financial data is treated as **personal and sensitive** (POPIA). We collect only what the features need.
- RLS on every household-owned table. Access goes through `household_memberships`.
- Server-side validation (schema-based) on every mutation. Client prices and plan values are never trusted.
- Audit events for exports, plan changes, deletions and payment state changes.
- Users can export and delete their own data.
- Seed and demo data is **synthetic only**.

## 8. Definition of done (applies to every feature)

Taken from playbook section E: acceptance criteria demonstrated · authz enforced in server and DB · inputs validated
with non-leaky errors · loading, empty, success and failure states · keyboard, labels, focus and contrast checked ·
risky logic tested · lint and type-check pass · docs and `.env.example` current · audit events for sensitive actions.

## 9. Open questions for the owner

A2 went ahead without answers. Each question now has a labelled default (A-01…A-05 in `docs/product-brief.md` §6), and the
remaining blocking questions are listed in §7 of that brief. Original questions:

1. **Audience:** mainly your existing Etsy planner buyers, or a wider SA audience from day one?
2. **Households:** is multi-person household sharing (partners) part of the MVP, or single-user first?
3. **Pay frequencies:** which ones are needed beyond monthly (weekly, fortnightly, 25th-of-month payday)?
4. **Export format:** PDF only, or PDF plus CSV / printable planner pages matching your Etsy designs?
5. **Accounts:** do you already have a Supabase, Vercel and PayFast merchant account, and under what business name?

## 10. Next recommended step

L1, A2, L3 and L4 are drafted. Next: **L2 PRD** (user stories), **owner review of the 5 blocking questions in `docs/product-brief.md`**, then **owner-led interviews** using
`docs/l1/interview-guide.md`. The A2 project docs follow once the questions above are answered.
