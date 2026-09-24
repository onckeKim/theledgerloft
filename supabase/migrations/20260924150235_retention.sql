-- The Ledger Loft: release review risks R10 (missing index) and R3 (nothing purged old data).
-- Retention (N11, docs/release/operations.md §7):
--   deleted transactions: 30 days after deletion (undo only lasts seconds; they also appear in the data download)
--   export link rows: 7 days (the link works for 10 minutes; the export.created audit event is kept separately)
--   audit events: 12 months (N11)

-- R10: covering index for entitlements (payment_id, household_id) -> payments (id, household_id)
create index if not exists entitlements_payment_household_idx on public.entitlements (payment_id, household_id);

-- R3: nightly purge with Supabase Cron (https://supabase.com/docs/guides/cron/install)
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function private.purge_expired(p_now timestamptz default now())
returns table (kind text, removed bigint)
language plpgsql
set search_path = ''
as $$
declare
  n_transactions bigint;
  n_exports bigint;
  n_audit bigint;
begin
  -- Linked goal and debt transactions can't be soft-deleted; excluding them also keeps guard_linked from stopping
  -- the whole purge.
  delete from public.transactions_manual t
  where t.deleted_at < p_now - interval '30 days'
    and not exists (select 1 from public.goal_contributions g where g.transaction_id = t.id)
    and not exists (select 1 from public.debt_payments d where d.transaction_id = t.id);
  get diagnostics n_transactions = row_count;

  delete from public.exports e where e.created_at < p_now - interval '7 days';
  get diagnostics n_exports = row_count;

  delete from public.audit_events a where a.created_at < p_now - interval '12 months';
  get diagnostics n_audit = row_count;

  return query values ('deleted_transactions', n_transactions), ('export_links', n_exports),
                      ('audit_events', n_audit);
end;
$$;
revoke all on function private.purge_expired(timestamptz) from public, anon, authenticated;
comment on function private.purge_expired(timestamptz) is
  'Nightly retention purge (N11, R3). Scheduled as cron job ledgerloft-purge-expired; returns counts only.';

-- 01:17 UTC = 03:17 SAST, a quiet hour. cron.schedule replaces a job with the same name, so this is re-runnable.
select cron.schedule('ledgerloft-purge-expired', '17 1 * * *', 'select private.purge_expired()');
