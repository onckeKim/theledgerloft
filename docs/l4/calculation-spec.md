# Calculation Specification

Status: v1.0 (Playbook step L4) · Date: 2026-09-24

This spec defines every number The Ledger Loft shows. The app's calculation library (built in A3/L7) must implement it
exactly and pass every case in [`test-vectors.json`](test-vectors.json).

| File | Role |
|---|---|
| `docs/l4/calculation-spec.md` | This document: definitions, formulas, rounding and edge cases |
| `docs/l4/test-vectors.json` | 43 machine-readable cases (inputs + expected outputs) |
| `scripts/calc-reference.mjs` | A small reference implementation used **only** to prove the vectors are right. Not app code |
| `scripts/verify-calc.mjs` | Runs the vectors: `node scripts/verify-calc.mjs` → `43/43 vectors pass` |

**Boundary (L1):** these are calculations on figures the user enters. Nothing here recommends a product, a debt method
or an action. Every projection is labelled **Estimate** and states its assumptions. Interest is included only when the
user enters a rate, and fees are never added unless the user enters them.

## 1. Conventions

| Topic | Rule |
|---|---|
| Money | **Integer cents** (`R 21 740,00` = `2174000`). Never floating point. Stored as `bigint` in Postgres, handled as safe integers in TypeScript |
| Currency | One currency per household. MVP: ZAR only. No conversion |
| Amount limits | Each entered amount is `1 … 9 999 999 999` cents (R 0,01 to R 99 999 999,99). Targets and balances may be 0 where stated |
| Sign | Entered amounts are always positive. Direction comes from type (`income`, `outflow`, `refund`). Calculated values may be negative |
| Rates | Annual interest rate in **basis points** (20,75% = `2075`), from 0 to 10 000 (100%). Blank means 0, and the UI then says "Interest not included" |
| Periods | Budget periods are labelled `YYYY-MM` (section 3) |
| Time zone | `Africa/Johannesburg` (UTC+2, no daylight saving). A transaction belongs to the period of its **local date** |

## 2. Rounding

Most calculations are sums and differences of cents, so they're exact. Rounding happens only in these four places:

| Where | Rule | Why |
|---|---|---|
| 2.1 Percentages for display and progress | **Round down** to a whole percent; 100% only when complete | Never show "100%" before a goal is reached (vector G4) |
| 2.2 Bar widths | Round down to a whole permille (0–1000), capped at 1000 | Same reason |
| 2.3 Monthly interest | `round(balance × rateBp ÷ 120 000)` to the cent, **halves away from zero** | Deterministic; matches common bank rounding (vector D8) |
| 2.4 "Needed per month" | **Round up** to the cent | So following the amount actually reaches the target (vectors S6, S7) |

Division by zero never happens: every formula that divides has a guard (listed with it).

## 3. Budget periods

**Inputs:** household `monthStartDay` (1–28), a local date.

- A period runs from `monthStartDay` in one calendar month to the day before `monthStartDay` in the next.
- **Label:** the month the period **ends** in. For start day 1 that's the same month. For a payday start (for example the 25th), the period 25 Aug – 24 Sep is "September", the month the pay is mainly used in.
- Start days are limited to 1–28 so every month has one. "Last working day" is **out of scope** for MVP.
- A transaction dated on the start day belongs to the **new** period (vectors P1, P2).
- Changing `monthStartDay` applies from the next period. Past periods keep their dates.

| Vector | Date | Start day | Period |
|---|---|---|---|
| P1 | 2026-09-24 | 25 | `2026-09` (2026-08-25 → 2026-09-24) |
| P2 | 2026-09-25 | 25 | `2026-10` (2026-09-25 → 2026-10-24) |
| P3 | 2026-09-15 | 1 | `2026-09` (2026-09-01 → 2026-09-30) |
| P4 | 2028-02-29 | 1 | `2028-02`, leap day included |
| P5 | 2026-03-01 | 28 | `2026-03` (2026-02-28 → 2026-03-27) |
| P6 | 2026-12-26 | 25 | `2027-01`, crosses the year boundary |
| P7 | any | 31 | Rejected by validation |

"Month k from now" means `currentPeriod + k` periods (Sep 2026 + 17 = Feb 2028).

## 4. Budget calculations

**Inputs for one period:** planned income items, budget lines `{category, planned}`, and the period's transactions
`{kind, category, amount}`. Goal contributions, sinking fund contributions and debt payments are recorded as `outflow`
transactions in their budget category, so they count as actual spending of that category.

| Name (UI label) | Formula | Can be negative? |
|---|---|---|
| **Planned income** ("Income" on plan views) | Σ planned income items | No |
| **Actual income** | Σ `income` transactions | No |
| **Planned total** ("Planned") | Σ `lines.planned` | No |
| **Category actual** | Σ `outflow` − Σ `refund` in that category | Yes (refund larger than spending) |
| **Actual total** ("Spent so far", "Spent & set aside") | Σ category actuals, **including categories with no budget line** | Yes, in theory |
| **Planned balance** = **Remaining to budget** ("Left to budget") | Planned income − planned total | **Yes** |
| **Over-planned** | max(0, −planned balance) | No |
| **Category remaining** | Category planned − category actual | **Yes** |
| **Category over** | max(0, −category remaining) | No |
| **Plan remaining** | Planned total − actual total | Yes |
| **Actual balance** ("Left over" in reports) | Actual income − actual total | **Yes** |

"Planned balance" and "remaining to budget" are the **same number**. The spec defines it once. The UI calls it
"Left to budget", and in zero-based mode the aim is to bring it to R 0,00.

### Category status and bar

| Planned | Actual | Status | Bar (permille) | Copy |
|---|---|---|---|---|
| > 0 | < planned | `under` | floor(actual × 1000 ÷ planned) | "R X of R Y" |
| > 0 | = planned | `spent` | 1000 | "R Y of R Y" |
| > 0 | > planned | `over` | 1000 (negative colour) | "R Z over" |
| 0 | > 0 | `unplanned` | 1000 (negative colour) | "R Z not planned" |
| 0 | 0 | `empty` | 0 | "Not planned yet" |

Actual below 0 (refunds larger than spending) draws a 0 bar and shows the amount as "R X refunded".

### Zero and negative cases (copy follows `docs/l1/safety-boundary.md`)
- **Left to budget below 0:** "You've planned R X more than your income. Adjust a category to balance." It never blocks saving (vector B3).
- **Actual balance below 0:** "You've spent R X more than the income recorded this month." Neutral, with no red headline.
- **Nothing entered:** everything is R 0,00 and cards show empty states (vector B6).
- **Unbudgeted spending** is listed as "Not in your plan" and included in totals (vector B4).

### Worked example: prototype household, September 2026 (vector B1)
Planned income R 19 500,00 + R 2 240,00 = **R 21 740,00**. Planned total **R 18 500,00** across 10 lines.
Left to budget = 21 740,00 − 18 500,00 = **R 3 240,00**. Actual total so far **R 18 140,00**, so plan remaining **R 360,00**.
Groceries: 3 400,00 − 3 650,00 = −250,00, so status `over` and "R 250,00 over". Transport: bar floor(98 000 × 1000 ÷ 140 000) = 700.

### Worked example: August 2026 review (vector B2)
Actual income **R 22 380,00**, actual total **R 18 759,00**, so actual balance ("Left over") **R 3 621,00**.
Plan remaining −R 259,00, shown as "R 259,00 over". Report differences: spending lines show planned − actual
("R 90,00 under", "R 120,00 over"). The income line shows actual − planned ("R 640,00 more").

## 5. Savings goals and sinking funds

**Saved** = opening balance + Σ contributions − Σ withdrawals, as of today (including this period's contributions).

### 5.1 Savings goal progress (goals may have no deadline)
| Output | Formula | Guard |
|---|---|---|
| Percent | 100 if saved ≥ target, else floor(max(saved, 0) × 100 ÷ target) | target must be > 0 (vector G5) |
| Remaining | max(0, target − saved) | |
| Estimate | months = ceil(remaining ÷ monthly), reached in `currentPeriod + months` | Only when monthly > 0 and not complete; otherwise "Add a monthly amount to see an estimate" |

**Example (G1):** Emergency fund, R 6 400,00 of R 20 000,00 at R 800,00 a month.
32%. Remaining R 13 600,00 ÷ R 800,00 = 17 months, so the **estimate is Feb 2028**.

### 5.2 Sinking fund target
A sinking fund has a target and a **due period** (the period the money is needed in).

| Output | Formula |
|---|---|
| Contributions left | max(0, months from current period to due period − 1). This counts the periods after this one and before the due period |
| Projected at due date | saved + monthly × contributions left |
| Short by | max(0, target − projected) |
| Needed per month | 0 if funded; *none* if no contributions left; else **ceil**(remaining ÷ contributions left) |
| Reached in | current period + ceil(remaining ÷ monthly), shown only when on track |
| Status | `funded` (saved ≥ target) · `on-track` (short by 0) · `short` · `due-now` (due next period, not funded) · `past-due` |

| Vector | Fund | Saved / target | Monthly | Due | Result |
|---|---|---|---|---|---|
| S1 | School fees | 4 800 / 7 200 | 600 | Jan 2027 | 3 contributions (Oct–Dec), projected 6 600, **R 600,00 short**, needs **R 800,00** a month, 66% |
| S2 | December | 4 000 / 5 000 | 500 | Dec 2026 | 2 contributions, on track, **reached Nov 2026** |
| S3 | Car licence & service | 1 750 / 3 000 | 250 | Mar 2027 | 5 contributions, on track, **reached Feb 2027** |
| S4 | — | 1 000 / 3 000 | 250 | Oct 2026 | No contributions left: **due now**, R 2 000,00 still to find |
| S7 | — | 0 / 1 000 | 0 | Jan 2027 | 1 000,00 ÷ 3 = 333,333…, so needs **R 333,34** a month (rounded up) |

Copy for `short`: "R 600,00 short by January at this rate. R 800,00 a month would reach it." This is arithmetic on the
user's own target, not a recommendation.

## 6. Debts

**Inputs per debt:** current balance (cents), annual rate (bp, blank = 0), minimum payment (cents), created time.
**Plan input:** method (`snowball` | `avalanche`) and an optional extra monthly amount (default R 0,00).
The user picks the method. Neither is a default recommendation, so the UI remembers the last choice.

### 6.1 Ordering
| Method | Order by | Tie-break 1 | Tie-break 2 |
|---|---|---|---|
| **Snowball** | Balance, smallest first | Higher rate first | Oldest first |
| **Avalanche** | Rate, highest first | Smaller balance first | Oldest first |

The order is fixed from current balances each time the projection runs (vectors D3, D4).

### 6.2 Payoff projection (always labelled Estimate)
Monthly debt budget **B** = Σ minimum payments + extra. For each future month k = 1, 2, …:

1. **Interest:** for each open debt, `interest = round(balance × rateBp ÷ 120 000)` (rule 2.3), added to the balance.
2. **Minimums:** in order, pay each open debt `min(minimum, balance, money left of B)`.
3. **Roll-over:** give whatever is left of B to open debts in order until it runs out. This is how a paid-off debt's minimum moves to the next one (vector D9).
4. A debt whose balance reaches 0 in month k is **paid off in `currentPeriod + k`**.

Stop when every balance is 0 or after **600 months**. Outputs: order, per-debt payoff period and interest, debt-free
period, total interest.

**Assumptions shown to the user:** rates and payments stay as entered; interest is estimated monthly from the yearly
rate; fees, rate changes and missed payments aren't included. B is the same every month.

### 6.3 Edge cases
| Case | Behaviour | Vector |
|---|---|---|
| Minimum ≤ first month's interest | Listed in `notCovering`; that debt gets no estimate unless roll-over later pays it. Copy: "At this payment the balance isn't going down, so we can't estimate a payoff date." | D7 |
| Not paid off within 600 months | Payoff = none; "No estimate" | D7 |
| Rate blank or 0 | Interest 0; label "Interest not included" | D5 |
| Extra amount | Added to B, goes to the first debt in order | D6 |
| Balance 0 | Treated as paid off; excluded from order | — |

### 6.4 Worked example: prototype debts from September 2026 (vectors D1, D2)
Store card R 2 150,00 @ 21,00% (R 450,00) · Credit card R 8 900,00 @ 20,75% (R 1 200,00) · Personal loan R 14 600,00 @ 24,00% (R 950,00). B = R 2 600,00.

Month 1 interest on the store card: round(215 000 × 2 100 ÷ 120 000) = round(3 762,5) = **3 763c (R 37,63)**, a half rounded away from zero.

| Method | Order | Paid off | Debt-free | Total interest |
|---|---|---|---|---|
| Snowball | Store card → Credit card → Personal loan | Mar 2027 · May 2027 · Sep 2027 | Sep 2027 (12 months) | **R 3 061,62** |
| Avalanche | Personal loan → Store card → Credit card | Sep 2027 · Mar 2027 · Jun 2027 | Sep 2027 (12 months) | **R 3 057,67** |

## 7. Display formatting
| Value | Rule | Examples (vectors F, R) |
|---|---|---|
| Money | `R` + non-breaking space, thousands grouped by non-breaking spaces, comma decimal, always 2 decimals; negative uses a real minus sign U+2212 before the R | `R 21 740,00` · `−R 250,00` · `R 0,05` |
| Rates | 2 decimals, comma, `%` | `20,75%` · `0,00%` |
| Periods | Short month and year (`Sep 2026`) in the UI; long form (`September 2026`) in headings and exports | |
| Percent | Whole number, rounded down (rule 2.1) | `66%` |

Negative money in the UI is always accompanied by words ("over", "short", "refunded"), never shown by colour or sign alone.

## 8. Data and audit notes (for L5)
- Derived values (totals, balances, estimates) are **computed, not stored**. Exports record only the spec version they were built with; the file itself is built on download and not kept (D-033).
- Every stored amount is `bigint` cents with a `CHECK (amount > 0)`, and rates are `integer` basis points with `CHECK (rate_bp BETWEEN 0 AND 10000)`.
- `monthStartDay` has `CHECK (BETWEEN 1 AND 28)`.

## 9. Change control
Any change to a formula or rounding rule needs: an updated section here, updated or new vectors, `node scripts/verify-calc.mjs`
passing, an entry in `docs/decisions.md`, and a check of the screen prototypes' sample numbers.
