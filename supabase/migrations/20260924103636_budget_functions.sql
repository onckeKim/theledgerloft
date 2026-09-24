-- Monthly budget operations (playbook L7, PRD US-21…US-25, P-5, P-7). Security invoker: RLS applies; the household
-- comes from auth.uid(). Multi-row changes are single function calls so they can't half-apply.
-- Rollback: see supabase/rollback/20260924103636_budget_functions.down.sql

-- First and last day of a labelled period for a start day (L4 §3: the label is the month the period ends in).
create or replace function public.period_range(p_period text, start_day smallint, out starts_on date, out ends_on date)
language plpgsql
immutable
set search_path = ''
as $$
declare
  label_month date;
begin
  if p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'period must look like 2026-09' using errcode = '22023';
  end if;
  if start_day < 1 or start_day > 28 then
    raise exception 'start_day must be between 1 and 28' using errcode = '22023';
  end if;
  label_month := to_date(p_period || '-01', 'YYYY-MM-DD');
  if start_day = 1 then
    starts_on := label_month;
  else
    starts_on := (label_month - interval '1 month')::date + (start_day - 1);
  end if;
  ends_on := (starts_on + interval '1 month')::date - 1;
end;
$$;
revoke execute on function public.period_range(text, smallint) from public, anon;
grant execute on function public.period_range(text, smallint) to authenticated;

-- The budget for a period, created on first open by copying the most recent earlier plan (PRD P-5).
-- Archived categories are not copied forward.
create or replace function public.ensure_budget(p_period text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.current_household_id();
  sd smallint;
  range record;
  bid uuid;
  source uuid;
begin
  if hid is null then
    raise exception 'no household for this user' using errcode = '42501';
  end if;
  select b.id into bid from public.budgets b where b.household_id = hid and b.period = p_period;
  if bid is not null then
    return bid;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('budget:' || hid::text, 0));
  select b.id into bid from public.budgets b where b.household_id = hid and b.period = p_period;
  if bid is not null then
    return bid;
  end if;

  select h.month_start_day into sd from public.households h where h.id = hid;
  select * into range from public.period_range(p_period, sd);
  insert into public.budgets (household_id, period, starts_on, ends_on)
  values (hid, p_period, range.starts_on, range.ends_on) returning id into bid;

  select b.id into source from public.budgets b
  where b.household_id = hid and b.id <> bid
  order by (b.period < p_period) desc, b.period desc
  limit 1;
  if source is not null then
    insert into public.budget_lines (household_id, budget_id, category_id, planned_cents)
    select hid, bid, l.category_id, l.planned_cents
    from public.budget_lines l join public.categories c on c.id = l.category_id
    where l.budget_id = source and c.archived_at is null;
  end if;
  return bid;
end;
$$;

-- Move part of one category's plan to another (PRD US-24). Total planned is unchanged.
create or replace function public.move_budget_money(p_budget uuid, p_from uuid, p_to uuid, p_cents bigint)
returns void
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.current_household_id();
  available bigint;
begin
  if p_cents is null or p_cents < 1 then
    raise exception 'amount must be at least 1 cent' using errcode = '22023';
  end if;
  if p_from = p_to then
    raise exception 'choose two different categories' using errcode = '22023';
  end if;
  select l.planned_cents into available from public.budget_lines l
  where l.budget_id = p_budget and l.category_id = p_from and l.household_id = hid
  for update;
  if available is null then
    raise exception 'unknown budget line' using errcode = '22023';
  end if;
  if available < p_cents then
    raise exception 'not enough planned in that category' using errcode = '22023', hint = 'insufficient';
  end if;
  update public.budget_lines set planned_cents = planned_cents - p_cents
  where budget_id = p_budget and category_id = p_from;
  insert into public.budget_lines (household_id, budget_id, category_id, planned_cents)
  values (hid, p_budget, p_to, p_cents)
  on conflict (budget_id, category_id) do update set planned_cents = public.budget_lines.planned_cents + excluded.planned_cents;
end;
$$;

-- Add a category with its planned amount for one budget (PRD US-23).
create or replace function public.add_category(p_budget uuid, p_name text, p_group text, p_planned bigint)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.current_household_id();
  cid uuid;
begin
  if p_group not in ('fixed', 'everyday', 'debts', 'saving') then
    raise exception 'unknown category group' using errcode = '22023';
  end if;
  begin
    insert into public.categories (household_id, name, category_group, sort_order)
    values (hid, btrim(p_name), p_group, 50) returning id into cid;
  exception when unique_violation then
    raise exception 'duplicate category name' using errcode = '23505', detail = btrim(p_name);
  end;
  insert into public.budget_lines (household_id, budget_id, category_id, planned_cents)
  values (hid, p_budget, cid, p_planned);
  return cid;
end;
$$;

-- Remove a category: deleted if it was never used, otherwise archived so history stays correct (PRD P-7).
-- Returns 'deleted' or 'archived'. App-managed categories (debt payments, sinking funds, savings goals) can't be removed here.
create or replace function public.remove_category(p_category uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.current_household_id();
  sys text;
begin
  select c.system_key into sys from public.categories c where c.id = p_category and c.household_id = hid;
  if not found then
    raise exception 'unknown category' using errcode = '22023';
  end if;
  if sys is not null then
    raise exception 'this category is managed by the app' using errcode = '22023', hint = 'system';
  end if;
  if exists (select 1 from public.transactions_manual t where t.category_id = p_category) then
    update public.categories set archived_at = now() where id = p_category;
    return 'archived';
  end if;
  delete from public.budget_lines where category_id = p_category;
  delete from public.categories where id = p_category;
  return 'deleted';
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.ensure_budget(text)', 'public.move_budget_money(uuid, uuid, uuid, bigint)',
    'public.add_category(uuid, text, text, bigint)', 'public.remove_category(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
