# The Ledger Loft

A guided budgeting and financial organisation web app for South Africa, growing out of The Ledger Loft & Co's
downloadable planners. It is a planning and education tool, **not financial advice**. No bank connections.

## Status

Playbook steps done: A1, L1, A2, L2, L3, L4, A3, A4 + L5, L6, L7, L7b, L8, **L9 (pilot payments, sandbox-ready)**.
See [`docs/operating-plan.md`](docs/operating-plan.md).

## Getting started

Requires Node.js 20.9+ (22 recommended, see `.nvmrc`).

```bash
npm install
cp .env.example .env.local                 # fill in the Supabase URL and publishable key
npm run dev                                # http://localhost:3000
```

### Local database (Docker)

```bash
npm run db:start      # local Supabase: Postgres, Auth, REST, Mailpit (emails at http://127.0.0.1:54324)
npm run db:test       # SQL isolation and setup tests
npm run db:reset      # re-apply migrations and the synthetic seed (sam@example.test / Synthetic-seed-2026)
npm run db:stop
```

Point `.env.local` at `http://127.0.0.1:54321` and the local publishable key from `npx supabase status` to develop
without touching the hosted project. If Docker Hub isn't your default registry, prefix `db:start` with
`SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io`.
```

## Checks

| Command | What it runs |
|---|---|
| `npm run check` | ESLint, TypeScript, Prettier, unit tests (Vitest), design-token check, calculation vectors |
| `npm run test:e2e` | Production build + Playwright tests (desktop and phone) with axe scans; the setup flow runs when `E2E_SUPABASE_*` point at a local stack |
| `npm run db:test` | SQL tests in `supabase/tests` against the local stack |
| `npm run build` | Production build |

CI runs all of these on every pull request (`.github/workflows/ci.yml`).

## Project layout

```
src/app/(marketing)/   public pages: landing, pilot, legal
src/app/(auth)/        sign-in, sign-up, password reset (Supabase Auth)
src/app/auth/callback/ email link handler (verification, password reset)
src/app/(app)/app/     signed-in app; every page calls verifySession()
src/components/ui/     design-system components (tokens only)
src/components/shell/  app navigation: side nav, icon rail, phone tab bar
src/lib/               env validation, money (cents), auth data access layer, Supabase clients and types
src/proxy.ts           per-request CSP nonce, session refresh, early redirects
supabase/              migrations, rollbacks, RLS isolation tests, synthetic seed (see supabase/README.md)
design/                brand tokens (source of truth), style guide, screen prototypes
docs/                  plan, PRD, calculation spec, security, privacy, decisions
scripts/               token check, calculation reference and vector verifier
e2e/                   Playwright tests
```

## Design

The app uses The Ledger Loft & Co store design system. See [`design/`](design/) and
[`docs/l3/design-system.md`](docs/l3/design-system.md). Tailwind is wired to the tokens in `src/app/globals.css`.

## Calculations

Every number the app shows is defined in [`docs/l4/calculation-spec.md`](docs/l4/calculation-spec.md).

## Repository conventions

- `CHANGELOG.md`: notable changes
- `.env.example`: every environment variable, with no real values
- `docs/decisions.md`: decisions and their reasons
- `CLAUDE.md`: rules for AI-assisted development in this repo
