-- The Ledger Loft: schema foundation (playbook A4 + L5).
-- Money: bigint cents. Rates: integer basis points. Periods: 'YYYY-MM' (docs/l4/calculation-spec.md).
-- Every household-owned table has RLS and a household_id; composite foreign keys stop rows from pointing at
-- another household's data even if a policy were wrong (threat T1).
-- Note: the created_by foreign keys and some indexes are replaced in 20260924094839_fk_indexes.sql.
-- Rollback: see supabase/rollback/20260924094723_foundation.down.sql

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------

-- Budget period for a local date and month start day (1–28). Label = month the period ends in (L4 §3, D-013).
create or replace function public.period_for(d date, start_day smallint)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  start_month date;
begin
  if start_day < 1 or start_day > 28 then
    raise exception 'start_day must be between 1 and 28' using errcode = '22023';
  end if;
  if extract(day from d) >= start_day then
    start_month := date_trunc('month', d)::date;
  else
    start_month := (date_trunc('month', d) - interval '1 month')::date;
  end if;
  if start_day = 1 then
    return to_char(start_month, 'YYYY-MM');
  end if;
  return to_char(start_month + interval '1 month', 'YYYY-MM');
end;
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- People and households
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'C2. One row per auth user.';

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My household' check (char_length(name) between 1 and 60),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  month_start_day smallint not null default 1 check (month_start_day between 1 and 28),
  pay_frequency text not null default 'monthly' check (pay_frequency in ('monthly', 'every_two_weeks', 'weekly', 'varies')),
  budget_style text not null default 'flexible' check (budget_style in ('flexible', 'zero_based')),
  debt_method text not null default 'snowball' check (debt_method in ('snowball', 'avalanche')),
  setup_step text,
  setup_completed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.households is 'C2/C3. MVP: one member per household (A-02); model supports sharing later.';

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members (user_id);

-- Membership check used by every policy. SECURITY DEFINER so it can read memberships without recursing into RLS.
create or replace function private.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_household_member(uuid) from public, anon;
grant execute on function private.is_household_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Planning
-- ---------------------------------------------------------------------------------------------

-- Manual accounts: table exists for the data model; the feature is Later (PRD P-2).
create table public.accounts_manual (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('cash', 'cheque', 'savings', 'credit', 'other')),
  opening_balance_cents bigint not null default 0 check (abs(opening_balance_cents) <= 9999999999),
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);

create table public.income_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  monthly_cents bigint not null check (monthly_cents between 1 and 9999999999),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);
create index income_items_household_idx on public.income_items (household_id) where archived_at is null;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  category_group text not null check (category_group in ('fixed', 'everyday', 'debts', 'saving')),
  -- Categories the app manages itself (PRD P-3, P-4): one each per household.
  system_key text check (system_key in ('debt_payments', 'sinking_funds', 'savings_goals')),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);
create unique index categories_active_name_uniq on public.categories (household_id, lower(name)) where archived_at is null;
create unique index categories_system_key_uniq on public.categories (household_id, system_key) where system_key is not null;

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  checklist jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, period),
  unique (id, household_id)
);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  budget_id uuid not null,
  category_id uuid not null,
  planned_cents bigint not null default 0 check (planned_cents between 0 and 9999999999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (budget_id, category_id),
  foreign key (budget_id, household_id) references public.budgets (id, household_id) on delete cascade,
  foreign key (category_id, household_id) references public.categories (id, household_id)
);
create index budget_lines_category_idx on public.budget_lines (category_id);
create index budget_lines_household_idx on public.budget_lines (household_id);

-- ---------------------------------------------------------------------------------------------
-- Money in and out
-- ---------------------------------------------------------------------------------------------

create table public.transactions_manual (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('income', 'outflow', 'refund')),
  amount_cents bigint not null check (amount_cents between 1 and 9999999999),
  occurred_on date not null,
  -- Set by trigger from occurred_on and the household's month start day (L4 §3).
  period text not null default '' check (period = '' or period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  category_id uuid,
  income_item_id uuid,
  description text check (description is null or char_length(description) <= 80),
  deleted_at timestamptz, -- soft delete: supports the 10-second undo (PRD US-27); purged later
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  -- Spending and refunds need a category (PRD US-29); income may link to an income item.
  check (kind = 'income' or category_id is not null),
  check (kind <> 'income' or category_id is null),
  check (kind = 'income' or income_item_id is null),
  foreign key (category_id, household_id) references public.categories (id, household_id),
  foreign key (income_item_id, household_id) references public.income_items (id, household_id)
);
create index transactions_period_idx on public.transactions_manual (household_id, period, occurred_on desc) where deleted_at is null;
create index transactions_category_idx on public.transactions_manual (category_id) where deleted_at is null;
create index transactions_income_item_idx on public.transactions_manual (income_item_id);

create or replace function private.set_transaction_period()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  start_day smallint;
begin
  select h.month_start_day into start_day from public.households h where h.id = new.household_id;
  if start_day is null then
    raise exception 'unknown household' using errcode = '23503';
  end if;
  new.period := public.period_for(new.occurred_on, start_day);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Debts
-- ---------------------------------------------------------------------------------------------

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  opening_balance_cents bigint not null check (opening_balance_cents between 0 and 9999999999),
  balance_cents bigint not null check (balance_cents between 0 and 9999999999),
  rate_bp integer check (rate_bp between 0 and 10000), -- null = "Interest not included"
  min_payment_cents bigint not null check (min_payment_cents between 1 and 9999999999),
  note text check (note is null or char_length(note) <= 200),
  paid_off_on date,
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);
create index debts_household_idx on public.debts (household_id) where archived_at is null;

create table public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  debt_id uuid not null,
  kind text not null check (kind in ('payment', 'balance_adjustment')),
  amount_cents bigint check (amount_cents between 1 and 9999999999), -- payments only
  new_balance_cents bigint check (new_balance_cents between 0 and 9999999999), -- adjustments only
  happened_on date not null,
  transaction_id uuid,
  note text check (note is null or char_length(note) <= 200),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'payment' and amount_cents is not null and new_balance_cents is null)
      or (kind = 'balance_adjustment' and new_balance_cents is not null and amount_cents is null and transaction_id is null)),
  foreign key (debt_id, household_id) references public.debts (id, household_id) on delete cascade,
  foreign key (transaction_id, household_id) references public.transactions_manual (id, household_id)
);
create index debt_payments_debt_idx on public.debt_payments (debt_id, happened_on desc);
create index debt_payments_household_idx on public.debt_payments (household_id);
create index debt_payments_transaction_idx on public.debt_payments (transaction_id);

-- ---------------------------------------------------------------------------------------------
-- Goals and sinking funds (one table; kind distinguishes them, L4 §5)
-- ---------------------------------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('goal', 'sinking_fund')),
  name text not null check (char_length(name) between 1 and 60),
  target_cents bigint not null check (target_cents between 1 and 9999999999),
  monthly_cents bigint not null default 0 check (monthly_cents between 0 and 9999999999),
  starting_cents bigint not null default 0 check (starting_cents between 0 and 9999999999),
  due_period text check (due_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  completed_at timestamptz,
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  check (kind = 'goal' or due_period is not null)
);
create index goals_household_idx on public.goals (household_id) where archived_at is null;

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  goal_id uuid not null,
  direction text not null check (direction in ('in', 'out')),
  amount_cents bigint not null check (amount_cents between 1 and 9999999999),
  happened_on date not null,
  transaction_id uuid,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (goal_id, household_id) references public.goals (id, household_id) on delete cascade,
  foreign key (transaction_id, household_id) references public.transactions_manual (id, household_id)
);
create index goal_contributions_goal_idx on public.goal_contributions (goal_id, happened_on desc);
create index goal_contributions_household_idx on public.goal_contributions (household_id);
create index goal_contributions_transaction_idx on public.goal_contributions (transaction_id);

-- ---------------------------------------------------------------------------------------------
-- Review, exports, audit
-- ---------------------------------------------------------------------------------------------

create table public.monthly_checkins (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  went_well text check (went_well is null or char_length(went_well) <= 1000),
  surprised text check (surprised is null or char_length(surprised) <= 1000),
  next_actions jsonb not null default '[]'::jsonb check (jsonb_typeof(next_actions) = 'array' and jsonb_array_length(next_actions) <= 5),
  completed_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, period)
);

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('pdf_summary', 'csv_all')),
  period text check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  include_reflections boolean not null default false,
  spec_version text not null,
  storage_path text,
  expires_at timestamptz not null default now() + interval '24 hours',
  file_deleted_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (kind <> 'pdf_summary' or period is not null)
);
create index exports_household_idx on public.exports (household_id, created_at desc);

-- Append-only. Never holds amounts or free text (docs/data-classification.md).
create table public.audit_events (
  id bigint generated always as identity primary key,
  household_id uuid references public.households (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);
create index audit_events_household_idx on public.audit_events (household_id, created_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id);
