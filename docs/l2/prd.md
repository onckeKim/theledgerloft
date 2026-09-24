# MVP Product Requirements: The Ledger Loft Planner

Status: v0.1 (Playbook step L2) · Date: 2026-09-24 · Owner: Kim Oncke
Builds on: `docs/product-brief.md` (goals, assumptions A-01…A-07), `docs/mvp-scope.md` (features F1–F16),
`docs/l1/safety-boundary.md`, `docs/l3/` (design and screens), `docs/l4/` (calculations), `docs/threat-model.md`.

**Not in MVP:** bank connections, investment recommendations, credit scoring, automated debt counselling (section 9).

## 1. Product rules that shape every story

| # | Rule | Source |
|---|---|---|
| R1 | Every number is calculated exactly as `docs/l4/calculation-spec.md` says, and every calculated card offers "How this was calculated" | L4, L1 trust principle 4 |
| R2 | Projections are labelled **Estimate** with their assumptions | L1 |
| R3 | No copy recommends a financial product or tells the user what they *should* do with money | L1 §3 |
| R4 | Negative, zero and missed states use neutral, shame-free wording (`docs/l3/design-system.md` §10) | L3 |
| R5 | All input is validated on the server; the client never decides prices, plans, household or totals | Threat T5 |
| R6 | A user can only read and change data of households they belong to | Threat T1 |
| R7 | Money is integer cents; amounts entered 0,01 – 99 999 999,99 | L4 §1 |
| R8 | Every data screen has loading, empty, error and success states (section 7) | Definition of done |

## 2. Decisions made in this PRD

| ID | Decision | Why |
|---|---|---|
| P-1 | **Sign up and verify email first, then pay** for pilot access. Access is granted only when PayFast's server-to-server notification is verified | Simpler and safer than creating accounts from payment callbacks; the user always has an account for support, export and deletion |
| P-2 | **No manual account balances in MVP** (`accounts_manual` table exists but the feature is Later). So **no transfers**: transactions are income, spending or refund | Keeps MVP small; transfers only matter once accounts exist |
| P-3 | **Goal and sinking-fund "Add money"** saves a contribution **and** a spending transaction in the "Savings goals" or "Sinking funds" category. **"Take money out"** saves a withdrawal and a refund in that category | Keeps budget actuals and goal balances in step (L4 §4, §5) |
| P-4 | **"Record a payment"** on a debt saves a debt payment (reducing the balance) **and** a spending transaction in "Debt payments". Interest isn't added automatically; the user can **update the balance** from their statement | No invented interest; L4 §6 estimates stay estimates |
| P-5 | A new period's plan is **copied from the previous period's plan** the first time the user opens it. Editing a past period is allowed, with a "You're editing August" notice | Continuity (journey J2) |
| P-6 | Onboarding's income becomes **income items**; fixed bills and everyday spending become **categories with planned amounts** in the first period | One model after setup |
| P-7 | Categories with transactions can't be deleted, only **archived** (hidden from new plans, kept in history) | Reports stay correct |

## 3. Users and roles
- **Member** (MVP): the single person in their household (A-02). Owns and manages all household data.
- **Owner-operator** (the business): no in-app admin in MVP. Uses the payment provider and the database's payments and entitlements tables only, never household financial tables (`docs/data-classification.md` §4).

## 4. Route map

`[P]` public · `[A]` signed in and verified · `[E]` signed in, verified **and** has pilot entitlement.
Unauthenticated users hitting `[A]`/`[E]` routes are sent to `/sign-in?next=…`; `[A]` users without entitlement hitting `[E]` go to `/app/join`.

| Route | Access | Screen / purpose | Stories |
|---|---|---|---|
| `/` | P | Landing / waitlist | US-01 |
| `/pilot` | P | Founding pilot details | US-01 |
| `/privacy`, `/terms`, `/disclaimer` | P | Legal pages | US-40 |
| `/sign-up`, `/sign-in`, `/forgot-password`, `/reset-password` | P | Auth | US-02…US-05 |
| `/auth/callback` | P | Email verification and magic-link handler | US-03 |
| `/app/join` | A | Pilot offer and PayFast checkout start | US-06 |
| `/app/join/return`, `/app/join/cancel` | A | Return pages (show "Confirming your payment…"; never grant access themselves) | US-06 |
| `/app` | E | Dashboard (redirects to `/app/setup` until setup is complete) | US-20 |
| `/app/setup`, `/app/setup/[step]` | E | Onboarding: `welcome`, `basics`, `income`, `bills`, `spending`, `debts-goals`, `review` | US-10…US-16 |
| `/app/budget`, `/app/budget/[period]` | E | Monthly budget (`period` = `YYYY-MM`) | US-21…US-25 |
| `/app/transactions` (`?period=&category=&q=`) | E | Transactions list and add | US-26…US-29 |
| `/app/goals` | E | Goals and sinking funds | US-30…US-33 |
| `/app/debts` | E | Debts | US-34…US-37 |
| `/app/review/[period]` | E | Monthly check-in and review | US-38, US-39 |
| `/app/settings` (+ `/profile`, `/budget`, `/data`) | A | Settings; **data export and deletion work without entitlement** | US-41…US-45 |
| `POST /api/payfast/notify` | PayFast only | Payment notification (verified, idempotent) | US-07 |
| `GET /api/exports/[id]` | A (owner of export) | Redirect to a short-lived signed download URL | US-39, US-43 |

## 5. User stories and acceptance criteria

Format: **As a** user **I want** … **so that** …, then acceptance criteria (AC) as testable statements.
Priority matches `mvp-scope.md` (M = must, S = should).

### 5.1 Access and payment

**US-01 (S, F16) Join the waitlist.** As a visitor I want to leave my email so I hear when the pilot opens.
- AC1 Form asks for email, a consent checkbox (unticked by default), and optionally "Do you own a Ledger Loft planner?". Nothing else.
- AC2 Server validates the email; duplicate sign-ups show the same success message (no account enumeration).
- AC3 `source` comes from the landing URL tag only; there are no tracking pixels.

**US-02 (M, F1) Create an account.** As a pilot member I want an account so my plan is saved.
- AC1 Email + password (minimum 10 characters); a breached-password check if the auth provider supports it.
- AC2 A verification email is sent; unverified users can't reach `[A]` routes.
- AC3 Errors don't reveal whether an email is already registered.

**US-03 (M, F1) Verify email.** AC1 The link signs the user in and lands on `/app/join` (or `/app` if entitled). AC2 An expired link offers "Send a new link".

**US-04 (M, F1) Sign in and out.** AC1 5 failed attempts in 15 minutes adds a delay (provider rate limit). AC2 Sign-out clears the session on this device. AC3 The session cookie is HttpOnly, Secure and SameSite=Lax.

**US-05 (M, F1) Reset password.** AC1 The reset link expires in ≤ 1 hour and works once. AC2 The same confirmation message shows whether or not the email exists.

**US-06 (M, F15) Pay for pilot access.** As a verified user I want to pay for the founding pilot so I can use the planner.
- AC1 `/app/join` shows price, what's included, duration and refund terms (owner-supplied, `docs/l1/pilot-offer.md`).
- AC2 The server creates a pending payment record with the price from **server config**, then redirects to PayFast (sandbox or live chosen by environment).
- AC3 The return page shows "Confirming your payment…" and polls entitlement; it never grants access itself.
- AC4 A cancelled payment returns to `/app/join` with a neutral message.

**US-07 (M, F15) Confirm payment safely.** As the business I want access granted only for real payments.
- AC1 `/api/payfast/notify` verifies the notification per **current official PayFast documentation** (signature with passphrase, source validation, server-side confirmation) as implemented in L9.
- AC2 Amount and merchant id must match the pending record; otherwise the payment is marked `rejected` and no access is granted.
- AC3 Processing is idempotent on the PayFast payment id; duplicates change nothing and return success.
- AC4 A successful payment grants the `pilot` entitlement with start and end dates and writes an audit event.
- AC5 Tests cover a forged signature, a tampered amount, a duplicate and an out-of-order notification (threat T4).

### 5.2 Guided setup (onboarding)

**US-10 (M, F2) Understand what setup involves.** AC1 The welcome screen states the time estimate, "No bank logins, ever", that data can be exported or deleted, and the short disclaimer. AC2 "Start setup" goes to Basics.

**US-11 (M, F2) Set basics.** Currency (ZAR only, shown not chosen), pay frequency (monthly, every two weeks, weekly, varies), month start day (1–28), budgeting style (flexible default, zero-based).
- AC1 Values are saved on change; invalid values are rejected by the server with a field error.
- AC2 The first budget period is derived per L4 §3 from today and the start day.

**US-12 (M, F2) Add income.** One or more income items: name (1–60 characters), monthly amount (R7).
- AC1 A running total updates as the user types.
- AC2 A blank amount on submit shows the error summary with a link to the field.
- AC3 Items can be added and removed; at least 0 items is allowed (a user may skip), and the review notes "No income added yet".

**US-13 (M, F2) Add fixed bills.** Each becomes a category in group "Fixed bills" with a planned amount (P-6). Suggested starters (Housing, Electricity & water, Phone & data, Insurance, Medical aid, School fees) are **unticked suggestions**, not assumptions.

**US-14 (M, F2) Add everyday spending.** Same as US-13 for group "Everyday spending" (suggestions: Groceries, Transport, Personal & fun, Eating out).

**US-15 (S, F2) Add debts and goals (skippable).** A debt needs name, balance and minimum payment, with an optional rate. A goal needs name and target, with an optional monthly amount. A sinking fund needs name, target, due month and monthly amount.
- AC1 "Skip for now" continues without creating anything.
- AC2 Any debts create the "Debt payments" line planned at Σ minimums; goals and sinking funds create their lines planned at Σ monthly amounts (user can edit).

**US-16 (M, F2) Review and finish.**
- AC1 Shows section totals, income, planned and left to budget with its working (L4 §4); the values match `budgetSummary` for the entered data.
- AC2 If left to budget is below 0, the neutral over-planned message appears; finishing is still allowed.
- AC3 Finishing marks setup complete and opens the dashboard. "Edit" links return to the relevant step with data intact.
- AC4 Every step: "Save and finish later" is available, progress shows "Step n of 6", the flow works with keyboard only, and the error summary receives focus.

### 5.3 Budget and dashboard

**US-20 (M, F5) See my month at a glance.** AC1 Stat cards: income (planned), planned, left to budget (current accent). AC2 Spending card: spent so far vs planned plus up to 3 categories (over first, then least remaining). AC3 Goals snapshot (top 3 by nearest due or lowest percent) and debt snapshot (total, paid this period, next in chosen order with estimate). AC4 Monthly checklist (US-25). AC5 Every calculated value matches L4 and has "How this was calculated".

**US-21 (M, F3) Plan a month.** AC1 The budget page lists lines grouped Fixed bills / Everyday spending / Debts / Saving with planned, actual, remaining (L4 §4 status table). AC2 Planned amounts edit inline on desktop and in a sheet on phones; saved on blur; server-validated. AC3 Totals update without reload.

**US-22 (M, F3) Zero-based or flexible.** AC1 Flexible: left to budget is labelled "Unassigned" when above 0. AC2 Zero-based: when above 0 the page shows "Assign R X to reach R 0,00", with no nagging elsewhere. AC3 Either style: below 0 shows the over-planned message. AC4 Switching style never changes amounts.

**US-23 (M, F3) Manage categories.** Add, rename, move group, archive (P-7). AC1 Names are 1–40 characters and unique per household among active categories. AC2 A category with transactions can't be deleted; "Archive" is offered. AC3 A category without transactions can be deleted.

**US-24 (M, F3) Move money between categories.** AC1 From an over-plan category, "Move money" lets the user choose a source category and amount; both planned amounts change in one server transaction; the total planned is unchanged. AC2 The copy suggests nothing about which category to cut.

**US-25 (M, F5) Monthly checklist.** Default items: record income, pay fixed bills, add this week's spending, decide what to do with left to budget, monthly check-in. AC1 Items tick per period; ticking is saved. AC2 The user can hide default items (S: custom items later).

### 5.4 Transactions and categorising

**US-26 (M, F4) Add a transaction.** Kind (spending, income, refund), amount, description (optional, ≤ 80 characters), category (required for spending and refund; income may link to an income item), date (defaults to today, any date allowed).
- AC1 The period is assigned per L4 §3 from the date and the household's start day.
- AC2 On phones the add sheet has amount and category first and saves with 3 inputs or fewer.
- AC3 After saving, the dashboard and budget reflect the change on next view with no manual refresh.

**US-27 (M, F4) Edit or delete a transaction.** AC1 Delete asks for confirmation and offers undo for 10 seconds. AC2 Changing the date may move it to another period; the success message says so.

**US-28 (M, F4) Find transactions.** AC1 List grouped by date, newest first, 20 per page with "Show more". AC2 Filter by period and category; search description text (case-insensitive). AC3 Empty filter results offer "Clear filters".

**US-29 (M, F4) Categorise manually.** AC1 Uncategorised spending isn't possible (category required). AC2 Recategorising updates both categories' actuals. AC3 Income not linked to an income item counts in actual income.

### 5.5 Goals and sinking funds

**US-30 (M, F6) Create a savings goal.** Name, target (> 0), optional monthly amount, optional starting amount. AC1 Progress and estimate per L4 §5.1 (vectors G1–G4).

**US-31 (M, F7) Create a sinking fund.** Name, target, due month (from next month up to 10 years out), monthly amount, optional starting amount. AC1 Status, short-by, needed per month and reached-in per L4 §5.2 (S1–S8). AC2 The "short" copy is arithmetic only (R3).

**US-32 (M, F6/F7) Add or take out money.** AC1 Implements P-3; both records are created in one server transaction; the audit trail links them. AC2 "Take money out" can't make saved negative.

**US-33 (M, F6/F7) Edit, complete or delete.** AC1 Reaching the target shows "Goal reached" with no confetti or pressure to set a new one. AC2 Deleting a goal with contributions asks whether to keep its history (archive, default) or delete everything.

### 5.6 Debts

**US-34 (M, F8) Add a debt.** Name, current balance, minimum payment, optional yearly rate (0–100%), optional note. AC1 Rate blank means "Interest not included" everywhere it's used.

**US-35 (M, F8) Record a payment.** AC1 Implements P-4 in one server transaction. AC2 A payment larger than the balance asks to confirm, and the balance can't go below R 0,00. AC3 A balance of R 0,00 shows "Paid off" and the date.

**US-36 (M, F8) Update a balance from a statement.** AC1 Saves a balance adjustment with the date and optional note; it doesn't create a spending transaction.

**US-37 (M, F8) Explore payoff order.** AC1 Snowball / avalanche toggle (no default recommendation; last choice remembered). AC2 Table and summary per L4 §6 (vectors D1–D9), labelled Estimate with the assumptions text. AC3 A debt in `notCovering` shows the neutral "can't estimate" copy. AC4 The "Need help with debt?" card is always present on this page (L1 §5), and on the dashboard when Σ minimums > planned income.

### 5.7 Monthly review and export

**US-38 (M, F9) Monthly check-in.** AC1 Opens from 3 days before the period ends (dashboard checklist link) and stays available afterwards. AC2 Shows income, spent and set aside, left over, and plan vs actual with differences in words (L4 §4 worked example). AC3 Reflection prompts are optional free text (≤ 1 000 characters each) and next-month actions (≤ 5). AC4 Saving marks the period's check-in complete; it can be edited later.

**US-39 (M, F10) Download a monthly summary PDF.** AC1 Generated on the server from one household's data only; A4; brand styled per `docs/l3/screens.md` §7. AC2 Reflections are included only if "Include my reflections" is ticked. AC3 Contains the short disclaimer and the calculation spec version. AC4 The download link expires in ≤ 10 minutes; the file is deleted after 24 hours; an audit event is written. AC5 Generation takes ≤ 5 s p95 (N3).

### 5.8 Settings, privacy and data rights

**US-40 (M, F13) Read the disclaimer and privacy notice.** AC1 The short disclaimer is on every app page footer and every export. AC2 Legal pages are reachable signed out.

**US-41 (M, F11) Change budget setup.** Pay frequency, start day, style. AC1 A start day change applies from the next period, and the confirmation says which date.

**US-42 (M, F11) Update profile and password.** AC1 Changing email requires verification of the new address.

**US-43 (M, F12) Download all my data.** AC1 A CSV zip with one file per entity, containing every user-entered record. AC2 CSV cells starting with `= + - @` are escaped (T8). AC3 Available without pilot entitlement. AC4 Audit event.

**US-44 (M, F12) Delete my account.** AC1 Two-step confirmation (type "DELETE"), with an offer to download data first. AC2 Deletes all household data, storage files and the auth user; signs out; sends a confirmation email. AC3 Available without entitlement. AC4 Audit event kept without financial data (N11).

**US-45 (S, F14) Choose a theme.** AC1 Light, dark or system; remembered per device.

## 6. Calculation definitions
All definitions live in `docs/l4/calculation-spec.md` and aren't repeated here. The table maps screens to them.

| Screen element | L4 section | Vectors |
|---|---|---|
| Income, planned, left to budget, spent so far, left over, category remaining and bars | §4 | B1–B6 |
| Budget period and its label | §3 | P1–P7 |
| Goal percent and estimate | §5.1 | G1–G5 |
| Sinking fund status, short-by, needed per month | §5.2 | S1–S8 |
| Debt order, payoff estimates, total interest | §6 | D1–D9 |
| Money, rate and percent formatting | §7 | F1–F5, R1–R3 |

## 7. Empty states

Copy follows R4. Each has one primary action.

| Where | When | Copy | Action |
|---|---|---|---|
| Dashboard | Setup finished, no transactions | "Your plan is ready. Add your first spending to see it come alive." | Add transaction |
| Budget | Period has no lines (e.g. all archived) | "Nothing planned for this month yet." | Copy last month's plan / Add category |
| Transactions | None in period | "No transactions in September yet." | Add transaction |
| Transactions | Filter matches nothing | "Nothing matches these filters." | Clear filters |
| Goals | No goals | "No goals yet. Add something you're saving towards, big or small." | Add a goal |
| Sinking funds | None | "Sinking funds help with costs you know are coming, like school fees or December." | Add a sinking fund |
| Debts | None | "No debts added. If you have any, adding them helps you see the whole picture." | Add a debt |
| Review | Period not yet ended, before check-in window | "Your September review opens on 28 September." | Back to dashboard |
| Review | Past period with no data | "Nothing was recorded for this month." | — |
| Reports export | Export failed | "We couldn't create your PDF. Your data is safe. Try again." | Try again |

**Loading:** skeletons shaped like the final content, `aria-busy="true"`. **Error:** "We couldn't load … Your data is safe. Check your connection and try again." with Try again. There are no blank screens.

## 8. Privacy requirements
1. Collect only the fields in `docs/data-classification.md` §2; nothing else in forms.
2. C3 data is readable only by household members, enforced by RLS and tested (US-07 AC5 style tests for T1).
3. No C3 data in logs, analytics, emails or error reports (T9, `docs/analytics-plan.md`).
4. Export and deletion are self-service and don't need entitlement (US-43, US-44).
5. Exports are short-lived and audited (US-39 AC4).
6. The privacy notice names the Information Officer, processors and hosting region, and explains retention (N11) and user rights. `TODO(legal)`
7. Development, demos and seed data use synthetic data only (T14).

## 9. Out of scope (MVP)
From `docs/mvp-scope.md` §3, **excluded**: bank or account connections; investment recommendations; credit scoring or reports; automated debt counselling, debt review or negotiation; tax advice; AI-generated financial advice.
**Deferred to later:** partner sharing, manual account balances and transfers (P-2), recurring transactions, reminders, planner printables, subscriptions and free/paid tiers, referrals, CSV import of statements, native apps.

## 10. Release slices (build order)
| Slice | Stories | Playbook step |
|---|---|---|
| 0 Foundation | Project bootstrap, auth pages, legal page stubs | A3, A4 |
| 1 Data model | Schema, RLS, synthetic seed, types | L5 |
| 2 Onboarding | US-10…US-16 | L6 |
| 3 Budget and transactions | US-20…US-29 | L7 |
| 4 Goals and debts | US-30…US-37 | L7 |
| 5 Review and export | US-38, US-39, US-43 | L8 |
| 6 Payments | US-06, US-07 | L9 |
| 7 Account and polish | US-40…US-45, US-01 | L8/L9 |
