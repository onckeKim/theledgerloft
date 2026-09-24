# The Ledger Loft

A guided budgeting and financial organisation web app for South Africa, growing out of The Ledger Loft & Co's
downloadable planners. It is a planning and education tool, **not financial advice**. No bank connections.

## Status

Playbook steps done: A1, L1, A2, L2, L3, L4, **A3 (app bootstrap)**. There are no accounts or data storage yet; those
arrive with Supabase in A4. See [`docs/operating-plan.md`](docs/operating-plan.md).

## Getting started

Requires Node.js 20.9+ (22 recommended, see `.nvmrc`).

```bash
npm install
cp .env.example .env.local
npm run dev                                # http://localhost:3000
APP_PREVIEW=synthetic npm run dev          # also shows /app screens (development only)
```

## Checks

| Command | What it runs |
|---|---|
| `npm run check` | ESLint, TypeScript, Prettier, unit tests (Vitest), design-token check, calculation vectors |
| `npm run test:e2e` | Production build + Playwright smoke tests (desktop and phone), including axe accessibility scans |
| `npm run build` | Production build |

CI runs all of these on every pull request (`.github/workflows/ci.yml`).

## Project layout

```
src/app/(marketing)/   public pages: landing, pilot, legal
src/app/(auth)/        sign-in, sign-up, password reset (placeholders until A4)
src/app/(app)/app/     signed-in app; every page calls verifySession()
src/components/ui/     design-system components (tokens only)
src/components/shell/  app navigation: side nav, icon rail, phone tab bar
src/lib/               env validation, money (cents), auth data access layer
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
