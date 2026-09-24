# Privacy Notice and Terms: Review Notes

Status: drafts for the owner's review, 2026-09-24 (release review B5; D-048: the owner reviews the wording).
Pages: `/privacy` (`src/app/(marketing)/privacy/page.tsx`) and `/terms` (`src/app/(marketing)/terms/page.tsx`). Both keep
the "Draft for review" badge until you approve them.

**How the drafts were written:**
- They describe only what the app does today: the data it stores, cookies, processors and retention (D-046).
- They're checked against the code and `docs/data-classification.md`.
- They contain no legal conclusions. Everything below needs your judgement, or a professional's if you want one.
- These notes aren't legal advice.

## To fill in

1. **Contact email:** set `NEXT_PUBLIC_SUPPORT_EMAIL` in Vercel (all environments), then redeploy. Until then, both
   pages show "[contact email to be added]". The address isn't stored in the repo.
2. **Your name as the responsible person:** the notice says the owner is responsible but doesn't name you. POPIA
   expects the responsible party to be identifiable, so consider adding your full name ("run by …").

## Decisions only you can make

| # | Point | Where | Why it needs you |
|---|---|---|---|
| 1 | **Information Officer.** For a sole trader this is usually the owner. Consider registering with the Information Regulator | Privacy: "Who we are" | POPIA duty; check the Regulator's current guidance |
| 2 | **Data stored outside South Africa** (Supabase and Vercel in London). The notice says so plainly | Privacy: "Who helps us" | POPIA s72 sets conditions for cross-border transfers. Decide what basis you rely on, or move to a South African region if one becomes available |
| 3 | **Refund: 14 days, no questions** | Terms: "The founding pilot" | Check it against the ECT Act's cooling-off rules for online sales (E4). It's generous, but confirm nothing further is required |
| 4 | **How long payment records are kept** ("as long as the law requires") | Privacy: "How long we keep it" | Tax and accounting rules set a period. Confirm it, then state it |
| 5 | **Backups: up to 4 weeks** | Privacy: "How long we keep it" | True only if you keep 4 weekly copies (`docs/release/operations.md` §1.3). On the Free plan there are no automatic backups, so match the wording to what you actually do |
| 6 | **"We'll tell you" if something goes wrong** | Privacy: "Keeping it safe" | A promise; POPIA s22 also has notification duties. Keep it only if you'll follow it (`operations.md` §4.4) |
| 7 | **Minimum age** (none stated) | Terms: "Your account" | Decide whether to say 18+ |
| 8 | **Governing law and liability** (not included) | Terms | Liability limits and consumer rights (Consumer Protection Act) are a legal judgement. Add them only with advice |
| 9 | **Price in the terms** (R 50,00 for 90 days) | Terms: "The founding pilot" | Written in the page text. Update it if the price in `private.plans` changes |
| 10 | **The bonus planner and monthly feedback call** from the pilot offer | Not in the terms | Decide whether they're part of the deal or just goodwill |

## Before publishing

- Remove the "Draft for review" badge and the info box, and set the date.
- Update the date whenever the wording changes.
- Record the approval in `docs/decisions.md`.
