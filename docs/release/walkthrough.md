# Staging Walkthrough and Tester Script

Status: v0.1, 2026-09-24. For release blockers B1 (a sign-up walkthrough by hand on staging) and B8 (2–3 MVP
walkthroughs with people from the target group). Staging: `https://theledgerloft.vercel.app`.

**Use made-up numbers only.** Staging isn't for real financial data yet. Part C has a ready-made household to type in.

## Part A: before you start (once)

- [ ] Supabase: **Authentication → URL Configuration**. Set the Site URL to `https://theledgerloft.vercel.app`, and add
      `https://theledgerloft.vercel.app/auth/callback` to the Redirect URLs.
- [ ] Vercel: set `NEXT_PUBLIC_SUPPORT_EMAIL`, then redeploy.
- [ ] Emails: without custom SMTP, Supabase only emails members of your Supabase account. Sign up with that address.
      Testers need Resend (or another provider) first; see `staging-deploy.md` §3.

## Part B: your own walkthrough (about 45 minutes; do it on a computer, then again on your iPhone)

Tick each box, or note what happened instead. **Report anything odd** in the format in Part D.

### 1. Public pages
- [ ] The home page shows "The Ledger Loft & Co" in the header. On the phone it's on one line, with "Sign in" beside it.
- [ ] `/pilot`, `/privacy`, `/terms` and `/disclaimer` open. Privacy and terms show "Draft for review" and your
      contact email.

### 2. Sign up and sign in
- [ ] **Sign up** with your own email and a password of 10+ characters. You land on "Check your email".
- [ ] The confirmation email arrives, and its link signs you in. (If it lands on an error, the redirect URL in Part A
      is missing.)
- [ ] You land on the join page showing "Not open for payment yet". That's expected without PayFast.
- [ ] Give yourself test access (the SQL in `staging-deploy.md` §2b), then reload. You're taken to setup.

### 3. Guided setup (6 steps)
- [ ] **Basics:** monthly, start day 1, flexible.
- [ ] **Income, Fixed bills, Everyday spending:** enter the Part C household. Totals update as you type.
- [ ] **Debts and goals:** add the three debts, the emergency fund and the three sinking funds.
- [ ] **Review:** planned R 18 500,00 and left to budget R 3 240,00 (with the Part C numbers).
- [ ] "Save and finish later" works: sign out mid-setup, sign back in, and you continue where you stopped.
- [ ] "Finish and go to my dashboard" opens Home with "Your plan is ready".

### 4. Everyday use
- [ ] **Home:** the month at a glance, "How this was calculated" opens, and checklist ticks are remembered.
- [ ] **Transactions:** add spending, income and a refund. Edit one, delete one and press Undo. Filter by category.
- [ ] **Budget:** change a planned amount, use Move money, add a category and remove it. Try Next month.
- [ ] **Goals & funds:** add money, then take some out. Taking out more than is saved is refused politely.
- [ ] **Debts:** switch snowball and avalanche, record a payment, and open "Need help with debt?".
- [ ] Nothing gives advice or promises an outcome. Projections say "Estimate".

### 5. Month end and data
- [ ] **Reviews:** a month opens for a check-in 3 days before it ends. Save a check-in, then **Download PDF** (with and
      without your reflections).
- [ ] **Settings → Your data → Download all my data:** a zip of spreadsheets.

### 6. Settings and leaving
- [ ] **Profile:** change your name, switch appearance to Dark (it stays after a reload), and change your password.
- [ ] **Budget setup:** change the start day. The message gives the exact dates of the one-off transition month.
- [ ] **Delete my account** (last): type DELETE and your password. You land on "Account deleted", and signing in
      again fails.

### 7. On the iPhone (Safari), repeat 1–6 and also check:
- [ ] The bottom tabs work, and More opens the rest.
- [ ] No page scrolls sideways; text and buttons are big enough to tap.
- [ ] The PDF and the zip download and open.

## Part C: made-up household (the prototype household from the calculation spec; don't use real numbers)

**Income:** Salary R 19 500,00; Side income R 2 240,00 (total R 21 740,00).

| Fixed bills | Planned | Everyday spending | Planned |
|---|---|---|---|
| Housing | R 6 200,00 | Groceries | R 3 400,00 |
| Electricity & water | R 1 100,00 | Transport | R 1 400,00 |
| Phone & data | R 450,00 | Personal & fun | R 600,00 |
| Insurance | R 600,00 | | |

| Debt | Balance | Minimum | Interest |
|---|---|---|---|
| Store card | R 2 150,00 | R 450,00 | 21% |
| Credit card | R 8 900,00 | R 1 200,00 | 20,75% |
| Personal loan | R 14 600,00 | R 950,00 | 24% |

| Goal or sinking fund | Target | Per month | Saved so far | Needed by |
|---|---|---|---|---|
| Emergency fund (goal) | R 20 000,00 | R 800,00 | R 6 400,00 | — |
| School fees | R 7 200,00 | R 600,00 | R 4 800,00 | Jan 2030 |
| December | R 5 000,00 | R 500,00 | R 4 000,00 | Dec 2030 |
| Car licence & service | R 3 000,00 | R 250,00 | R 1 750,00 | Mar 2030 |

With these numbers, the Review step shows **planned R 18 500,00** and **left to budget R 3 240,00**, and Home shows the
same.

## Part D: reporting a problem

For each problem, send me one line in this format (a screenshot helps; cover any names first):

> **Where:** page or step · **Did:** what you tapped or typed · **Expected:** … · **Got:** … · **Device:** laptop or
> iPhone, browser

## Part E: tester walkthrough script (B8; 30 minutes, 2–3 people from your target group)

Use this after the interviews (`docs/l1/interview-guide.md`) and once Resend is set up, so testers get their emails.

**Before:**
- Send the staging link.
- Tell them to use made-up numbers. Give them Part C, or let them invent their own.
- Tell them to use any email they like; they can delete the account afterwards.
- Don't ask for their real finances, ID or bank details.
- Give their account test access (Part B.2) after they sign up.

**Say at the start:** "We're testing the app, not you. Please think out loud, and there are no wrong answers. I won't
help unless you're completely stuck."

**Tasks** (read one at a time; note where they hesitate, what they say, and whether they finish):
1. "Sign up and set up your budget for this month."
2. "You bought groceries for R 350 today. Record it."
3. "You'd like to save for a holiday. Set that up."
4. "Which debt does the app suggest paying off first, and why?"
5. "It's the end of the month. Look back at how the month went, and get a copy to keep."
6. "You've decided to stop using the app. Remove your information."

**Ask afterwards:**
- What was confusing or slow?
- Was anything missing that you expected?
- Did anything feel like advice, or like it was judging you?
- Would you use this instead of your current planner or spreadsheet? Why, or why not?
- On a scale of very, somewhat or not disappointed: how would you feel if you could no longer use it?

**Record per person** (no names in the notes): which tasks they finished without help, where they got stuck, quotes,
and their answer to the "disappointed" question. Send me the notes, and I'll turn them into fixes and the evidence
the release review needs for B8.
