@AGENTS.md

# The Ledger Loft: project rules

A guided budgeting web app for South Africa (Next.js 16, TypeScript, Tailwind v4; Supabase from A4).
Build follows `docs/operating-plan.md` one playbook step at a time.

## Before changing code
- Read the relevant Next.js guide in `node_modules/next/dist/docs/` (this version differs from older training data:
  `proxy.ts` not middleware, async `params`, error boundaries get `retry`, no `next lint`).
- Check `docs/l2/prd.md` for the story and acceptance criteria you are implementing.

## Non-negotiables
- **Money is integer cents** (`Cents` in `src/lib/money.ts`). Never floats, never `parseFloat`. Calculations follow
  `docs/l4/calculation-spec.md` and must pass `docs/l4/test-vectors.json`.
- **Every signed-in page calls `await verifySession()`** from `src/lib/auth/dal.ts` (enforced by a test).
- **Colours, type, spacing only from tokens.** Tailwind's default palette is removed on purpose; brand tokens live in
  `design/tokens/` (copied from the Ledger Loft & Co store; check with `npm run check:tokens`).
- **Copy follows `docs/l1/safety-boundary.md`:** no advice, no outcome promises, projections labelled "Estimate",
  neutral wording for negative states.
- **No real user data** anywhere in code, tests, fixtures or conversations. Synthetic only.
- No `dangerouslySetInnerHTML`; secrets only in server code; new env vars go in `src/lib/env.ts` and `.env.example`.

## Commands
`npm run dev` · `npm run check` (lint, types, format, unit tests, token and calc checks) · `npm run test:e2e` ·
`APP_PREVIEW=synthetic npm run dev` to view app screens before sign-in exists (development only).

## Keep current
`README.md`, `CHANGELOG.md`, `.env.example`, `docs/decisions.md`.
