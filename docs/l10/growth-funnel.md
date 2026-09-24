# Etsy-to-App Growth Funnel

Status: Proposal v0.1 (Playbook step L10) · Date: 2026-09-24
Builds on `docs/l1/` (positioning, safety boundary, landing concept, pilot offer), `docs/analytics-plan.md`,
`docs/user-journeys.md` (J1) and PRD P-1. Companion files: `etsy-policy-questions.md` (the gate) and
`support-templates.md`.

**Nothing here is built yet.** Everything that touches Etsy waits for the policy answers. Everything else waits for the
owner's choices in §10.

## 1. Principles

1. **An Etsy purchase is complete on its own.** A buyer never needs the app to use what they bought, and nothing
   suggests they do.
2. **Nobody is misled.** The app is a separate, paid product from the same maker. We say so plainly, with the price,
   before anyone signs up.
3. **Opt-in only.** We never add Etsy buyers to a list from order data. People join the waitlist or lead-magnet list
   themselves, with clear consent wording (question B1; POPIA review E1).
4. **Inside the safety boundary.** No advice, no outcome promises ("get out of debt by…"), no pressure in hard
   moments. All copy follows `docs/l1/safety-boundary.md`.
5. **Measure behaviour, never money.** Analytics follows `docs/analytics-plan.md`. No amounts, free text or names, and
   no ad pixels in the app.
6. **Easy to leave.** Unsubscribe in one click. Data export and deletion don't need a paid plan.

## 2. The funnel

| Step | Where | What happens | Depends on |
|---|---|---|---|
| 1 Discover | Etsy listing, download or insert; Instagram; word of mouth | A short, factual mention: "Prefer the maths done for you? There's a companion web app." | Etsy A1–A5, D1 |
| 2 Land | Landing page `/?src=etsy` (and `instagram`, `referral`, `direct`) | Hero, how it works, privacy promises, founding pilot offer with the real price | Owner sets the price (L9) |
| 3 Capture | Waitlist form, or the lead magnet (§3) | Email plus explicit consent. Optional "Do you own a Ledger Loft planner?" | E1, email provider (§10) |
| 4 Sign up | `/sign-up` → verify email | Account created. Source kept only as a coarse tag (§7) | Built (A4) |
| 5 Join | `/app/join` → PayFast | Pays for the pilot | Built (L9), owner opens the plan |
| 6 Activate | Guided setup → first transactions | Setup finished and 3 or more transactions in 7 days (analytics plan) | Built (L6, L7) |
| 7 Habit | Monthly check-in | 2 check-ins in a row: the north star | Built (L8) |
| 8 Refer | Founding member link (§6) | A friend lands with `?src=referral` | Proposal |

## 3. Lead magnet

**Recommendation: "The Monthly Money Check-in", a free 2-page printable** in the Ledger Loft planner style:
- Page 1: income, spent and set aside, left over, and plan vs actual with "under / over" in words.
- Page 2: the three reflection prompts and five next-month actions from the app's check-in.

Why this one:
- It's genuinely useful on paper, with no app needed.
- It mirrors the app's check-in exactly, so the app is the natural "do this for me" next step.
- It's a new free item, so it doesn't give away a paid Etsy product.

**Delivery:** on our own website (`/free/monthly-check-in`). Enter your email and tick a consent box that isn't
pre-ticked. You get the PDF by email and on the thank-you page (so it still works if email is slow). Two lists with
two separate consents:
- "Send me the check-in sheet": the one-off delivery. Legal to confirm whether this needs marketing consent.
- "Also send me occasional emails about The Ledger Loft planners and app": optional.

**Alternative:** a "Sinking Funds Starter" sheet listing common South African yearly costs (school fees, licence
renewals, December) with a blank "set aside per month" column. Useful, but less directly linked to the app.

**On Etsy:** only if C1 allows free items and A3/A5 allow the link. Otherwise the lead magnet lives only on our site.

## 4. Onboarding email sequence

**Rules for every email:**
- Plain, warm, short, one link.
- No amounts or other financial data (threat T9). Emails never quote the user's numbers.
- Every marketing email has a one-click unsubscribe.
- Transactional emails (verification, receipts, password reset) are separate and always sent.
- Sent from the chosen provider in §10. Nothing is sent until E1 and E3 are done.

| # | Trigger | Type | Subject | Purpose and core copy | Link |
|---|---|---|---|---|---|
| 1 | Lead magnet requested | Transactional (legal to confirm) | Your Monthly Money Check-in sheet | "Here's your sheet. Print it, or fill it in on screen. It works with any planner." One line about the app. | PDF |
| 2 | Waitlist joined | Transactional | You're on the list | What the pilot is, the price, when it opens, and how to leave the list | Landing |
| 3 | Pilot opens (to the waitlist, marketing consent only) | Marketing | The Ledger Loft pilot is open | "Places are open. Here's exactly what you get and what it costs." | `/sign-up?src=waitlist` |
| 4 | Verified but not paid, 2 days later | Marketing (consented) or skip | Your account is ready | "Your account is saved. If you'd like to join the pilot, it takes a minute." Sent once, no follow-ups. | `/app/join` |
| 5 | Paid, setup not started after 1 day | Service | Let's set up your first month | "Setup takes about 15 minutes. You can stop and come back; it saves as you go." | `/app/setup` |
| 6 | Setup done, fewer than 3 transactions after 3 days | Service | The easiest habit | "Add this week's spending in two minutes. Rough figures are fine." | `/app/transactions` |
| 7 | Check-in window opens | Service | Your [Month] check-in is open | "Take 10 minutes to look back and plan next month." | `/app/review/[period]` |
| 8 | After the 2nd check-in | Service | Two months in: how's it going? | Asks for the 20-minute feedback call (pilot commitment) | Booking link |
| 9 | Pilot ends in 14 days (US journey J5) | Service | Your pilot ends on [date] | What happens next: keep your data, download it, choose whether to continue. No pressure copy. | `/app/settings/data` |
| 10 | Pilot ended | Service | Thank you for being a founding member | Data kept per retention rule; how to export or delete | `/app/settings/data` |

**Never:**
- Emails triggered by money events, such as "you're over budget" or "debt payment due".
- Emails in the days after the debt-help card is shown.
- "Last chance" or countdown pressure.

## 5. In-product upgrade and feedback moments

The pilot is paid up front, so in-app "upgrade" means two things: joining (unpaid accounts) and renewing near the end.

| Moment | Where | Copy (draft) | Rules |
|---|---|---|---|
| Unpaid account | `/app/join` (built) | Offer, price, what's included, refund terms | Already the only place. No pop-ups elsewhere |
| 14 days before access ends | Dashboard banner, dismissible | "Your founding pilot ends on 30 November. Your data stays yours either way." + "See options" | Once per session; never on the same screen as the debt-help card |
| Access ended | `/app/join` with renewal copy | "Welcome back. Pick up where you left off." | Data never deleted because access ended (only by the retention rule) |
| After the 2nd completed check-in | Review page, below the saved message | "Would you do a 20-minute feedback call?" | Feedback, not a sale. Once only |
| After a PDF download | Status line | "Share the app with a friend?" (referral link) | Only once referral exists (§6). Once per month at most |

**Never:**
- A prompt while the user is over plan, sees a negative left-over, or has the debt-help card showing.
- A prompt on setup screens.
- A prompt inside exports (PDFs carry only the disclaimer).

## 6. Referral concept (founding members)

- **Who:** paying founding members only, from their second month (after their first check-in).
- **How:** a personal link, for example `/r/ab12cd`, shown in Settings → "Share The Ledger Loft".
  - The member shares it however they like.
  - **We never ask for a friend's email**, so we never hold data about people who didn't choose to give it to us.
- **What the friend gets:** the normal pilot page, with "Invited by a founding member". No hidden discount unless the
  owner decides one (§10).
- **What the member gets (owner to choose):**
  - Option A: one extra month of access per friend who pays, capped at 3.
  - Option B: a free Etsy digital planner, which depends on Etsy C2/C3 and how it's delivered.
- **Why no cash:** cash rewards are harder to administer and to word fairly.
- **Rules:**
  - The reward is added only after the friend's payment is **verified** by the payment notification, reusing the L9
    entitlement function.
  - Self-referral is blocked: same household, or the same payer email as the member.
  - The terms are published on one page and linked wherever the referral appears (E2).
- **Never:**
  - Referral asks inside Etsy (messages, listings, downloads) unless A1–A5 and B2 clearly allow it.
  - Anything tied to Etsy reviews (D2).
- **Data:**
  - `referral_codes(household_id, code)`
  - `referrals(code, referred_household_id, payment_id, rewarded_at)`
  - Both follow the same RLS pattern as payments: users read their own rows, and only server-side functions write.

## 7. Ethical analytics events (additions to `docs/analytics-plan.md`)

The analytics plan's rules apply unchanged:
- A pseudonymous id.
- No amounts, text, names, email or IP.
- No session replay.
- Cookie-less on marketing pages if legal agrees.

New events:

| Event | When | Allowed properties |
|---|---|---|
| `lead_magnet_requested` | Check-in sheet form submitted | `source`, `marketing_opt_in` (bool) |
| `email_link_clicked` | Arrives from an email link | `email` (the sequence number 1–10, not an address) |
| `upgrade_prompt_viewed` | A §5 moment is shown | `moment` (access_ending, access_ended, feedback, share) |
| `upgrade_prompt_clicked` | Its link is used | `moment` |
| `upgrade_prompt_dismissed` | It's closed | `moment` |
| `referral_link_copied` | Member copies their link | — |
| `referral_landing_viewed` | Someone lands via `/r/…` | — (the code isn't sent to analytics) |
| `referral_reward_granted` | Server side, after a verified payment | — |

**Source attribution:**
- `?src=etsy|instagram|referral|waitlist|direct` is read on the landing page.
- It's kept in a first-party, 30-day, essential-only cookie (legal to confirm the category) or in the sign-up form.
- It's stored once on the account as `acquisition_source`. Nothing more granular: no campaign ids, no third-party
  trackers.

**Monthly pilot report** (adds to analytics plan §5):
- Conversion by source.
- Lead magnet to sign-up.
- Email click rates by number.
- Upgrade prompt dismiss rate (a high rate means the prompt is annoying, so remove it).
- Referrals rewarded.

## 8. Support

Templates are in `support-templates.md`: welcome, payment not showing, refund, data export and deletion, struggling
with debt (signposting only), bug report, "is there an app?" from an Etsy buyer, and pilot ending.

**Before launch** (playbook commercial gate), the owner sets:
- A support inbox.
- A realistic reply time (product brief question 5).
- An incident note for "payments not confirming".

## 9. Build plan once cleared (L10b)

In order, each shipped only if its gate is green:

| # | Build | Gate |
|---|---|---|
| 1 | Landing page from `docs/l1/landing-page-concept.md` with the waitlist form (US-01), `?src` handling and `acquisition_source` on sign-up | E1 consent wording; email provider (E3) |
| 2 | Lead magnet page and PDF (reuses the L8 PDF style) | E1, E3 |
| 3 | Email sending: provider integration, the §4 sequence as scheduled jobs, unsubscribe, a suppression list | E1, E3 |
| 4 | Upgrade and feedback moments (§5), and access-ending logic | none beyond this doc |
| 5 | Referral codes and rewards (§6) on the L9 entitlement function | E2, owner reward choice |
| 6 | Analytics tool and the §7 events | Tool choice (analytics plan §4), legal on cookie-less |
| 7 | Etsy-facing pieces (download page, insert, listing copy) | Etsy A1–A5, B, C, D answered "yes" |

## 10. Decisions for the owner

1. Lead magnet: the check-in sheet (recommended) or the sinking funds sheet.
2. Email provider: needs a processor agreement, a known data location, and self-serve deletion. Check the current terms
   of 2–3 options.
3. Referral reward: extra month (recommended), free planner, or none for now.
4. Whether referred friends get anything. Recommendation: no, to keep it simple and honest.
5. Support inbox address and reply-time promise.
6. The 14-day pilot-ending notice. It's an assumption in journey J5; confirm it.
