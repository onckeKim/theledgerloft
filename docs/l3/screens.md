# Screen Specifications

Status: v0.1 (Playbook step L3, screens) · Date: 2026-09-24
Prototypes: `design/screens/` (open `design/screens/index.html` in a browser). Components and tokens: `docs/l3/design-system.md`.

The prototypes are **static HTML for design review**. They are not app code. The real screens are rebuilt as
React components in A3 and L6–L8. The prototypes still serve as the visual reference.

## Sample data

Every screen uses one made-up household ("Sam", single member, flexible budget, month starts on the 1st), so totals
agree across screens. Every number on the screens is reproduced by the L4 test vectors (`docs/l4/test-vectors.json`, run
`node scripts/verify-calc.mjs`). L4 rounds interest to the cent each month, which moved the prototype's interest totals by a few cents.

| Item | Value |
|---|---|
| Income | Salary R 19 500,00 + side income R 2 240,00 = **R 21 740,00** |
| Planned | Fixed R 8 350,00 · everyday R 5 400,00 · debts R 2 600,00 · sinking funds R 1 350,00 · savings R 800,00 = **R 18 500,00** |
| Left to budget | **R 3 240,00** |
| September actual (to date) | **R 18 140,00**, with Groceries R 250,00 over plan and R 360,00 remaining in total |
| Debts | Store card R 2 150,00 @ 21,00% (R 450,00) · Credit card R 8 900,00 @ 20,75% (R 1 200,00) · Personal loan R 14 600,00 @ 24,00% (R 950,00) = **R 25 650,00** |
| Snowball estimate | Paid off Mar 2027 / May 2027 / Sep 2027, interest R 3 061,62 (L4 vector D1) |
| Avalanche estimate | Loan Sep 2027, store card Mar 2027, credit card Jun 2027, interest R 3 057,67 (L4 vector D2) |
| August review | Income R 22 380,00, spent and set aside R 18 759,00, left over R 3 621,00 |

## Navigation

| Width | Pattern |
|---|---|
| < 768px | Top bar (logo, theme) + bottom tabs: Home · Budget · Transactions · Goals · More (Debts, Reports, Settings) |
| 768–1023px | Navy icon rail (72px) with hidden text labels, still read by screen readers |
| ≥ 1024px | Navy side nav (240px) with labels. The active item gets a gold left edge (the single gold accent) |

Every page has a "Skip to content" link, a single `h1`, landmarks (`nav`, `main`, `aside`) and the short disclaimer at the bottom.

## Screens

### 1. Onboarding (`onboarding-*.html`)
- **Steps:** Welcome → 1 Basics → 2 Income → 3 Fixed bills → 4 Everyday spending → 5 Debts and goals (skippable) → 6 Review.
  Steps 3–5 reuse the Income step's repeating-card pattern.
- **Always visible:** step name and count, progress bar, time estimate, Back, "Save and finish later".
- **Saving:** autosaves each field on blur. "Save and finish later" returns to the dashboard with a "Finish setup" banner.
- **Validation:** checked on the server when continuing. Errors appear in a summary at the top (it gets focus and links to each field) and next to each field.
- **Review:** section totals, "how this was calculated" for left to budget, an edit link per section. Nothing is final.
- **Negative balance:** if planned is more than income, the review says "You've planned R X more than your income. Adjust a category to balance." It never blocks finishing.

### 2. Dashboard (`dashboard.html`)
- Month switcher; stat cards (Income · Planned · Left to budget with the working shown).
- Spending card: total spent vs planned, then the 3 most useful categories (anything over plan first, then the least remaining). Links to Budget.
- Monthly checklist (editable, saved per month).
- Goals and sinking funds snapshot (top 3), debt snapshot (total, paid this month, next in the chosen order, estimate badge).
- **Empty (just finished setup):** the checklist becomes "Get started" with "Add your first transaction".

### 3. Budget (`budget.html`)
- Summary strip, budgeting-style notice, category table grouped Fixed / Everyday / Debts / Saving.
- Planned amounts edit inline (on tablet and phone, tapping a row opens an edit sheet). Actuals come from transactions and are not editable here.
- Remaining shows "R X over" in the negative colour with the word "over". Colour is never the only signal.
- Collapses into stacked rows under 600px.

### 4. Transactions (`transactions.html`)
- Grouped by date, search and category filter, 20 per page with "Show more".
- Add form: Spending / Income / Transfer, amount, description, category, date. It sits beside the list on desktop and opens as a full-screen sheet from a + button on phones.
- Money in shows "+R" in the positive colour. Money out shows "−R" in the normal text colour, because spending isn't bad.

### 5. Goals and sinking funds (`goals.html`)
- **Goals** are open-ended savings, optionally with a monthly amount; the estimate reads "Reaches R X around Month YYYY".
- **Sinking funds** have a due date and a target. The status badge is "On track" or "N months left", and when short: "R X short by Month at this rate. R Y a month would reach it."
- That last sentence is arithmetic, not advice. It shows the monthly amount that reaches the user's own target.

### 6. Debts (`debts.html`)
- Summary: total owed, monthly payments, estimated debt-free month (labelled Estimate).
- Snowball / Avalanche toggle (no default recommendation; the choice is saved). A table lists each debt with its estimated payoff month and the total interest estimate, with its assumptions stated.
- The "Need help with debt?" card is always present, calm and not triggered by shame. The copy follows `docs/l1/safety-boundary.md`. The NCR link will be confirmed at launch.

### 7. Reports (`reports.html`)
- Monthly review for a completed month: summary, plan vs actual with differences in words ("over", "under", "more"), savings and debt payments, reflection prompts, next-month actions.
- Export: an A4 PDF in the planner style (white page, navy rule, one gold accent, sage labels). The preview is on the right on desktop. Reflections are included only if the user chooses.
- Each export creates an audit event and uses only the current household's data (L8 requirement).

### 8. Settings (`settings.html`)
- Profile · Budget setup · Household (sharing later) · Plan (pricing to be confirmed) · Your data (download all as CSV zip, privacy notice, delete account with confirmation) · Help (support, debt help).

### States (`index.html`)
Every data card has **empty**, **loading** (skeleton, `aria-busy`) and **error** (reassuring message and "Try again") states as well as the filled one.

## Accessibility checks done on the prototypes
- Colours come only from tokens that pass `scripts/check-tokens.mjs`.
- Checked for horizontal scrolling at 390, 820 and 1280px, in light and dark.
- Touch targets are at least 44px. Inputs are 48px tall with 17px text.
- Progress bars have `role="progressbar"` and labels. Every amount also appears as text next to the bar.

## Open items
- `TODO(L1 interviews)`: validate the checklist items and reflection prompts with real users.
- `TODO(legal)`: NCR link and debt-help wording, privacy notice, deletion timeline.
- Icons are placeholders drawn to match Lucide's style. Swap in the Lucide package in A3.
