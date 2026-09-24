-- Index every foreign key (Supabase performance advisor 0001). Composite keys need indexes that lead with the same
-- columns. `created_by` becomes a plain audit column (no FK): it is informational, the rows are removed with the
-- household on account deletion, and an FK would need an index on every table only to support user deletion.
-- Rollback: see supabase/rollback/20260924094839_fk_indexes.down.sql

do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts_manual', 'income_items', 'categories', 'budgets', 'transactions_manual', 'debts', 'debt_payments',
    'goals', 'goal_contributions', 'monthly_checkins', 'exports'
  ] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_created_by_fkey');
  end loop;
end;
$$;
alter table public.households drop constraint if exists households_created_by_fkey;

create index accounts_manual_household_idx on public.accounts_manual (household_id);

drop index if exists public.budget_lines_category_idx;
drop index if exists public.budget_lines_household_idx;
create index budget_lines_budget_fk_idx on public.budget_lines (budget_id, household_id);
create index budget_lines_category_fk_idx on public.budget_lines (category_id, household_id);

drop index if exists public.transactions_category_idx;
drop index if exists public.transactions_income_item_idx;
create index transactions_category_fk_idx on public.transactions_manual (category_id, household_id);
create index transactions_income_item_fk_idx on public.transactions_manual (income_item_id, household_id);

drop index if exists public.debt_payments_debt_idx;
drop index if exists public.debt_payments_transaction_idx;
create index debt_payments_debt_fk_idx on public.debt_payments (debt_id, household_id, happened_on desc);
create index debt_payments_transaction_fk_idx on public.debt_payments (transaction_id, household_id);

drop index if exists public.goal_contributions_goal_idx;
drop index if exists public.goal_contributions_transaction_idx;
create index goal_contributions_goal_fk_idx on public.goal_contributions (goal_id, household_id, happened_on desc);
create index goal_contributions_transaction_fk_idx on public.goal_contributions (transaction_id, household_id);
