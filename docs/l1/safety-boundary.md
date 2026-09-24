# Safety Boundary and Disclaimer

Status: Draft v0.1 (Playbook step L1) · Date: 2026-09-24

> **Not legal advice.** This document sets product rules that keep The Ledger Loft on the organisation-and-education
> side of the line. The regulatory references below are **points to verify with a qualified South African legal or
> compliance professional** before launch. They are not conclusions.

## 1. Regulatory areas to verify before launch

| Area | Why it matters to us | Our design stance | Verify |
|---|---|---|---|
| Financial advice (FAIS Act and FSCA guidance) | Recommending financial products could count as regulated advice | We never recommend, compare or rank specific financial products or providers | Is our feature set (including debt ordering) purely factual or intermediary-free? |
| Debt counselling (National Credit Act, NCR) | Debt review and debt counselling are regulated activities | We only list the user's own debts and show mathematical orderings they choose. No restructuring, negotiation or "debt review" language | Wording of the debt features and the signposting copy |
| Personal information (POPIA) | Budget data is personal information and can reveal sensitive details | Minimal collection, purpose limitation, export and delete, Information Officer named, privacy notice | Privacy policy, Information Officer registration, operator agreements (Supabase, Vercel, PayFast, email provider) |
| Online sales (ECT Act, Consumer Protection Act) | Subscriptions sold online carry disclosure and cooling-off obligations | Clear pricing, cancel any time, written refund policy | Required disclosures and cooling-off handling for subscriptions |
| Marketing claims (Advertising Regulatory Board code) | Outcome claims can be misleading | No outcome promises (see section 3) | Landing-page copy review |

## 2. What the product does and does not do

| ✅ Does | ❌ Does not |
|---|---|
| Record income, expenses, debts, goals and sinking funds that the **user** enters | Connect to banks or read bank data (MVP) |
| Calculate totals, remaining amounts and progress | Recommend financial products, providers, loans, insurance or investments |
| Show debt orderings (snowball, avalanche) as **user-selected methods** with estimate labels | Tell the user which debt method they *should* use |
| Offer general educational explainers ("What is a sinking fund?") | Give personalised advice ("You should cancel X", "Consolidate your loans") |
| Signpost to regulated help when the user is in distress | Offer debt review, negotiation or credit repair |
| Export the user's own summary | Predict credit scores or guarantee any outcome |

## 3. Wording rules

These apply to UI copy, marketing, emails, Etsy listings and support replies.

**Never say** (or anything that implies it):
- "Save R___ a month", "Guaranteed savings", "Get out of debt by ___"
- "Improve your credit score", "Fix your credit"
- "Best way to pay off debt", "You should…" when talking about money decisions
- "Financial advice", "Financial advisor", "Debt counselling", "Debt review", "Debt relief"
- Invented statistics ("9 out of 10 users…") or testimonials that aren't real and consented

**Say instead:**
- "See where your money goes" · "Plan your month" · "Track progress toward goals you set"
- "Estimate", "If you keep paying R___, this estimate shows…"
- "Snowball orders debts from smallest balance; avalanche orders by highest interest rate. You choose."
- "Organise", "Plan", "Track", "Reflect", "Learn"

A future lint step (A3) can scan copy files for the "never say" list.

## 4. Disclaimer text

### Short (footer, onboarding, export footer)

> The Ledger Loft is a budgeting and planning tool. It does not provide financial, legal, tax or debt advice.
> Calculations are based on the information you enter, and projections are estimates.

### Full (Terms and About page)

> The Ledger Loft helps you organise and plan your money using information you enter yourself. We are not a
> registered financial services provider, debt counsellor or credit provider, and nothing in the app, our emails or
> our planners is financial, legal, tax or debt advice, or a recommendation to buy, sell or cancel any financial
> product. Calculations, including debt payoff orderings and projected dates, are estimates. They depend on the
> accuracy of your entries and do not include interest, fees or changes you have not entered. For advice about your
> personal situation, please speak to an appropriately registered professional.

`TODO(legal)`: have both versions reviewed. Confirm the business entity name to use.

## 5. Distress signposting

**When it shows:** the user opens "Need help?" at any time. It also shows gently (once per month, dismissible) when
total recorded minimum debt payments are more than the user's recorded income. That trigger is only a calculation,
and the copy makes no judgement.

**Copy:**
> It looks like your debt payments are more than the income you've entered. That's hard, and you're not alone.
> If you'd like support, independent organisations can help:
> - National Credit Regulator: information on debt counselling and your rights
> - A registered debt counsellor (you can check registration with the NCR)
> This app can keep helping you organise your numbers either way.

`TODO(research)`: confirm current official contact details and URLs at launch. Don't hard-code phone numbers from memory.

## 6. Checklist for every new feature

- [ ] Does it recommend a product, provider or specific financial action? If yes, redesign it.
- [ ] Does it show a projection? Label it "Estimate" and state the assumptions.
- [ ] Does the copy pass the wording rules?
- [ ] Does it collect new personal data? Update `docs/data-classification.md` (A2).
- [ ] Is negative or zero state copy neutral and free of shame?
