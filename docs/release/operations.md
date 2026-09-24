# Operations Runbook

Status: v0.1, 2026-09-24. Covers release review blockers **B6** (backups and restore) and **B7** (monitoring, support
and incidents), pilot metrics (§6), and the playbook's commercial launch gate items "backups and restoration have been tested" and "a
support inbox, incident path and status communication template exist".

**What's proven and what isn't:**
- **Proven:** the backup and restore procedure (§1.4) works. It was rehearsed end to end on the local stack.
- **Representative:** the hosted project's privileges, policies and triggers match the local one exactly, so the
  local rehearsal stands in for it.
- **Owner decisions still open:** the Supabase plan (§1.2), the monitoring tools (§2.2), the support inbox and reply
  time (§3), and legal review of the data-exposure path (§4.4).

## 1. Backups and restore (B6)

### 1.1 Facts (Supabase docs, read 2026-09-24; re-check before relying on them)

- **Free plan** (this project today, D-022):
  - no downloadable backups
  - Supabase recommends regular `supabase db dump` exports kept off-site
  - a free project may be paused after 7 days of low activity (it can be restored from the dashboard)
- **Pro plan:**
  - daily backups, the last 7 days, restorable from **Database → Backups**
  - no pausing
  - access to Supabase support
- **Point-in-time recovery (PITR):**
  - a paid add-on on Pro and above, and it needs at least the Small compute add-on
  - restores to any second, with a worst-case recovery point of about 2 minutes
  - priced from about USD 100 a month for 7 days
- **A dashboard restore** replaces the whole project, and the project is offline while it runs.
- **Not in a database backup:**
  - Storage files (the app stores none; exports are built on download)
  - custom role passwords (the app has none)
- **What `supabase db dump` leaves out:**
  - Supabase's own `auth` and `storage` schemas (user accounts are included)
  - default privileges

  §1.4 covers both.

### 1.2 Recommendation (owner to decide, then record in `docs/decisions.md`)

| When | Backups | Recovery point (data you could lose) | Recovery time (estimate) |
|---|---|---|---|
| Now (no users, staging only) | Weekly `scripts/db-backup.sh`, off-site | 1 week | ~1 hour (§1.4) |
| **Before the first real user** | **Pro plan** (daily backups, no pausing) **plus** a weekly `db-backup.sh` copy kept off-site | 24 hours | ~1 hour |
| If the pilot grows or data changes fast | Add PITR | ~2 minutes | ~1 hour plus replay |

- **Why Pro before real users:** a paused project is an outage, and the free plan has no backups Supabase keeps
  for you.
- **Why also keep a weekly copy off-site:** it survives the loss of the Supabase account or the project, since
  deleting a project deletes its backups.
- **About the recovery times:** they're estimates for the steps around the restore (new project, env, redeploy).
  The database restore itself took 1 second for the synthetic data (§1.5).

### 1.3 Taking a backup

On a machine with Docker, the Supabase CLI and `psql`:

```bash
# Dashboard → Connect → Session pooler. Use a database password you keep in a password manager.
DB_URL='postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres' bash scripts/db-backup.sh
```

- **What it writes:** `backups/<UTC time>/`, holding `roles.sql`, `schema.sql`, `data.sql`, the migration history
  and `SHA256SUMS`.
- **The files are C2/C3 data** (`docs/data-classification.md`):
  - Encrypt them (for example an encrypted disk image or `age`), and keep them off-site: not in the repo (`backups/`
    is git-ignored), chat or email.
  - Keep 4 weekly copies and delete older ones, unless the retention decision (R3) says otherwise.
- **Deleted accounts:** a deleted account's data stays in the older backups until they age out.
  - Say so in the privacy notice (B5, legal to confirm the wording).
  - After a restore, re-apply any deletions made since the backup (§4.3).

### 1.4 Restoring

Restore into a **new** project, never over the live one. Then switch the app to it.

1. **Create the new project** in the same region (eu-west-2). Enable any non-default extensions the old project uses.
2. **Restore:** `TARGET_DB_URL='postgresql://…new…' bash scripts/db-restore.sh backups/<folder>`
   - It checks the checksums.
   - It refuses if the target already has tables.
   - It applies the backup in one transaction, with two fixes around `schema.sql`:
     - `supabase/restore/before_schema.sql` clears the new project's default grants, so the tables don't come back
       open to `anon`.
     - `supabase/restore/after_schema.sql` puts back the default privileges and the two `auth.users` triggers
       (sign-up creates a household; deleting an account deletes its data).
3. **Verify.** All of these must pass before anyone uses it:
   - `psql "$OLD" -XAtf scripts/db-acl-snapshot.sql > old.txt`, the same on the new database, then
     `diff old.txt new.txt`: no differences. If the old project is gone, compare with a snapshot saved at backup
     time.
   - Row counts per table match the source (or the backup's `data.sql`).
   - `DATABASE_URL="$NEW" npm run db:test`: every file passes. The tests roll back, so they leave no data behind.
   - Run the security and performance advisors on the new project: no new warnings.
4. **Configure the new project** by hand (none of this is in the backup):
   - the Auth URL settings, email confirmation, password length, custom SMTP and rate limits
     (`docs/release/staging-deploy.md` §3)
   - the payments secret hash (a new secret is fine; update Vercel to match)
5. **Switch:**
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel to the new project and
     redeploy.
   - Users stay signed up with the same passwords. Existing sessions end, so everyone signs in again.
6. **Follow up:**
   - Run `scripts/smoke-staging.mjs` against the site.
   - Check PayFast notifications since the backup (§4.1).
   - Re-apply deletions requested since the backup (§4.3).
   - Post the status message (§5).

### 1.5 Rehearsal evidence (2026-09-24, local stack, synthetic seed only)

1. **Backup:** `bash scripts/db-backup.sh --local` gave 5 files and checksums.
2. **Restore target:** a second, empty local Supabase stack (Postgres 17, 0 tables).
3. **First attempts, which found the problems fixed above:**
   - `roles.sql` failed on a platform-owned `GRANT SET ON PARAMETER` (the new project already has it; the script
     now skips that line).
   - Sign-up broke: the `auth.users` triggers were missing, so all 8 SQL test files failed.
   - Every table was open to `anon`: the default grants came back, and `rls_isolation.sql` reported 16 failures.
4. **Final run** (`scripts/db-restore.sh`, 1 s):
   - Row counts were identical for all 20 tables, `auth.users` and the migration history.
   - `db-acl-snapshot.sql` was identical: 141 lines covering privileges, default privileges, policies, RLS flags and
     triggers.
   - `db:test` against the restored database: 8/8 files, 184 checks passed.
   - The synthetic user signed in through the restored stack's Auth API with their original password and read their
     own 10 budget lines. A signed-out read was refused (42501).
   - A second restore into the now-populated database was refused.
5. **Hosted project comparison:** the same snapshot on the hosted project (read-only) hashed identically to the
   local one, excluding Supabase's own `storage` triggers, which differ by platform version: 137 lines, md5
   `b5d4ea3f…`.
6. **Guard against drift:** `src/lib/restore.test.ts` fails CI if a migration adds an `auth` or `storage` trigger
   that `after_schema.sql` doesn't re-create.

**Not yet done:** a restore from a backup of the **hosted** project into a scratch hosted project. It needs the
database password, which stays with the owner. Do it once, before the first real user. Use the steps above and
record the date and results here.

## 2. Monitoring (B7)

### 2.1 What exists today

- **Server logs** (Vercel function logs) never contain amounts, names or free text (N13). The events worth
  watching:
  - `payfast notify rejected: <reason>` (warning): a notification failed verification. One-offs are expected
    (forgeries, retries); a run of them means the setup is wrong.
  - `payfast notify: could not record the notification` (error, HTTP 500): PayFast verified a payment, but the
    database refused it. PayFast will retry. **Act the same day** (§4.1).
  - `payfast notify: <status>`: normal processing.
  - `sign-up failed`, `password reset request failed`, `account deletion failed`, `setup save failed`: with an error
    code only.
  - `Unhandled error` / `App error` / `Unhandled root error`: with a digest to match against the Vercel log.
- **Audit events** in the database: `account.created`, `account.deleted`, `payment.completed`, `payment.rejected`,
  `export.created`, and goal and debt money moves.
- **Supabase advisors** (security and performance) and Supabase's own logs.

### 2.2 To set up before the pilot (owner chooses the tools)

| Need | Requirement | Notes |
|---|---|---|
| Uptime | Check `/` and `/sign-in` every 5 minutes; alert by email or phone | Any uptime service; no data leaves the app |
| Payment errors | Alert on the log line `payfast notify: could not record` | A Vercel log drain or alert, or the error tracker |
| Errors | Server and browser errors with a stack, **no request bodies, cookies or form values** | Choose a tracker that can scrub data and stores it in a region acceptable under POPIA (B5). Record it as a processor. Update the CSP `connect-src` for it |
| Database | Supabase usage emails; the weekly advisors | Built in |

### 2.3 Routine checks

**Daily during the pilot.** Run in the Supabase SQL editor; these read only, and every row must be explainable:

```sql
-- 1. Payments still pending after an hour (PayFast should have notified by now)
select id, created_at, amount_cents from public.payments
where status = 'pending' and created_at < now() - interval '1 hour' order by created_at;
-- 2. Rejected or failed in the last 7 days (reject_reason: amount or merchant)
select status, reject_reason, count(*) from public.payments
where status in ('rejected', 'failed') and updated_at > now() - interval '7 days' group by 1, 2;
-- 3. Completed payments without access (must be empty)
select p.id from public.payments p left join public.entitlements e on e.payment_id = p.id
where p.status = 'complete' and e.id is null;
-- 4. Pilot access ending in the next 14 days (support template S8)
select count(*) from public.entitlements where ends_at between now() and now() + interval '14 days';
-- 5. Sign-ups, deletions and payments in the last 7 days
select action, count(*) from public.audit_events
where action in ('account.created', 'account.deleted', 'payment.completed', 'payment.rejected')
  and created_at > now() - interval '7 days' group by 1 order by 1;
```

- Pending payments older than a day aren't always a fault: people abandon checkout.
- Check them against the PayFast dashboard before contacting anyone.

**Weekly:**
- security and performance advisors
- a backup (§1.3)
- Vercel error trends
- the support inbox's open threads
- who has access to the GitHub, Vercel, Supabase and PayFast accounts, and that MFA is on (R5)

**Monthly:** rotate nothing by default, but rotate the PayFast passphrase and `PAYMENTS_DB_SECRET` after anyone
with access leaves, or after any suspected exposure. Update the env and the hash together (rc-review §5).

## 3. Support

- **Inbox:** one address on the product's own domain (owner to create; product brief question 5). Every person
  with access uses MFA.
- **Reply time:** owner to set and publish, for example 2 working days during the pilot. Use it in the templates'
  `[reply time]`.
- **Templates:** `docs/l10/support-templates.md` (S1–S8). The rules there apply to every reply:
  - never ask for card or bank details or passwords
  - never quote someone's figures back
  - no advice
- **Log:** keep a simple list with the date, the type (S1–S8 or an incident) and the outcome. No financial details.
  It feeds the L10 learning loop.

## 4. Incident path

**Severity:**

| Level | Examples | First response |
|---|---|---|
| **P1** | Suspected data exposure; everyone locked out; payments taken without access being granted | Same day, drop other work |
| **P2** | One feature broken for many (exports, reviews); emails not arriving | Within 1 working day |
| **P3** | One person's problem; cosmetic | Normal reply time |

**For every incident:**
1. Note the start time and what's affected.
2. Stop the harm, for example close the pilot (§4.1) or take the site offline in Vercel.
3. Post the status message (§5) if more than one person is affected.
4. Fix it, and check the fix.
5. Write a short note: timeline, cause, fix, and what changes so it doesn't happen again. No personal data in it.
6. Record any decision in `docs/decisions.md`.

### 4.1 Payments not confirming

- **Signs:** someone paid but still sees "Confirming your payment…" or the join page, or the daily check 1 or 3
  returns rows.
- **Look first:**
  1. Vercel logs for `payfast notify`:
     - Nothing logged: PayFast can't reach `/api/payfast/notify`. Check `NEXT_PUBLIC_SITE_URL`, deployment
       protection (staging-deploy §1.8) and the PayFast dashboard's notify settings.
     - `rejected: signature`: the passphrase differs between Vercel and PayFast.
     - `rejected: source` or `validate`: PayFast's addresses or server check. Compare with PayFast's current docs
       (D-038). R1 applies if you're not on Vercel.
     - `could not record` (500): the database refused it. Usually `PAYMENTS_DB_SECRET` doesn't match the stored hash
       (re-set both). Otherwise check the Supabase logs.
  2. The `payments` row's `status` and `reject_reason`: `amount` means the price changed between checkout and
     payment; `merchant` means the wrong PayFast account.
- **While fixing:** close new sign-ups with `update private.plans set active = false where code = 'pilot';`.
  Existing access stays.
- **Never:**
  - grant access by hand without a matching complete PayFast payment (support S2)
  - edit `payments` rows to force a match
- PayFast retries notifications, so once the cause is fixed, confirmations usually catch up. If they don't, refund
  through PayFast and apologise (S3).

### 4.2 Can't sign in / emails not arriving

- **Check:**
  - the Supabase Auth logs
  - the email rate limits: the built-in sender is for testing only (staging-deploy §3)
  - the custom SMTP provider's dashboard (bounces, a suspended account)
  - the Site URL and redirect URLs
- **Tell people** to check spam and wait for the resend timer. Never create or confirm accounts by hand for them.

### 4.3 Data looks wrong

1. Ask which page and what they expected (S6); never ask for figures by email.
2. Try to reproduce it with synthetic data locally, following the calculation spec and `docs/l4/test-vectors.json`.
3. **If a calculation is wrong:**
   - fix it with a new test vector
   - note it in `CHANGELOG.md`
   - tell the affected people what changed, in neutral words
4. **If data was lost:** restore into a new project (§1.4) and copy only the affected household's rows across, as
   the owner, with a note of what was done. Re-apply any account deletions since the backup: check
   `account.deleted` audit events after the backup time.

### 4.4 Suspected data exposure (P1)

1. Contain it:
   - rotate the exposed secrets (Supabase keys in the dashboard, the PayFast passphrase, `PAYMENTS_DB_SECRET`)
   - revoke sessions if needed
   - close the pilot (§4.1)
2. Preserve the evidence: Vercel logs, the Supabase logs and advisors, and access lists.
3. Work out what data and whose, using `docs/data-classification.md` classes.
4. **Legal (B5, to confirm with a qualified adviser before the pilot):** POPIA section 22 has notification duties
   for security compromises (to the Information Regulator and the people affected). Have the Information Officer
   and the adviser named, with contact details, **before** the pilot, so this step isn't slowed down. This runbook
   doesn't decide whether to notify.
5. Fix the cause, re-run the RLS tests and advisors, and write the incident note.

## 5. Status message templates

Plain, neutral, no blame, no promises of outcomes (`docs/l1/safety-boundary.md`). Use them on the landing page
banner or by email to affected people. Fill in the brackets; remove what doesn't apply.

**Investigating**
> **We're looking into a problem with [signing in / payments / downloads].** Some people may [not be able to sign in
> / see "Confirming your payment" for longer than usual]. Your data is safe [only if confirmed]. We'll update this
> by [time].

**Payments delayed**
> **Payment confirmations are delayed.** If you paid today, your payment is recorded with PayFast and your access
> will appear once it's confirmed; there's no need to pay again. We'll update this by [time].

**Resolved**
> **Fixed: [short description].** It affected [what] between [start] and [end]. [What people need to do, or
> "Nothing to do on your side."] Thank you for your patience. Questions: [support email].

**Planned maintenance**
> **Planned maintenance on [date] from [time] to [time] (SAST).** The Ledger Loft will be unavailable for up to
> [duration]. Nothing you've saved will change.

**Data exposure:** don't use a template. The wording depends on step 4 of §4.4 and needs the legal adviser.

## 6. Pilot metrics

This covers the launch gate item "analytics measure activation, repeated value and conversion without collecting
unnecessary sensitive data". The core metrics in `docs/analytics-plan.md` §2 come from data the app already keeps,
so there's no tracking script, no cookie and no new processor. Run this in the Supabase SQL editor:

```sql
select * from private.pilot_metrics('2026-10-01', '2026-10-31');  -- sign-up window, both dates included
```

**What it returns:**
- Counts only, never ids, amounts, names or text.
- The **cohort** is the households that signed up in the window and still exist.
- Every metric below except `signups` and `accounts_deleted` is counted out of that cohort. `paid` is counted out of
  `checkout_started`.

| Metric | Definition |
|---|---|
| `signups` / `accounts_deleted` | From the data-free audit events, so deleted accounts still count |
| `setup_completed_7d` | Finished setup within 7 days of sign-up |
| `setup_stopped_after:<step>` | Setup not finished, by the last step saved (drop-off) |
| `activated` | Finished setup **and** added 3 or more transactions within 7 days (plan §2) |
| `active_last_30_days` | Added or edited a transaction, or changed a planned amount, in the 30 days before the window ends |
| `habit` | Completed the check-in in two consecutive months (the north star) |
| `checkout_started` / `paid` | Pilot conversion |

**Using it:**
- Run it monthly, per sign-up month, for the pilot report (analytics plan §5).
- With pilot-sized numbers, look at the counts rather than the percentages.
- Your own test accounts are included, so keep a note of how many there are and subtract them.

**Not covered yet (needs an analytics tool, which is still the owner's choice, analytics plan §4):**
- landing views and traffic source
- pilot button clicks
- setup steps viewed (as opposed to saved)
- "How this was calculated" opens
- debt-help opens

Choose a privacy-focused tool, record it as a processor, add it to the privacy notice (B5), and allow it in the CSP.

