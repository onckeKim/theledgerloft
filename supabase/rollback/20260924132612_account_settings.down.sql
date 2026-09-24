-- Rollback for 20260924132612_account_settings.sql: back to the start-day rule only, no settings or deletion functions.
-- Budgets already re-dated by a start-day change keep their dates.
drop function if exists public.delete_my_account(text);
drop function if exists private.delete_my_account_impl(text);
drop function if exists public.change_budget_setup(text, smallint, text);

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
revoke all on function private.set_transaction_period() from public, anon, authenticated;

drop function if exists private.period_of(uuid, date);
