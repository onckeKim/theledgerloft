-- Rollback for 20260924094723_foundation.sql. DESTROYS ALL APP DATA. Take a backup first.
drop table if exists public.audit_events, public.exports, public.monthly_checkins, public.goal_contributions,
  public.goals, public.debt_payments, public.debts, public.transactions_manual, public.budget_lines,
  public.budgets, public.categories, public.income_items, public.accounts_manual, public.household_members,
  public.households, public.profiles cascade;
drop function if exists private.set_transaction_period();
drop function if exists private.is_household_member(uuid);
drop function if exists private.set_updated_at();
drop function if exists public.period_for(date, smallint);
drop schema if exists private;
