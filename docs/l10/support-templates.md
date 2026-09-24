# Support Templates

Status: Draft v0.1 (Playbook step L10) · Date: 2026-09-24

Short replies for the support inbox. Adjust the tone to the person, but keep the facts and the boundaries.

**Rules:**
- Never ask for card numbers, bank logins, ID numbers or passwords.
- Never quote someone's figures back into email.
- Never give financial, legal, tax or debt advice (`docs/l1/safety-boundary.md`).
- For anything about money decisions, describe what the app does, not what the person should do.

Placeholders: `[Name]`, `[date]`, `[support email]`, `[reply time]`.

---

### S1 Welcome (after a pilot payment)
> Hi [Name], welcome to The Ledger Loft founding pilot, and thank you for joining this early.
> Setup takes about 15 minutes and saves as you go: [link to /app/setup]. If anything is confusing, reply here.
> Every question helps us make it better. We usually reply within [reply time].

### S2 "I paid but I can't get in"
> Hi [Name], thanks for letting us know, and sorry for the wait. Payments are confirmed directly by PayFast, which
> usually takes a minute or two but can occasionally take longer.
> Could you reply with the date you paid and the email address on your Ledger Loft account? Please don't send card
> details. We'll check it on our side and get back to you within [reply time].

*Internal:*
- Look up the `payments` row by the account's household.
  - `pending`: check PayFast's dashboard.
  - `rejected`: compare the amount and merchant.
- Never grant access by hand without a matching confirmed PayFast payment. Log what you did.

### S3 Refund request
> Hi [Name], of course. Founding pilot payments are refundable within the first 14 days, no questions asked. I've
> started the refund through PayFast; it usually shows in [PayFast/bank timeframe, owner to confirm].
> Your account and data stay available: you can download everything under Settings → Your data, or ask us to delete it.

*Internal:*
- Refund in PayFast.
- Record the refund date against the payment.
- End access on the refund date (process to build with L10b).
- Confirm the 14-day terms against the ECT Act (E4) before the pilot opens.

### S4 Download or delete my data
> Hi [Name], you can download all your data any time under Settings → Your data. It's a zip of spreadsheets.
> Account deletion is [coming soon / under Settings → Delete account]. Until then, reply "Please delete my account"
> from your account's email address and we'll delete it within [days], then confirm by email.

*Internal:*
- Verify the request comes from the account's email.
- Deleting the auth user deletes the household data (D-029).
- Keep the audit event (N11).

### S5 "I'm struggling with debt"
> Hi [Name], thank you for telling us. That's a lot to carry, and you're not alone.
> The Ledger Loft can help you see your numbers in one place, but we can't give debt advice. Independent help is
> available:
> - **National Credit Regulator:** information on your rights and on debt counselling.
> - **A registered debt counsellor:** you can check registration with the NCR.
>
> If you'd like help using the app's debt page, reply any time.

*Internal:*
- No recommendations of products, providers or methods.
- No "debt review" or "consolidation" language.
- Don't follow up with anything promotional.

### S6 Bug report
> Hi [Name], thanks, and sorry about that. Could you tell us which page you were on, what you tapped or typed just
> before, and what you expected to happen? A screenshot helps, but please cover any amounts or names first.
> We'll look into it and reply within [reply time].

### S7 Etsy buyer asks "Is there an app for this planner?"
Use this only as a reply to a buyer who asked, and only through a channel cleared in `etsy-policy-questions.md` (B2).
> Hi [Name], thank you for your order! Yes, there's a separate companion web app, The Ledger Loft, that does the
> planner maths for you. It's a separate paid product and isn't needed to use your planner. You can read about it at
> [landing URL].

### S8 Pilot ending (reply to "what happens now?")
> Hi [Name], your founding pilot access ends on [date]. Your data isn't deleted when access ends: you can download it
> any time under Settings → Your data. [Continuation options, once the owner decides them.]
