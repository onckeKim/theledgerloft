# Product Brief: The Ledger Loft Planner

Status: v0.1 (Playbook step A2) · Date: 2026-09-24 · Owner: Kim Oncke
Inputs: `docs/l1/` (positioning, safety), `docs/l3/` (design), `docs/l4/` (calculations).

## 1. Summary
A guided budgeting web app for South Africa that turns The Ledger Loft & Co's downloadable planners into a living
monthly plan. Users type in their own income, bills, spending, debts and goals, and the app does the maths, keeps months
in sync and produces planner-style summaries. **It's a planning tool, not financial advice. No bank connections.**

## 2. Problem (hypothesis, to be tested in interviews)
People who like planning their money find the upkeep and arithmetic tedious. Totals drift, one missed month breaks the
habit, and debts and irregular costs are hard to see in one place.

## 3. Audience
Primary: adults in South Africa who already want to budget, starting with Ledger Loft & Co planner buyers (see `personas.md`).

## 4. Goals and success measures (first 6 months after pilot start)
Numbers are **targets the owner sets**, not forecasts. They are ASSUMPTIONS to adjust after interviews.

| Goal | Measure | Target |
|---|---|---|
| Prove people want it | Paid founding pilots | ≥ 20 |
| People get set up | Pilots completing onboarding within 7 days of sign-up | ≥ 60% |
| It becomes a habit | Pilots completing a monthly check-in in 2 consecutive months | ≥ 50% |
| People would miss it | "Very disappointed" if it went away (pilot survey) | ≥ 40% |
| People would pay | Pilots who say they'd continue at the planned price | ≥ 30% |
| Numbers are trusted | Calculation defects reported against the L4 spec | 0 open at launch |

## 5. Constraints
- Manual entry only; no bank integration, investment advice, credit scoring or debt counselling (L1).
- POPIA compliance; data minimisation; export and delete available from day one.
- Single developer-owner with Claude as the build partner. Keep the stack small (Next.js, Supabase, Vercel, PayFast).
- Visual identity is the Ledger Loft & Co store system (D-009, D-010).

## 6. Assumptions (conservative defaults until the owner answers)
| ID | Assumption | Effect if wrong |
|---|---|---|
| A-01 | Launch audience is **Etsy planner buyers first**; wider South African marketing later | Marketing and onboarding copy change; product unchanged |
| A-02 | **Single-person households in MVP.** The schema supports households so partner sharing can be added later without migration | Sharing moves into MVP: invite flow, roles and more RLS tests (+ roughly 2 slices) |
| A-03 | Pay frequencies: **monthly, every two weeks, weekly, varies**. The budget period is always monthly (start day 1–28) | Weekly budgeting periods would need a new L4 period model |
| A-04 | Exports: **PDF monthly summary + CSV data export**. Planner-page printables later | Extra export templates |
| A-05 | **No Supabase, Vercel or PayFast accounts exist yet.** They'll be created under the business name at A3/A4/L9 | None, apart from timing |
| A-06 | Hosting region: the nearest Supabase region that meets POPIA cross-border transfer requirements. See `data-classification.md` | Region choice |
| A-07 | English only (South African English) for MVP | Localisation later |

## 7. Blocking questions (maximum five)
1. **Legal:** who will review the disclaimer, privacy notice and debt-help wording before launch, and when?
2. **Business entity:** what's the legal name and contact address for the privacy notice and PayFast?
3. **Pricing:** what's the founding pilot price, and should it be once-off or monthly (`docs/l1/pilot-offer.md`)?
4. **Households:** confirm A-02 (single-person MVP).
5. **Support:** which email address, and what reply time can you realistically commit to?

## 8. Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Manual entry feels like too much work | Medium | High | Guided setup, quick-add, recurring items (later); test in pilot |
| Wording slides into advice | Medium | High | Safety boundary checklist on every feature; legal review |
| Data breach of financial data | Low | Very high | RLS, threat model, minimal data, no bank credentials |
| Calculation error erodes trust | Low | High | L4 spec + vectors, "show the working" on every number |
| Etsy policy limits the funnel | Unknown | Medium | L10: check official Etsy policy before any in-listing promotion |
| Owner capacity | Medium | Medium | One product in active build; small vertical slices |
