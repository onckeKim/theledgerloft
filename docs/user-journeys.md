# User Journeys

Status: v0.1 (Playbook step A2). Screens refer to `design/screens/`. Numbers follow `docs/l4/`.

## J1: From Etsy purchase to first plan (P1)
| Step | User does | Product does | Screen |
|---|---|---|---|
| 1 | Buys or downloads a planner and sees the insert about the app (L10, subject to Etsy policy) | Link to landing page with source tag `etsy` | Landing |
| 2 | Creates an account, verifies email, then pays for the pilot (PayFast once-off) | Grants access only after the payment is confirmed server-to-server (L9, PRD P-1) | Sign-up, /app/join |
| 3 | Starts setup | Welcome: time estimate, no bank logins, disclaimer | onboarding-welcome |
| 4 | Enters basics, income, bills, spending, optional debts and goals | Autosaves each field; validates on the server; errors in a summary | onboarding-* |
| 5 | Reviews and finishes | Shows left to budget and its working; saves the first period | onboarding-review |
| 6 | Lands on dashboard | Checklist starts with "Add this week's spending" | dashboard |

**Success:** setup completed in one session; median time ≤ 15 minutes (measured in pilot). **Risk moment:** step 4 on a phone. Keep each step short.

## J2: The monthly cycle (P1, P2)
1. **Payday / period start:** new period created from last period's plan (copy planned amounts); checklist resets.
2. **During the month:** adds transactions (goal: under 20 seconds each on a phone); sees category progress; moves money between categories when one goes over.
3. **Period end:** monthly check-in opens in the last 3 days (ASSUMPTION): review plan vs actual, answer reflection prompts, pick next-month actions.
4. **Export:** downloads the PDF summary (optional).

**Success:** check-in completed for 2 consecutive months.

## J3: Falling behind and coming back (P1)
1. User doesn't open the app for 6 weeks.
2. On return: "Welcome back. Let's pick up from today." Past periods keep whatever was recorded; the current period starts from the last plan.
3. **No** streak loss, overdue badges or shame copy.

**Success:** returning users add a transaction within their first session back.

## J4: Understanding debts (P1)
1. Adds debts (balance, rate if known, minimum payment).
2. Views debts, toggles snowball / avalanche, reads the assumptions.
3. If minimums exceed income, the "Need help with debt?" card is visible; nothing blocks them.

**Success:** user can explain what the estimate means (pilot interview check); zero "advice" wording found in copy review.

## J5: Leaving (any)
1. Settings → Download all my data (CSV zip) → Delete account → confirm.
2. Account and data deleted per the retention rule (`non-functional-requirements.md`), and a confirmation email is sent.

**Success:** a deletion request is completed without contacting support.

## J6: Pilot to paid (later, L9)
1. Pilot period ends; user is told in advance by email and in the app (at least 14 days, ASSUMPTION).
2. Chooses a plan or leaves. Data is kept (read-only free tier) or exported and deleted. No surprise charges.
