# MVP Scope

Status: v0.1 (Playbook step A2). Priority: **M** = must (MVP), **S** = should (MVP if time allows), **L** = later release, **X** = out of scope.
Acceptance criteria are measurable and are refined into user stories in L2.

## 1. MVP features

| # | Feature | Pri | Acceptance criteria |
|---|---|---|---|
| F1 | Sign-up, sign-in, sign-out, password reset | M | Email + password via Supabase Auth; email verification required before financial data is stored; reset link expires ≤ 1 hour; 5 failed sign-ins in 15 min triggers a delay |
| F2 | Guided onboarding (6 steps + welcome) | M | Each step autosaves; "Save and finish later" resumes at the same step; server-side validation on every step; error summary receives focus; completable with keyboard only; review shows left to budget matching L4 vector B1 logic |
| F3 | Monthly budget | M | Create or edit categories and planned amounts; period created from the previous plan; totals match L4 §4 exactly; negative left to budget allowed with neutral copy |
| F4 | Transactions (manual) | M | Add, edit, delete; kinds income / outflow / refund; amount 0,01–99 999 999,99; date assigns the period per L4 §3; list with search and category filter; add on phone ≤ 3 required fields |
| F5 | Dashboard | M | Stat cards, category progress, checklist, goals and debt snapshots; each calculated card has "How this was calculated"; loading, empty and error states |
| F6 | Savings goals | M | Create goal (target > 0, optional monthly); progress and estimate per L4 §5.1 |
| F7 | Sinking funds | M | Target + due period; status, short-by and needed-per-month per L4 §5.2 |
| F8 | Debts and payments | M | Add debts (balance, optional rate, minimum); record payments; snowball / avalanche toggle; estimates per L4 §6 labelled "Estimate" with assumptions |
| F9 | Monthly check-in and review | M | Opens in the last 3 days of a period and stays available after; plan vs actual, reflections, next-month actions |
| F10 | PDF monthly summary export | M | Generated server-side from one household's data only; A4, brand styled; audit event written; download link expires ≤ 10 minutes |
| F11 | Settings | M | Change budget setup (start day applies from the next period), profile, password |
| F12 | Data export (CSV zip) and account deletion | M | Export contains every user-entered record; deletion per NFR retention rule; both self-service |
| F13 | Disclaimer and debt-help signposting | M | Short disclaimer on every app page and export; debt-help card per L1 §5 |
| F14 | Light / dark theme | S | Follows system, user override remembered |
| F15 | Founding pilot payment (once-off, PayFast sandbox → live) | M | Server-to-server payment confirmation verified; duplicate notifications handled idempotently; access granted only after verified payment (L9) |
| F16 | Waitlist landing page | S | Email + consent only; no financial data |

## 2. Later releases (L)
- Partner / household sharing and roles (A-02)
- Recurring transactions and bill reminders
- Planner printables (weekly and monthly pages) matching Etsy designs
- Subscription billing (PayFast recurring, if the merchant setup supports it) and free / paid tiers (L9)
- Referral programme and email sequences (L10)
- CSV import of bank statements (**file upload only**, no bank login). Needs its own threat model update
- Native mobile apps (token files for Kotlin and Swift already exist)
- Other languages

## 3. Out of scope (X)
- Bank or account connections, screen scraping, open-banking APIs
- Investment tracking or recommendations; product comparisons; affiliate financial offers
- Credit scores, credit reports, credit repair
- Debt counselling, debt review, negotiation with creditors
- Tax calculations or tax advice
- AI-generated financial advice

## 4. MVP exit criteria
- All M features meet their acceptance criteria and the definition of done (`docs/operating-plan.md` §8).
- `node scripts/verify-calc.mjs` and the app's own calculation tests pass every L4 vector.
- The release checklist (`release-checklist.md`) is complete, with evidence.
