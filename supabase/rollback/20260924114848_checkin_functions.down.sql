-- Rollback for 20260924114848_checkin_functions.sql. Check-ins are kept.
drop function if exists public.save_checkin(text, text, text, jsonb);
alter table public.monthly_checkins drop constraint if exists monthly_checkins_next_actions_valid;
drop function if exists private.valid_next_actions(jsonb);
