-- Rollback for 20260924094839_fk_indexes.sql (restores the earlier indexes; created_by FKs are not re-added,
-- because rows may now reference deleted users).
drop index if exists public.accounts_manual_household_idx, public.budget_lines_budget_fk_idx,
  public.budget_lines_category_fk_idx, public.transactions_category_fk_idx, public.transactions_income_item_fk_idx,
  public.debt_payments_debt_fk_idx, public.debt_payments_transaction_fk_idx, public.goal_contributions_goal_fk_idx,
  public.goal_contributions_transaction_fk_idx;
create index budget_lines_category_idx on public.budget_lines (category_id);
create index budget_lines_household_idx on public.budget_lines (household_id);
create index transactions_category_idx on public.transactions_manual (category_id) where deleted_at is null;
create index transactions_income_item_idx on public.transactions_manual (income_item_id);
create index debt_payments_debt_idx on public.debt_payments (debt_id, happened_on desc);
create index debt_payments_transaction_idx on public.debt_payments (transaction_id);
create index goal_contributions_goal_idx on public.goal_contributions (goal_id, happened_on desc);
create index goal_contributions_transaction_idx on public.goal_contributions (transaction_id);
