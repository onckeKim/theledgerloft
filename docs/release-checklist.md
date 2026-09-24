# Release Checklist

Status: v0.1 (Playbook step A2). Use for every production release; items marked **[launch]** apply to the first public
launch. Each tick needs **evidence** (link to a CI run, screenshot, test output or document).

## A. Product
- [ ] Every feature in this release meets its acceptance criteria (`mvp-scope.md`), demonstrated on staging
- [ ] Copy reviewed against `docs/l1/safety-boundary.md` (no outcome promises, no advice)
- [ ] Every projection shows "Estimate" and its assumptions
- [ ] Empty, loading, error and success states present on new screens

## B. Correctness
- [ ] App calculation tests pass all L4 vectors (`docs/l4/test-vectors.json`)
- [ ] `node scripts/verify-calc.mjs` passes (spec unchanged or updated with decision log entry)
- [ ] Money is integer cents end to end (type check + review)

## C. Security (`threat-model.md`)
- [ ] RLS enabled on every household table; cross-household tests pass (T1)
- [ ] No secrets in client bundle or repo; secret scan clean (T2)
- [ ] Payment notification tests pass: forged, tampered and duplicate (T4) [when payments change]
- [ ] Export isolation test passes (T6)
- [ ] CSP and security headers present (T7, T13)
- [ ] `npm audit` has no high or critical findings (T12)
- [ ] Logs and analytics checked for financial data leakage (T9)

## D. Accessibility and quality
- [ ] axe-core: zero serious or critical issues on changed routes (N5)
- [ ] Keyboard-only run through changed journeys
- [ ] Screenshots at 320, 390, 820 and 1280 px, light and dark; no horizontal scroll (N6)
- [ ] Lint, type-check and unit tests pass in CI

## E. Data and operations
- [ ] Database migration reviewed, with rollback steps written and tested on staging
- [ ] Backup exists from before the migration; restore rehearsal done this quarter (N12)
- [ ] Environment variables match `.env.example`; sandbox vs live credentials correct
- [ ] Error tracking and uptime monitor active
- [ ] `CHANGELOG.md` updated; `docs/decisions.md` updated for any new decision

## F. Launch gate [launch]
- [ ] Real target customers confirmed the problem and reviewed the MVP (L1 interviews + pilot)
- [ ] Pricing, cancellation, refund and support processes written and published
- [ ] Terms, privacy notice, disclaimer and debt-help wording reviewed by a qualified professional
- [ ] Information Officer named; processor agreements (Supabase, Vercel, PayFast, email, analytics) in place
- [ ] Hosting region and cross-border transfer basis documented (`data-classification.md`)
- [ ] Support inbox, incident response path and status message template ready
- [ ] Production secrets stored securely, with a rotation plan
- [ ] Go / no-go recorded with reasons (playbook final release-candidate review)
