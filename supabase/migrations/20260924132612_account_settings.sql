-- Settings and account deletion (PRD US-41, US-44). Security invoker unless noted; the household comes from auth.uid().
-- Rollback: see supabase/rollback/20260924132612_account_settings.down.sql
--
-- Budget months follow the budgets that exist (L4 §3.1, D-041): once a month has a budget, its dates belong to it,
-- even if the month start day changes later. Only dates no budget covers use the start-day rule.

-- ---------------------------------------------------------------------------------------------
-- Which budget month a date belongs to
-- ---------------------------------------------------------------------------------------------
create or replace function private.period_of(hid uuid, d date)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select b.period from public.budgets b
     where b.household_id = hid and b.starts_on <= d and b.ends_on >= d
     limit 1),
    public.period_for(d, (select h.month_start_day from public.households h where h.id = hid))
  );
$$;
revoke all on function private.period_of(uuid, date) from public, anon;
grant execute on function private.period_of(uuid, date) to authenticated;

create or replace function private.set_transaction_period()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.households h where h.id = new.household_id) then
    raise exception 'unknown household' using errcode = '23503';
  end if;
  new.period := private.period_of(new.household_id, new.occurred_on);
  return new;
end;
$$;
revoke all on function private.set_transaction_period() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- New months never overlap existing ones
-- ---------------------------------------------------------------------------------------------
-- As before (copy the most recent earlier plan, skip archived categories), but the month's dates are clipped to start
-- the day after the previous budget ends and to end the day before the next one starts.
create or replace function public.ensure_budget(p_period text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.current_household_id();
  sd smallint;
  range record;
  s date;
  e date;
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
  s := greatest(range.starts_on,
    coalesce((select max(b.ends_on) + 1 from public.budgets b where b.household_id = hid and b.period < p_period), range.starts_on));
  e := least(range.ends_on,
    coalesce((select min(b.starts_on) - 1 from public.budgets b where b.household_id = hid and b.period > p_period), range.ends_on));
  if s > e then
    raise exception 'this month has no days left to plan' using errcode = '22023', hint = 'empty';
  end if;
  insert into public.budgets (household_id, period, starts_on, ends_on)
  values (hid, p_period, s, e) returning id into bid;

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

-- ---------------------------------------------------------------------------------------------
-- Change budget setup after onboarding (US-41)
-- ---------------------------------------------------------------------------------------------
-- Pay frequency and budget style change at once (amounts never change). A new month start day applies from the
-- next month: the current month keeps its dates, next month starts the day after it ends and runs to the end of that
-- month under the new start day (a one-off longer or shorter "transition" month), then every month follows the new day.
-- Returns the transition month when the start day changed.
create or replace function public.change_budget_setup(p_pay_frequency text, p_start_day smallint, p_style text)
returns table (start_day_changed boolean, transition_period text, transition_starts date, transition_ends date)
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  h record;
  today date := (now() at time zone 'Africa/Johannesburg')::date;
  cur record;
  nxt text;
  b record;
  range record;
  prev_end date;
  tb record;
begin
  if p_pay_frequency not in ('monthly', 'every_two_weeks', 'weekly', 'varies') then
    raise exception 'unknown pay frequency' using errcode = '22023';
  end if;
  if p_style not in ('flexible', 'zero_based') then
    raise exception 'unknown budget style' using errcode = '22023';
  end if;
  if p_start_day is null or p_start_day < 1 or p_start_day > 28 then
    raise exception 'start day must be between 1 and 28' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('budget:' || hid::text, 0));
  select * into h from public.households where id = hid for update;
  if h.setup_completed_at is null then
    raise exception 'finish setup first' using errcode = '22023', hint = 'setup';
  end if;

  update public.households set pay_frequency = p_pay_frequency, budget_style = p_style where id = hid;
  if p_start_day = h.month_start_day then
    return query select false, null::text, null::date, null::date;
    return;
  end if;

  -- The current month: the budget covering today, else the latest one that has started.
  select * into cur from public.budgets bb
  where bb.household_id = hid and bb.starts_on <= today
  order by (bb.ends_on >= today) desc, bb.starts_on desc
  limit 1;
  update public.households set month_start_day = p_start_day where id = hid;
  if cur is null then
    return query select true, null::text, null::date, null::date;
    return;
  end if;

  -- Months already created after the current one move to the new rule, back to back.
  prev_end := cur.ends_on;
  for b in select * from public.budgets bb where bb.household_id = hid and bb.starts_on > cur.ends_on order by bb.period loop
    select * into range from public.period_range(b.period, p_start_day);
    update public.budgets set starts_on = prev_end + 1, ends_on = range.ends_on where id = b.id;
    prev_end := range.ends_on;
  end loop;

  -- The transition month always exists, so no date is left without a month.
  nxt := to_char(to_date(cur.period || '-01', 'YYYY-MM-DD') + interval '1 month', 'YYYY-MM');
  perform public.ensure_budget(nxt);

  -- Transactions dated after the current month move to the month that now covers them.
  perform set_config('ledgerloft.linked_write', 'on', true);
  update public.transactions_manual t
  set period = private.period_of(hid, t.occurred_on)
  where t.household_id = hid and t.occurred_on > cur.ends_on
    and t.period is distinct from private.period_of(hid, t.occurred_on);
  perform set_config('ledgerloft.linked_write', '', true);

  select * into tb from public.budgets bb where bb.household_id = hid and bb.period = nxt;
  return query select true, tb.period, tb.starts_on, tb.ends_on;
end;
$$;
revoke all on function public.change_budget_setup(text, smallint, text) from public, anon;
grant execute on function public.change_budget_setup(text, smallint, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Delete my account (US-44)
-- ---------------------------------------------------------------------------------------------
-- Deletes the signed-in user. The auth.users trigger (D-029) deletes every household only they belong to, with all
-- its data. An audit event without financial data is kept (N11). SECURITY DEFINER in the private schema (deleting
-- from auth.users needs the owner's rights) behind an invoker wrapper; it can only ever delete the caller.
create or replace function private.delete_my_account_impl(p_confirm text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  if p_confirm is distinct from 'DELETE' then
    raise exception 'type DELETE to confirm' using errcode = '22023', hint = 'confirm';
  end if;
  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id)
  values (null, null, 'account.deleted', 'users', uid);
  delete from auth.users where id = uid;
end;
$$;
revoke all on function private.delete_my_account_impl(text) from public, anon;
grant execute on function private.delete_my_account_impl(text) to authenticated;

create or replace function public.delete_my_account(p_confirm text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.delete_my_account_impl(p_confirm); $$;
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
