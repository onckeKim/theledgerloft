-- Rollback for the setup functions migration. No data is removed.
drop function if exists public.setup_complete();
drop function if exists public.setup_save_debts_goals(jsonb, jsonb);
drop function if exists public.setup_save_categories(text, jsonb);
drop function if exists public.setup_save_income(jsonb);
drop function if exists public.setup_save_basics(text, smallint, text);
drop function if exists private.ensure_setup_budget(uuid);
drop function if exists private.setup_household();
drop function if exists public.period_bounds(date, smallint);
drop function if exists private.current_household_id();
