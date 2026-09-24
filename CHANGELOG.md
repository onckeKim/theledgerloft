# Changelog

All notable changes to this project are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- A2 project docs: product brief, personas, user journeys, MVP scope, non-functional requirements, data classification, threat model, analytics plan and release checklist (`docs/`).
- L4 calculation spec (`docs/l4/calculation-spec.md`), 43 test vectors (`docs/l4/test-vectors.json`), reference implementation and verifier (`scripts/calc-reference.mjs`, `scripts/verify-calc.mjs`).
- L3 screen prototypes in `design/screens/` (onboarding, dashboard, budget, transactions, goals and sinking funds, debts, reports and export, settings, states) with a shared app shell, plus `docs/l3/screens.md`.
- Shared component stylesheet `design/components.css` (used by the style guide and the screens).

### Changed
- Screen prototypes aligned with L4: debt interest totals R 3 061,62 / R 3 057,67, car fund reached in February, school fees 66%, valid progress-bar values when over plan, "last working day" month start removed.
- Brand tokens gain `sageText`, `goldText` and `warningText`. The light `label` token now uses `sageText` (D-010 accepted).
- Money format fixed as `R 1 234,56` (D-011 accepted).
- Ledger Loft Co store design tokens in `design/tokens/` (JSON, CSS, Kotlin, Swift), app accessibility layer `app.css`, token check script `scripts/check-tokens.mjs`, style guide `design/preview.html`, and L3 design system spec `docs/l3/design-system.md`.
- L1 positioning pack in `docs/l1/`: positioning, safety boundary and disclaimer, customer interview guide, landing page concept, founding pilot offer.
- Project operating plan (`docs/operating-plan.md`), decision log, changelog and `.env.example` placeholder.
