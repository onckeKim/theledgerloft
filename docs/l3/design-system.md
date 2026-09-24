# The Ledger Loft Design System (App)

Status: v0.1 (Playbook step L3, foundations) · Date: 2026-09-24
Built on **The Ledger Loft Co store tokens**, so the app matches the existing store and planners.

| File | Role |
|---|---|
| `design/tokens/tokens.json` | **Source of truth** (W3C design-token format), from the store plus 3 approved text tones (D-010). **Copy these 4 files back to the store system** |
| `design/tokens/tokens.css` | Web CSS variables, light and dark themes, base rules |
| `design/tokens/platforms/*.kt, *.swift` | Android and iOS equivalents (for a possible later native app) |
| `design/tokens/app.css` | App-only semantic tokens (focus, control border, positive/negative), see section 3 |
| `scripts/check-tokens.mjs` | Checks the four brand files agree and audits contrast. Run `node scripts/check-tokens.mjs` |
| `design/preview.html` | Visual style guide. Open it in a browser |

**Rule:** never hard-code a hex value, pixel size or font in app code. Always use a token. To change the brand,
change `tokens.json` in the store's system first, then re-copy all four files and run the check.

## 1. Feel

Calm, premium, trustworthy, like a well-made paper ledger. Cream paper, navy ink, sage and gold as quiet accents.
Serif display type for headings and big numbers; clean sans-serif for everything you read or type.
Gender-neutral, with no pastel-pink or "girl-boss" styling and no neon fintech gradients.

## 2. Colour

### Roles

| Token | Hex | Use | Don't |
|---|---|---|---|
| `navy` / `ink` | #1E2A38 | Text, headings, primary buttons, dark surfaces | |
| `navyDeep` | #141E29 | Full-bleed dark sections, dark theme base | |
| `navySoft` | #2A3641 | Raised cards in dark theme | |
| `cream` | #F7F4EE | Page background | **Never use pure white for the page** |
| `creamDeep` | #EFEBE2 | Table stripes, subtle fills, disabled surface | |
| white (`bg-raised`) | #FFFFFF | Cards and inputs sitting on cream | |
| `sage` | #7C9D8B | Decorative accents, chart fills, icons | Text of any size (2.71:1) |
| `sageDeep` | #5E7B6C | Labels at 14px bold / 18px and up | Small labels (4.23:1). Use `sageText` |
| `sageText` | #567062 | Small uppercase labels (the light `label` token) | |
| `gold` | #D4B16A | **One accent per view.** Rules, underlines, highlights on navy | Fill on cream; text on cream (1.86:1); focus ring on light |
| `goldDeep` | #A8853F | Gold-toned text at 24px and up (large) | Text below 24px (3.14:1). Use `goldText` |
| `goldText` | #816631 | Gold-toned text at any size | |
| `inkMuted` | #5C6A78 | Secondary text, helper text, **form control borders** | |
| `inkFaint` | #8A97A3 | Placeholders, disabled text only | Anything the user must read (2.72:1) |
| `line` / `lineStrong` | #D9D2C4 / #B9B0A0 | Decorative dividers and card borders | Input borders (not 3:1) |
| `success` / `danger` / `info` (+ `Bg`) | | Status text and alert backgrounds | Colour as the *only* signal |
| `warning` | #9C6B15 | Warning icons, borders, large text | Body text (4.23:1). Use `warningText` |
| `warningText` | #8E6113 | Warning message text | |

### Contrast audit (from `scripts/check-tokens.mjs`)

Most pairings pass WCAG 2.2 AA. These do **not** pass for normal-size text and are restricted:

| Pairing | Ratio | Needs | Fix (approved) |
|---|---|---|---|
| sageDeep label (11px) on cream | 4.23 | 4.5 | `sageText` #567062 (4.92), now the light `label` token |
| goldDeep text on cream | 3.14 | 4.5 | Large text only, or `goldText` #816631 (4.93) |
| warning on cream / warningBg | 4.23 / 4.02 | 4.5 | `warningText` #8E6113 (4.71 on warningBg) |
| gold focus ring on cream | 1.86 | 3 | `--ll-focus`: navy on light, gold on dark |
| line / lineStrong as input border | 1.37 / 1.96 | 3 | `--ll-control-border`: inkMuted (5.05) |
| inkFaint (tertiary) on cream | 2.72 | 4.5 | Placeholder and disabled only |

## 3. App additions (`design/tokens/app.css`)

**ACCEPTED (D-010).** The darker sage, gold and warning are now brand tokens (`sageText`, `goldText`, `warningText`)
in `tokens.json`. The variables below alias them so components have one semantic name.

| Token | Light | Dark | Why |
|---|---|---|---|
| `--ll-label-text` | #567062 | #D4B16A | Small uppercase labels |
| `--ll-accent-text-sm` | #816631 | #D4B16A | Gold-toned text under 24px |
| `--ll-warning-text` | #8E6113 | #D4B16A | Warning messages |
| `--ll-control-border` | #5C6A78 | #8A97A3 | Inputs, checkboxes, radios |
| `--ll-focus` | #1E2A38 | #D4B16A | Keyboard focus ring (2px, 2px offset) |
| `--ll-positive` / `--ll-negative` | success / danger | #8FC1A3 / #E59A8C | Money up/down, on/over budget |

## 4. Typography

| Style | Font | Size / line height | Use |
|---|---|---|---|
| display | Playfair Display 600 | 40 / 1.1 | Landing hero, onboarding welcome |
| h1 | Playfair Display 600 | 32 / 1.15 | Page title (one per page) |
| h2 | Playfair Display 600 | 24 / 1.2 | Section titles |
| h3 | Playfair Display 600 | 19 / 1.25 | Card titles |
| bodyLg | Inter 400 | 17 / 1.5 | Intro text, onboarding questions |
| body | Inter 400 | 15 / 1.5 | Default |
| bodySm | Inter 400 | 13 / 1.45 | Helper text, table meta |
| label | Inter 600, 0.16em, UPPERCASE | 11 / 1.3 | Card eyebrows, table headers |
| labelSm | Inter 600, 0.2em, UPPERCASE | 10 / 1.3 | Badges only |
| numeric | Inter 400, tabular | 15 / 1.4 | Every amount in tables and lists |
| numericLg | Playfair Display 600, tabular | 34 / 1.0 | Headline amount on a card |

Rules:
- Load Playfair Display (600) and Inter (400, 600) with `next/font` in A3, and self-host them.
- **Minimum body size in forms is 16px on mobile** so iOS doesn't zoom into inputs. Inputs use `bodyLg` (17px).
- Labels are 11px, so they use the `label` token (`sageText` on light, gold on dark), never `sage` or `sageDeep`.
- Headings are sentence case. Only `.ll-label` is uppercase.

## 5. Money display

- Currency: ZAR by default. Format with `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })`.
  **Decided (D-011): `R 1 234,56`** (non-breaking space as the thousands separator, comma for decimals, checked in Node 22).
  One shared formatter is used in the app and exports.
- Always `font-variant-numeric: tabular-nums` (`.ll-numeric`). Right-align amounts in tables.
- Negative amounts: `Intl` outputs a hyphen (`-R 250,00`); the shared formatter swaps in a real minus sign (−R 250,00) plus a word ("over", "short") or an icon. **Never colour alone.**
- Over budget uses `--ll-negative` with the text "R 250,00 over". Never "overspent!" or red-only styling (see microcopy).
- Estimates carry an "Estimate" badge (info style) wherever a projection appears.

## 6. Space, radius, borders, elevation, motion

- **Space:** 4-point scale `space-1…10` (4 → 128px). Card padding `space-5` (24). Mobile gutter `space-4` (16). Section gaps `space-7` (48).
- **Radius:** the store uses sharp, restrained corners. Cards and inputs `md` (4px), buttons `sm` (2px), badges `pill`. Don't use large rounded "app bubble" corners.
- **Borders:** `hairline` 1px for cards and dividers, `rule` 2px for table header underlines, `accent` 3px gold for the single highlighted element (for example the left edge of the current month card).
- **Elevation:** cards use `shadow-sm`; menus and popovers `md`; modals `lg`; `xl` for marketing mock-ups only.
- **Motion:** `fast` for hovers, `base` for panels, `slow` for page-level changes. Respect `prefers-reduced-motion` by switching to `instant`.

## 7. Breakpoints and layout

`sm` 480 · `md` 768 · `lg` 1024 · `xl` 1280. Mobile first.

| Width | Layout |
|---|---|
| < 768 | Single column, bottom tab bar (Home, Budget, Transactions, Goals, More), 16px gutters |
| 768–1023 | Two-column cards, top bar with collapsible side nav |
| ≥ 1024 | Fixed left side nav (240px), content max-width 1120px |

## 8. Components

| Component | Spec |
|---|---|
| **Primary button** | navy fill, cream text, radius sm, 44px min height, `label`-style text optional. Hover `navySoft`. On dark: gold fill, navy text (7.13:1) |
| **Secondary button** | transparent, 1px navy border, navy text |
| **Quiet button** | text only, underline on hover |
| **Destructive** | danger text and border; filled only inside a confirm dialog |
| **Card** | bg-raised (white) on cream, 1px `line` border, radius md, shadow-sm, padding 24. Eyebrow `.ll-label` then h3 |
| **Stat card** | eyebrow label + `numericLg` amount + bodySm context line ("of R 18 500,00 planned") |
| **Input** | white, 1px `--ll-control-border`, radius md, 48px height, 17px text; label above (never placeholder-only); helper text bodySm inkMuted; error text danger with icon |
| **Error summary** | top of the form, dangerBg, lists links to each field. Focus moves to it on submit |
| **Alert** | status Bg fill, 3px left border in the status colour, icon, text in ink. **Dark theme:** bg-raised fill (the light status Bgs glare on navy), status-coloured left border, text-primary |
| **Progress bar** | 8px track `creamDeep`, fill `sage` (on track), `--ll-negative` (over), with a text value beside it |
| **Amounts** | never wrap inside an amount (`white-space: nowrap`); the shared formatter's non-breaking spaces handle this in the app |
| **Table** | header `.ll-label` with a 2px `lineStrong` rule; rows 1px `line`; optional `creamDeep` stripes; amounts right-aligned tabular; on mobile, collapse to stacked cards |
| **Badge** | pill, labelSm, status Bg with status text. Dark theme: transparent with a `border-strong` outline |
| **Tabs / segmented** | underline style: active gets 2px navy (or gold on dark) under text |
| **Empty state** | h3 + one sentence + one primary action; line illustration in sage |

Icons: ASSUMPTION: Lucide (open-source, 1.5px stroke, 20px) to match the thin rules of the brand. Always paired with text or an `aria-label`.

## 9. Charts

- Few and quiet. Prefer a progress bar or a number over a chart.
- Series colours in order: `navy`, `sage`, `gold`, `info`, `inkFaint`. More than 5 categories → group into "Other".
- Planned vs actual: planned = outline or `creamDeep` bar, actual = `navy` fill.
- Direct labels on bars instead of legends where possible. Every chart has a text or table alternative ("Show as table").
- No 3D, no pies with more than 4 slices, no animated counters.

## 10. Microcopy

Plain, warm, never judging. Follows `docs/l1/safety-boundary.md`.

| Situation | ✅ Say | ❌ Don't say |
|---|---|---|
| Over budget | "Groceries is R 250,00 over plan this month. Want to move money from another category?" | "You overspent!" |
| Negative remaining | "You've planned R 400,00 more than your income. Adjust a category to balance." | "Budget failed" |
| Missed month | "Welcome back. Let's pick up from today." | "You missed 2 check-ins" |
| Debt estimate | "Estimate: at R 1 200,00 a month, this could be paid off around March 2028." | "You'll be debt-free by…" |
| Empty goals | "No goals yet. Add something you're saving towards, big or small." | "You have no savings" |

## 11. Screen inventory (flows to design next)

Each flow gets mobile and desktop layouts in the next L3 pass, using the components above:

1. **Onboarding:** welcome → currency and month start → pay frequency → budgeting style → income → fixed expenses → variable categories → debts (skippable) → goals (skippable) → review → done. Progress indicator, "Save and finish later" on every step.
2. **Dashboard:** month header, 3 stat cards (Income · Planned · Left to budget), category progress list, goals snapshot, debt snapshot, monthly checklist.
3. **Monthly budget:** category table, planned vs actual, inline edit.
4. **Transactions:** list with filter, add/edit sheet.
5. **Debts:** list, snowball/avalanche toggle (labelled "Estimate"), record payment.
6. **Goals and sinking funds:** cards with progress, contribution sheet.
7. **Reports:** monthly review and export preview (export styled like a printed Ledger Loft page).
8. **Settings:** profile, household, currency, data export and delete, plan and billing.

## 12. Tailwind mapping (for A3)

Tailwind will read the CSS variables, so the tokens stay the single source. Draft (Tailwind v4 `@theme`), to be
verified against the current Tailwind docs at bootstrap:

```css
@import "tailwindcss";
@import "../design/tokens/tokens.css";
@import "../design/tokens/app.css";
@theme inline {
  --color-bg: var(--ll-bg);
  --color-raised: var(--ll-bg-raised);
  --color-sunken: var(--ll-bg-sunken);
  --color-fg: var(--ll-text-primary);
  --color-fg-muted: var(--ll-text-secondary);
  --color-border: var(--ll-border);
  --color-control: var(--ll-control-border);
  --color-navy: var(--ll-color-navy);
  --color-sage: var(--ll-color-sage);
  --color-gold: var(--ll-color-gold);
  --color-positive: var(--ll-positive);
  --color-negative: var(--ll-negative);
  --font-display: var(--ll-font-display);
  --font-sans: var(--ll-font-body);
  --radius-sm: var(--ll-radius-sm);
  --radius-md: var(--ll-radius-md);
  --radius-lg: var(--ll-radius-lg);
}
```
