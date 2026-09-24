# The Ledger Loft

A guided budgeting and financial organisation web app for South Africa, growing out of The Ledger Loft's
downloadable planners. It is a planning and education tool, **not financial advice**.

## Status

Planning. There is no application code yet. See [`docs/operating-plan.md`](docs/operating-plan.md) for the
build sequence and [`docs/decisions.md`](docs/decisions.md) for decisions made so far.

## Planned stack

Next.js (TypeScript, App Router) · Supabase (Postgres + RLS, Auth, Storage) · Tailwind CSS · Vercel · PayFast (sandbox first)

## Design

The app uses The Ledger Loft Co store design system. See [`design/`](design/) and [`docs/l3/design-system.md`](docs/l3/design-system.md).
Run `node scripts/check-tokens.mjs` after changing tokens.

## Calculations

Every number the app shows is defined in [`docs/l4/calculation-spec.md`](docs/l4/calculation-spec.md).
Run `node scripts/verify-calc.mjs` to check the test vectors.

## Repository conventions

- `CHANGELOG.md`: notable changes
- `.env.example`: every required environment variable, with no real values
- `docs/`: product, design, security and decision documents
