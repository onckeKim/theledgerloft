-- Rollback for the budget functions migration. No data is removed.
drop function if exists public.remove_category(uuid);
drop function if exists public.add_category(uuid, text, text, bigint);
drop function if exists public.move_budget_money(uuid, uuid, uuid, bigint);
drop function if exists public.ensure_budget(text);
drop function if exists public.period_range(text, smallint);
