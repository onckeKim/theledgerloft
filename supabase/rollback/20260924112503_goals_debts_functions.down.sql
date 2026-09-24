-- Rollback for 20260924112503_goals_debts_functions.sql. Goals, debts and their history are kept.
drop function if exists public.remove_debt(uuid, text);
drop function if exists public.debt_set_balance(uuid, bigint, date, text);
drop function if exists public.debt_record_payment(uuid, bigint, date, text, boolean);
drop function if exists public.create_debt(text, bigint, bigint, integer, text);
drop function if exists public.remove_goal(uuid, text);
drop function if exists public.goal_move_money(uuid, text, bigint, date);
drop function if exists public.create_goal(text, text, bigint, bigint, bigint, text);
drop trigger if exists audit_debt_payment on public.debt_payments;
drop function if exists private.audit_debt_payment();
drop trigger if exists audit_goal_money on public.goal_contributions;
drop function if exists private.audit_goal_money();
drop trigger if exists guard_linked on public.transactions_manual;
drop function if exists private.guard_linked_transaction();
drop function if exists private.require_household();
drop function if exists private.ensure_current_line(uuid, uuid, bigint);
drop function if exists private.system_category(uuid, text);
alter table public.households drop column if exists checklist_hidden;
