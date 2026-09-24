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

## Dashboard settings to check (not managed in code yet)
- Authentication → URL configuration: **Site URL** = the production URL; **Redirect URLs** include
  `http://localhost:3000/**` and `https://<production-domain>/**`.
- Authentication → Providers → Email: confirm email **on**; minimum password length **10** (the app also enforces it).
- Authentication → Emails: set up **custom SMTP** before the pilot (the built-in sender is heavily rate-limited).
- Leaked-password protection, if available on the plan.
