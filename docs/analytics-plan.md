# Analytics Plan

Status: v0.2 (Playbook step A2; §2 core metrics built 2026-09-24 as `private.pilot_metrics`, see
`docs/release/operations.md` §6. The §3 events still wait for a tool choice). Principle: **measure behaviour, never money.** The analytics never see amounts,
descriptions, category names, goal names, reflections or anything else a user types.

## 1. Questions we need answered
1. Do visitors from Etsy and other sources join the pilot? (acquisition)
2. Do new users finish setup? (activation)
3. Do they come back and build the monthly habit? (retention)
4. Would they pay? (conversion)
5. Where do people get stuck? (UX)

## 2. Key metrics and definitions
| Metric | Definition |
|---|---|
| **Activated user** | Completed onboarding **and** added ≥ 3 transactions within 7 days of sign-up |
| **Monthly active planner** | Added or edited at least one transaction or plan line in the budget period |
| **Habit** (north star) | Completed the monthly check-in in 2 consecutive periods |
| Setup completion rate | `onboarding_completed` ÷ `signup_completed` within 7 days |
| Setup drop-off | Last `onboarding_step_viewed` for users who didn't complete |
| Pilot conversion | `pilot_payment_confirmed` ÷ `pilot_cta_clicked` |

## 3. Event schema
Properties are limited to those listed. **Forbidden in every event:** amounts, balances, rates, free text, category or goal names, email, name, IP address.

| Event | When | Allowed properties |
|---|---|---|
| `landing_viewed` | Landing page view | `source` (etsy, instagram, direct, other) |
| `pilot_cta_clicked` | "Join the founding pilot" clicked | `source` |
| `waitlist_joined` | Waitlist form submitted | `source`, `owns_planner` (yes, no) |
| `signup_completed` | Email verified | — |
| `onboarding_step_viewed` | Each step shown | `step` (1–6) |
| `onboarding_completed` | Review saved | `budget_style` (flexible, zero_based), `pay_frequency`, `has_debts` (bool), `has_goals` (bool) |
| `transaction_added` | Transaction saved | `kind` (income, outflow, refund), `via` (quick_add, form) |
| `plan_edited` | Planned amount changed | — |
| `calc_working_opened` | "How this was calculated" expanded | `card` (left_to_budget, remaining, goal, debt) |
| `debt_method_changed` | Snowball / avalanche toggled | `method` |
| `checkin_completed` | Monthly check-in saved | `period_index` (months since signup) |
| `export_generated` | PDF or CSV created | `type` (pdf, csv) |
| `debt_help_opened` | Debt-help card or link opened | — |
| `account_deleted` | Deletion completed | — |
| `pilot_payment_confirmed` | Verified PayFast notification (server-side event) | `plan` |

Growth funnel events (lead magnet, emails, upgrade moments, referrals) are proposed in `docs/l10/growth-funnel.md` §7 under the same rules.

## 4. Identity and consent
- Events use a random pseudonymous id per account, not the email or the database user id.
- Marketing pages: cookie-less, aggregate analytics without a consent banner, **if** the chosen tool supports that and legal review agrees. Otherwise ask for consent.
- In-app product analytics: disclosed in the privacy notice; users can opt out in Settings (S).
- Tool: ASSUMPTION, to be chosen at A3 from privacy-focused options that support EU or South African data processing and self-serve deletion. Check current terms before choosing.

## 5. Reporting
A monthly pilot report (a spreadsheet is fine) covering activation, habit, conversion, setup drop-off by step, and debt-help opens (watched as a wellbeing signal, not a growth metric).

## 6. What we won't do
- Session replay or heatmaps on app screens (they would capture C3 data).
- Share analytics with advertisers, or use ad pixels in the app.
- Use financial data to target marketing.
