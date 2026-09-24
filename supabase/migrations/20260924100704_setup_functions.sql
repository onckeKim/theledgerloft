-- Guided setup (playbook L6, PRD US-10…US-16). Each step saves through one function, so a step is saved
-- completely or not at all. Functions run as the caller (RLS applies) and find the household from auth.uid(),
-- never from client input. They refuse to run once setup is complete, so their replace-the-list behaviour can't
-- remove data that later screens depend on.
-- Rollback: see supabase/rollback/20260924100704_setup_functions.down.sql

-- The caller's household (MVP: one per user, A-02).
create or replace function private.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.household_id from public.household_members m
  where m.user_id = (select auth.uid())
  order by m.created_at
  limit 1;
$$;
revoke all on function private.current_household_id() from public, anon;
grant execute on function private.current_household_id() to authenticated;

-- Period label plus first and last day (L4 §3).
create or replace function public.period_bounds(d date, start_day smallint, out period text, out starts_on date, out ends_on date)
language plpgsql
immutable
set search_path = ''
as $$
declare
  start_month date;
begin
  period := public.period_for(d, start_day);
  if extract(day from d) >= start_day then
    start_month := date_trunc('month', d)::date;
  else
    start_month := (date_trunc('month', d) - interval '1 month')::date;
  end if;
  starts_on := start_month + (start_day - 1);
  ends_on := (start_month + interval '1 month')::date + (start_day - 1) - 1;
end;
$$;
revoke execute on function public.period_bounds(date, smallint) from public, anon;
grant execute on function public.period_bounds(date, smallint) to authenticated;

-- Household still in setup, or an error.
create or replace function private.setup_household()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  hid uuid := private.current_household_id();
  done timestamptz;
begin
  if hid is null then
    raise exception 'no household for this user' using errcode = '42501';
  end if;
  select h.setup_completed_at into done from public.households h where h.id = hid;
  if done is not null then
    raise exception 'setup is already complete' using errcode = 'P0001', hint = 'setup_complete';
  end if;
  return hid;
end;
$$;

-- The first budget: the period containing today (Johannesburg time). Re-aligned if the start day changes during setup.
create or replace function private.ensure_setup_budget(hid uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  sd smallint;
  bounds record;
  bid uuid;
begin
  select h.month_start_day into sd from public.households h where h.id = hid;
  select * into bounds from public.period_bounds((now() at time zone 'Africa/Johannesburg')::date, sd);
  select b.id into bid from public.budgets b where b.household_id = hid order by b.created_at limit 1;
  if bid is null then
    insert into public.budgets (household_id, period, starts_on, ends_on)
    values (hid, bounds.period, bounds.starts_on, bounds.ends_on) returning id into bid;
  else
    update public.budgets set period = bounds.period, starts_on = bounds.starts_on, ends_on = bounds.ends_on
    where id = bid and (period, starts_on, ends_on) is distinct from (bounds.period, bounds.starts_on, bounds.ends_on);
  end if;
  return bid;
end;
$$;

revoke all on function private.setup_household() from public, anon;
revoke all on function private.ensure_setup_budget(uuid) from public, anon;
grant execute on function private.setup_household() to authenticated;
grant execute on function private.ensure_setup_budget(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Step functions
-- ---------------------------------------------------------------------------------------------------------------

create or replace function public.setup_save_basics(p_pay_frequency text, p_month_start_day smallint, p_budget_style text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.setup_household();
begin
  update public.households
  set pay_frequency = p_pay_frequency, month_start_day = p_month_start_day, budget_style = p_budget_style, setup_step = 'basics'
  where id = hid;
  perform private.ensure_setup_budget(hid);
end;
$$;

-- p_items: [{ "id"?: uuid, "name": text, "monthly_cents": int }] in display order. Returns ids in the same order.
create or replace function public.setup_save_income(p_items jsonb)
returns uuid[]
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.setup_household();
  item jsonb;
  pos int;
  iid uuid;
  ids uuid[] := '{}';
begin
  delete from public.income_items i
  where i.household_id = hid
    and i.id not in (select (e ->> 'id')::uuid from jsonb_array_elements(p_items) e where coalesce(e ->> 'id', '') <> '');
  for item, pos in select e, o from jsonb_array_elements(p_items) with ordinality as t(e, o) loop
    iid := nullif(item ->> 'id', '')::uuid;
    if iid is null then
      insert into public.income_items (household_id, name, monthly_cents, sort_order)
      values (hid, item ->> 'name', (item ->> 'monthly_cents')::bigint, pos) returning id into iid;
    else
      update public.income_items set name = item ->> 'name', monthly_cents = (item ->> 'monthly_cents')::bigint, sort_order = pos
      where id = iid and household_id = hid;
      if not found then raise exception 'unknown income item' using errcode = '22023'; end if;
    end if;
    ids := ids || iid;
  end loop;
  update public.households set setup_step = 'income' where id = hid;
  return ids;
end;
$$;

-- p_group: 'fixed' (bills) or 'everyday'. p_items: [{ "id"?: uuid, "name": text, "planned_cents": int }].
create or replace function public.setup_save_categories(p_group text, p_items jsonb)
returns uuid[]
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.setup_household();
  bid uuid;
  item jsonb;
  pos int;
  cid uuid;
  ids uuid[] := '{}';
begin
  if p_group not in ('fixed', 'everyday') then
    raise exception 'unknown category group' using errcode = '22023';
  end if;
  bid := private.ensure_setup_budget(hid);

  with gone as (
    select c.id from public.categories c
    where c.household_id = hid and c.category_group = p_group and c.system_key is null
      and c.id not in (select (e ->> 'id')::uuid from jsonb_array_elements(p_items) e where coalesce(e ->> 'id', '') <> '')
  ), lines as (
    delete from public.budget_lines l using gone where l.category_id = gone.id returning l.category_id
  )
  delete from public.categories c using gone where c.id = gone.id;

  for item, pos in select e, o from jsonb_array_elements(p_items) with ordinality as t(e, o) loop
    cid := nullif(item ->> 'id', '')::uuid;
    begin
      if cid is null then
        insert into public.categories (household_id, name, category_group, sort_order)
        values (hid, item ->> 'name', p_group, pos) returning id into cid;
      else
        update public.categories set name = item ->> 'name', sort_order = pos
        where id = cid and household_id = hid and category_group = p_group and system_key is null;
        if not found then raise exception 'unknown category' using errcode = '22023'; end if;
      end if;
    exception when unique_violation then
      raise exception 'duplicate category name' using errcode = '23505', detail = item ->> 'name';
    end;
    insert into public.budget_lines (household_id, budget_id, category_id, planned_cents)
    values (hid, bid, cid, (item ->> 'planned_cents')::bigint)
    on conflict (budget_id, category_id) do update set planned_cents = excluded.planned_cents;
    ids := ids || cid;
  end loop;

  update public.households set setup_step = case p_group when 'fixed' then 'bills' else 'spending' end where id = hid;
  return ids;
end;
$$;

-- p_debts: [{ id?, name, balance_cents, min_payment_cents, rate_bp? }]
-- p_goals: [{ id?, kind: 'goal'|'sinking_fund', name, target_cents, monthly_cents, starting_cents, due_period? }]
-- Returns { "debts": [ids], "goals": [ids] } in input order.
create or replace function public.setup_save_debts_goals(p_debts jsonb, p_goals jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.setup_household();
  item jsonb;
  pos int;
  rid uuid;
  debt_ids uuid[] := '{}';
  goal_ids uuid[] := '{}';
begin
  delete from public.debts d
  where d.household_id = hid
    and d.id not in (select (e ->> 'id')::uuid from jsonb_array_elements(p_debts) e where coalesce(e ->> 'id', '') <> '');
  for item, pos in select e, o from jsonb_array_elements(p_debts) with ordinality as t(e, o) loop
    rid := nullif(item ->> 'id', '')::uuid;
    if rid is null then
      insert into public.debts (household_id, name, opening_balance_cents, balance_cents, min_payment_cents, rate_bp)
      values (hid, item ->> 'name', (item ->> 'balance_cents')::bigint, (item ->> 'balance_cents')::bigint,
              (item ->> 'min_payment_cents')::bigint, nullif(item ->> 'rate_bp', '')::int)
      returning id into rid;
    else
      update public.debts
      set name = item ->> 'name', opening_balance_cents = (item ->> 'balance_cents')::bigint,
          balance_cents = (item ->> 'balance_cents')::bigint, min_payment_cents = (item ->> 'min_payment_cents')::bigint,
          rate_bp = nullif(item ->> 'rate_bp', '')::int
      where id = rid and household_id = hid;
      if not found then raise exception 'unknown debt' using errcode = '22023'; end if;
    end if;
    debt_ids := debt_ids || rid;
  end loop;

  delete from public.goals g
  where g.household_id = hid
    and g.id not in (select (e ->> 'id')::uuid from jsonb_array_elements(p_goals) e where coalesce(e ->> 'id', '') <> '');
  for item, pos in select e, o from jsonb_array_elements(p_goals) with ordinality as t(e, o) loop
    rid := nullif(item ->> 'id', '')::uuid;
    if rid is null then
      insert into public.goals (household_id, kind, name, target_cents, monthly_cents, starting_cents, due_period)
      values (hid, item ->> 'kind', item ->> 'name', (item ->> 'target_cents')::bigint, (item ->> 'monthly_cents')::bigint,
              (item ->> 'starting_cents')::bigint, nullif(item ->> 'due_period', ''))
      returning id into rid;
    else
      update public.goals
      set kind = item ->> 'kind', name = item ->> 'name', target_cents = (item ->> 'target_cents')::bigint,
          monthly_cents = (item ->> 'monthly_cents')::bigint, starting_cents = (item ->> 'starting_cents')::bigint,
          due_period = nullif(item ->> 'due_period', '')
      where id = rid and household_id = hid;
      if not found then raise exception 'unknown goal' using errcode = '22023'; end if;
    end if;
    goal_ids := goal_ids || rid;
  end loop;

  update public.households set setup_step = 'debts-goals' where id = hid;
  return jsonb_build_object('debts', to_jsonb(debt_ids), 'goals', to_jsonb(goal_ids));
end;
$$;

-- Adds the app-managed lines (PRD US-15 AC2) and marks setup complete (US-16 AC3).
create or replace function public.setup_complete()
returns void
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.setup_household();
  bid uuid := private.ensure_setup_budget(hid);
  sys record;
  total bigint;
  cid uuid;
begin
  for sys in select * from (values
      ('debt_payments', 'Debt payments', 'debts'),
      ('sinking_funds', 'Sinking funds', 'saving'),
      ('savings_goals', 'Savings goals', 'saving')
    ) as v(key, name, grp)
  loop
    total := case sys.key
      when 'debt_payments' then (select coalesce(sum(d.min_payment_cents), 0) from public.debts d where d.household_id = hid and d.archived_at is null)
      when 'sinking_funds' then (select coalesce(sum(g.monthly_cents), 0) from public.goals g where g.household_id = hid and g.kind = 'sinking_fund' and g.archived_at is null)
      else (select coalesce(sum(g.monthly_cents), 0) from public.goals g where g.household_id = hid and g.kind = 'goal' and g.archived_at is null)
    end;
    select c.id into cid from public.categories c where c.household_id = hid and c.system_key = sys.key;
    if total > 0 then
      if cid is null then
        insert into public.categories (household_id, name, category_group, system_key, sort_order)
        values (hid, sys.name, sys.grp, sys.key, 100) returning id into cid;
      end if;
      insert into public.budget_lines (household_id, budget_id, category_id, planned_cents)
      values (hid, bid, cid, total)
      on conflict (budget_id, category_id) do update set planned_cents = excluded.planned_cents;
    elsif cid is not null then
      delete from public.budget_lines where category_id = cid;
      delete from public.categories where id = cid;
    end if;
  end loop;

  update public.households set setup_completed_at = now(), setup_step = null where id = hid;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.setup_save_basics(text, smallint, text)', 'public.setup_save_income(jsonb)',
    'public.setup_save_categories(text, jsonb)', 'public.setup_save_debts_goals(jsonb, jsonb)', 'public.setup_complete()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
