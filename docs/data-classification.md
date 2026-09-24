# Data Classification

Status: v0.1 (Playbook step A2). References to POPIA are **for legal review**, not legal conclusions.

## 1. Levels

| Level | Meaning | Examples | Handling |
|---|---|---|---|
| **C0 Public** | Intended for anyone | Marketing pages, disclaimer, pricing | No restrictions |
| **C1 Internal** | Operational, not personal | Aggregate product metrics, feature flags | Staff and processors only |
| **C2 Personal** | Identifies a person | Name, email, sign-in timestamps, IP addresses in logs | Least privilege; deletable on request |
| **C3 Financial-personal** | A person's financial picture | Amounts, categories, transactions, debts, goals, reflections, exports | RLS by household; never in logs or analytics; encrypted in transit and at rest (provider default); export and delete |
| **C4 Secret** | Credentials and keys | Supabase service-role key, PayFast merchant key and passphrase, session tokens, password hashes | Server-side only; secret store; rotated; never in the repo, client bundle, logs or Claude conversations |

**Free text** (descriptions, category names, reflections, goal names) is **C3**. It may also contain **special personal
information** in POPIA terms (for example a medical category or a note about health or religion), so treat it as the most
sensitive C3: never index it for analytics, never log it, never send it to third parties.

## 2. Data inventory (MVP)

| Entity (L5) | Fields (main) | Level | Purpose | Retention |
|---|---|---|---|---|
| profiles | display name, email, created | C2 | Account | Until deletion |
| auth (Supabase) | email, password hash, sessions | C2 / C4 | Sign-in | Until deletion |
| households, memberships | name, member role | C2 | Access control | Until deletion |
| accounts_manual | name, type, opening balance | C3 | Tracking (no bank data). **Table created in L5, feature later** (PRD P-2) | Until deletion |
| income_items, expense_items | name, amount, frequency | C3 | Planning | Until deletion |
| categories, budgets, budget_lines | names, planned amounts, period | C3 | Budgeting | Until deletion |
| transactions_manual | date, amount, kind, category, description | C3 | Tracking | Until deletion |
| debts, debt_payments | name, balance, rate, minimum, payments | C3 | Debt overview | Until deletion |
| goals, goal_contributions, sinking_funds | names, targets, dates, amounts | C3 | Saving | Until deletion |
| monthly_checkins | reflections, actions | C3 (free text) | Review | Until deletion |
| exports | file (PDF or CSV), created, spec version | C3 | Downloads | **File deleted after 24 h** (ASSUMPTION); metadata until deletion |
| audit_events | actor, action, entity type and id, time, **no amounts** | C2 | Security and accountability | 12 months |
| payments (L9) | PayFast payment id, status, amount, plan | C2 (commercial) | Billing | As required for accounting records (legal to confirm) |
| waitlist | email, consent, source | C2 | Pilot invitations | Until the pilot opens + 6 months, or unsubscribe |

**Not collected:** ID numbers, bank credentials, account numbers, card numbers (PayFast handles card data), physical
address (unless needed for invoicing, then C2), date of birth, gender.

## 3. Processors (operators under POPIA) and locations

| Processor | Data | Location | Action |
|---|---|---|---|
| Supabase | C2, C3, C4 | eu-west-2, London (D-022) | Choose region; review Supabase DPA; document the cross-border transfer basis if outside South Africa (POPIA s72, for legal review) |
| Vercel | C2 in transit and logs | Global edge | Keep C3 out of logs; review DPA |
| PayFast | Payment and card data | South Africa | Card data never touches our servers |
| Email provider (to be chosen) | C2 (email, name) | TBD | No financial data in emails |
| Analytics (to be chosen) | C1 + pseudonymous ids | TBD | See `analytics-plan.md` |
| Claude / AI tools during development | **No real user data** | — | Only synthetic data in development conversations |

## 4. Rules
1. Collect a field only when an MVP feature needs it (N10).
2. C3 is readable only by members of the owning household, enforced by RLS and tested (L5).
3. Support staff don't browse C3. Access for a support case needs the user's explicit request and is logged as an audit event.
4. Seed, demo and test data is synthetic and marked as such.
5. Exports are generated per request, scoped to one household, short-lived and audited.
