-- Covers budget_lines_household_id_fkey (performance advisor 0001).
-- Rollback: drop index if exists public.budget_lines_household_idx;
create index budget_lines_household_idx on public.budget_lines (household_id);
