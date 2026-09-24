# Supabase

Project: **theledgerloft** (`jjdetdabqbqktwkvodtk`), region **eu-west-2 (London)**, free plan. See decision D-022.

| Path | Purpose |
|---|---|
| `migrations/` | Schema changes, applied in filename order. Filenames match the versions recorded in the project |
| `rollback/` | Hand-written rollback for each migration (run newest first; the foundation rollback **destroys all data**) |
| `tests/rls_isolation.sql` | Tenant-isolation and schema checks. Always rolls back |
| `seed.sql` | **Synthetic** data for local development only. Never run it against a project with real users |
| `config.toml` | Local stack settings (mirrors production auth rules: email confirmation on, 10-character passwords) |
| `tests/setup_flow.sql` | Guided setup functions: atomic saves, replace-the-list behaviour, setup-only, cross-household safety |
| `tests/budget_flow.sql` | Monthly budget functions: period ranges, creating a month from the last plan, moving money, adding and removing categories, cross-household safety |
| `tests/goals_debts_flow.sql` | Goals, sinking funds and debts: paired records, no negative saved amounts, overpayment confirmation, linked-transaction guard, archive or delete, cross-household safety |
| `tests/review_export.sql` | Monthly check-in (limits, completion kept on edit, checklist tick) and exports (audited, never updated, own household only) |
| `tests/payments.sql` | Pilot payments: server-side price, users can't write payments or access, secret required, tampered amount and wrong merchant rejected, duplicate and out-of-order notifications, reused PayFast id |
| `tests/account_deletion.sql` | Deleting a user deletes the households they alone belong to, and keeps shared ones |

## Rules
- Every table in `public` has RLS **and** at least one policy; household tables use `private.is_household_member()`.
- Every reference between household tables is a composite foreign key `(id, household_id)`, so rows can't point at
  another household's data even if a policy were wrong.
- `anon` (signed-out) has no table privileges. There is no service-role key in the app.
- Money is `bigint` cents with range checks; rates are basis points (0–10 000); periods are `YYYY-MM`.
- After every migration: run the security and performance advisors, re-run `tests/rls_isolation.sql`, and regenerate
  `src/lib/supabase/database.types.ts`.

## Running the isolation tests
Run the whole of `tests/rls_isolation.sql` as the database owner (SQL editor or `psql`). It creates two synthetic
users, exercises every table as each of them and as a signed-out visitor, then raises
`RLS_TESTS passed=N failed=0` to roll everything back. Any failure is listed by name.
Last run (2026-09-24): `rls_isolation.sql` **60/60**, `setup_flow.sql` **17/17** (hosted project and local stack), plus a negative
control confirming a deliberately leaky policy is caught. Locally: `npm run db:test`.

## Payments (owner steps to open the pilot)

The hosted project starts with the pilot **closed**: no price and no payments secret. To open it (sandbox first):

1. **Price and length** (SQL editor): `update private.plans set price_cents = <cents>, access_days = 90, active = true where code = 'pilot';`
2. **Payments secret**: generate 32+ random characters, put it in the app's server env as `PAYMENTS_DB_SECRET`, and store
   its hash: `insert into private.app_secrets (name, secret_hash) values ('payments', extensions.crypt('<secret>', extensions.gen_salt('bf'))) on conflict (name) do update set secret_hash = excluded.secret_hash;`
   Never paste the secret anywhere else (chat, tickets, the repo).
3. **PayFast**: set `PAYFAST_MODE=sandbox`, `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY` and `PAYFAST_PASSPHRASE` (letters
   and numbers, set the same passphrase in the PayFast dashboard) in the server env, and `NEXT_PUBLIC_SITE_URL` to the
   public https address (PayFast must reach `/api/payfast/notify`).
4. Make a sandbox payment end to end and check the `payments` row is `complete` and an `entitlements` row exists.
5. Before live: re-check `src/lib/payments/payfast.ts` against PayFast's current docs (decision D-038), then switch to
   `PAYFAST_MODE=live` with the live merchant values.

To close the pilot again: `update private.plans set active = false where code = 'pilot';` (existing access is kept).

## Dashboard settings to check (not managed in code yet)
- Authentication → URL configuration: **Site URL** = the production URL; **Redirect URLs** include
  `http://localhost:3000/**` and `https://<production-domain>/**`.
- Authentication → Providers → Email: confirm email **on**; minimum password length **10** (the app also enforces it).
- Authentication → Emails: set up **custom SMTP** before the pilot (the built-in sender is heavily rate-limited).
- Leaked-password protection, if available on the plan.
