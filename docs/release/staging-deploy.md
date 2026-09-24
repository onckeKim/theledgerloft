# Staging Deployment (release review B1)

Status: **ready for the owner to run.** Date: 2026-09-24.

Why the owner runs it: the build environment can't reach Vercel (the network policy blocks `vercel.com` and
`api.vercel.com`), and there's no Vercel connector or token here. Everything that doesn't need a Vercel login is
prepared:
- `vercel.json` (functions pinned to London, next to the database)
- `scripts/smoke-staging.mjs` (read-only checks, proven against a local production build: 23/23)
- the **Staging smoke test** GitHub workflow

**Plan:** staging = a Vercel project deploying `main`, using the existing hosted Supabase project `theledgerloft`
(eu-west-2, no users yet), with PayFast in **sandbox**. Production later gets its own Supabase project and Vercel
project.

Time: about 30 minutes, plus the PayFast sandbox steps if you want payments on staging now.

## 0. Before you start

- Merge PR #1 once CI is green, so `main` has the app. Vercel then deploys every push to `main`.
- Turn on MFA for your GitHub, Vercel, Supabase and PayFast accounts (release review R5).

## 1. Create the Vercel project

1. vercel.com → **Add New… → Project** → import `onckeKim/theledgerloft`.
2. Framework preset **Next.js**; root directory `/`; build and install commands left at their defaults.
3. Node.js version: **22.x** (the repo's `.nvmrc` says 22).
4. Before the first deploy, add the environment variables in step 2.
5. Deploy.
6. Note the URL, e.g. `https://theledgerloft.vercel.app`. A custom domain such as `staging.<your-domain>` is fine
   too; if you use one, use it everywhere below instead.
7. **Settings → Functions:** check the region shows **London (lhr1)**, from `vercel.json`. If Vercel shows another
   region ID for London, change `vercel.json` to match. It should be next to the Supabase region, eu-west-2.
8. **Settings → Deployment Protection:** the staging URL must be reachable without a Vercel login. PayFast has to
   reach `/api/payfast/notify`, and testers have to reach the app. Password-protect it later if you want, as long as
   the notify route stays reachable.

## 2. Environment variables (Vercel → Settings → Environment Variables, "Production")

| Variable | Value | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your staging URL, e.g. `https://theledgerloft.vercel.app` (no trailing slash) | No |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jjdetdabqbqktwkvodtk.supabase.co` | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_SEyf-u2YSLUE-KNgWGEW7A_RoatJg3R` | No, public by design |

**Payments on staging (optional now, needed for release blocker B2).** Add all four or none; the app refuses a
partial set:

| Variable | Value | Secret? |
|---|---|---|
| `PAYFAST_MODE` | `sandbox` | No |
| `PAYFAST_MERCHANT_ID` | From your PayFast **sandbox** account | No |
| `PAYFAST_MERCHANT_KEY` | From your PayFast sandbox account | **Yes** (mark Sensitive) |
| `PAYFAST_PASSPHRASE` | The passphrase you set in the PayFast sandbox dashboard (letters and numbers, 12+) | **Yes** |
| `PAYMENTS_DB_SECRET` | 32+ random characters you generate (e.g. `openssl rand -hex 32`) | **Yes** |

**Never set on staging:**
- a Supabase service-role or secret key (the app doesn't use one)
- any `E2E_*` value
- the local test secret

After changing variables, redeploy (Deployments → ⋯ → Redeploy).

## 3. Supabase settings (dashboard → project `theledgerloft`)

**Authentication → URL Configuration:**
- **Site URL:** your staging URL.
- **Redirect URLs:** add `https://<staging-host>/auth/callback` (and your custom domain's, if any).

**Authentication → Sign In / Providers → Email:**
- **Confirm email** on.
- Minimum password length **10** (the app checks this too).

**Authentication → Emails:**
- For real testers, set up **custom SMTP** with the email provider you choose (L10 §10). Supabase's own sender is
  meant for testing and has low sending limits; check Supabase's current guidance.
- The default email templates work with the app's `/auth/callback` route.

**Authentication → Rate Limits:** review the sign-in and email limits (US-04 AC1).

**Payments** (only with the step 2 payment values):
```sql
-- SQL editor. Use the same secret as PAYMENTS_DB_SECRET. Don't paste it anywhere else.
insert into private.app_secrets (name, secret_hash)
values ('payments', extensions.crypt('<PAYMENTS_DB_SECRET>', extensions.gen_salt('bf')))
on conflict (name) do update set secret_hash = excluded.secret_hash;
-- The pilot price is already set: R 50,00 for 90 days, open (D-043). Check with:
select code, price_cents, access_days, active from private.plans;
```

**Database → Backups:** see release blocker B6. The free plan's limits apply until the project is upgraded.

## 4. Smoke test

Either way below, all checks should pass. A 404 on the notify route just means payments aren't set up yet.

- **From GitHub (after PR #1 is merged):** Actions → **Staging smoke test** → Run workflow → enter the staging URL.
- **From your computer:**
  `node scripts/smoke-staging.mjs https://<staging-host> https://jjdetdabqbqktwkvodtk.supabase.co sb_publishable_SEyf-u2YSLUE-KNgWGEW7A_RoatJg3R`

It checks:
- the security headers, and a fresh CSP nonce per request
- the public pages
- that signed-out app, export and database access is refused
- that a forged payment notification is refused
- that Supabase requires email confirmation

## 5. Walk through it by hand

Use only your own email address and made-up numbers. Staging is not for real financial data yet.

1. Sign up → confirmation email arrives → the link lands you signed in.
2. `/app` sends you to `/app/join`. It says "not open yet" unless you set a price.
3. With payments set up: **Pay with PayFast** → PayFast sandbox → pay with its test method → the return page shows
   "Confirming your payment…" then "You're in". In Supabase, check the `payments` row is `complete` and an
   `entitlements` row exists.
   - This clears release blocker B2 for sandbox.
   - If the payment doesn't confirm, check Vercel's function logs for `payfast notify rejected: <reason>` and see
     decision D-038.
4. Setup → dashboard → add a transaction → budget → goals → debts → review → download the PDF and the data zip.
5. Settings: change your name, switch the theme, change the password, then **Delete my account**. The confirmation
   page shows, and signing in again fails.

## 6. Tell me

Send me the staging URL and the smoke test result, and I'll update the release review (B1, and B2 if you did step 3
with payments). If you'd like me to run checks against staging myself, add your staging host (and
`*.supabase.co`) to this environment's allowed network domains.
