-- Rollback for 20260924150235_retention.sql: stops the nightly purge and drops the index.
-- pg_cron stays enabled (dropping it would delete any other jobs); data already purged can't come back.
select cron.unschedule(jobid) from cron.job where jobname = 'ledgerloft-purge-expired';
drop function if exists private.purge_expired(timestamptz);
drop index if exists public.entitlements_payment_household_idx;
