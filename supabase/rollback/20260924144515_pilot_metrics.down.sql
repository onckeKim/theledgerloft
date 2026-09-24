-- Rollback for 20260924144515_pilot_metrics.sql: removes the owner-only metrics function. No data changes.
drop function if exists private.pilot_metrics(date, date);
