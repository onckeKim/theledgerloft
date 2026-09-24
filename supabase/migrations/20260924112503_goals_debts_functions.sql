-- Goals, sinking funds and debts (playbook L7b, PRD US-30…US-37, P-3, P-4), plus two L7 carry-overs:
-- hidden checklist items (US-25 AC2). Security invoker: RLS applies and the household comes from auth.uid().
-- Every action that touches money writes both of its records in one call, so they can't half-apply.
-- Rollback: see supabase/rollback/20260924112503_goals_debts_functions.down.sql

-- Checklist items the user has hidden (keys from src/lib/budget/schemas.ts CHECKLIST).
alter table public.households
  add column checklist_hidden text[] not null default '{}'
  check (checklist_hidden <@ array['income', 'bills', 'weekly', 'left', 'checkin']::text[]);

-- ---------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------

-- The app-managed category for goals, sinking funds or debt payments, created if missing. If the household
-- already has its own category with that name, the app one gets a distinguishing name.
create or replace function private.system_category(hid uuid, p_key text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  cid uuid;
  nm text;
  grp text;
begin
  select c.id into cid from public.categories c where c.household_id = hid and c.system_key = p_key;
  if cid is not null then
    update public.categories set archived_at = null where id = cid and archived_at is not null;
    return cid;
  end if;
  select v.nm, v.grp into nm, grp from (values
      ('debt_payments', 'Debt payments', 'debts'),
      ('sinking_funds', 'Sinking funds', 'saving'),
      ('savings_goals', 'Savings goals', 'saving')
    ) as v(key, nm, grp) where v.key = p_key;
  if nm is null then
    raise exception 'unknown system category' using errcode = '22023';
  end if;
  begin
    insert into public.categories (household_id, name, category_group, system_key, sort_order)
    values (hid, nm, grp, p_key, 100) returning id into cid;
  exception when unique_violation then
    insert into public.categories (household_id, name, category_group, system_key, sort_order)
    values (hid, nm || ' (app)', grp, p_key, 100) returning id into cid;
  end;
  return cid;
end;
$$;
revoke all on function private.system_category(uuid, text) from public, anon;
grant execute on function private.system_category(uuid, text) to authenticated;

-- Make sure this month's plan has a line for an app-managed category. An existing line is left alone:
-- the plan only changes when the user changes it.
create or replace function private.ensure_current_line(hid uuid, cid uuid, planned bigint)
returns void
language plpgsql
set search_path = ''
as $$
declare
  sd smallint;
  bid uuid;
begin
  select h.month_start_day into sd from public.households h where h.id = hid;
  select b.id into bid from public.budgets b
  where b.household_id = hid
    and b.period = public.period_for((now() at time zone 'Africa/Johannesburg')::date, sd);
  if bid is not null then
    insert into public.budget_lines (household_id, budget_id, category_id, planned_cents)
    values (hid, bid, cid, planned)
    on conflict (budget_id, category_id) do nothing;
  end if;
end;
$$;
revoke all on function private.ensure_current_line(uuid, uuid, bigint) from public, anon;
grant execute on function private.ensure_current_line(uuid, uuid, bigint) to authenticated;

create or replace function private.require_household()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  hid uuid := private.current_household_id();
begin
  if hid is null then
    raise exception 'no household for this user' using errcode = '42501';
  end if;
  return hid;
end;
$$;
revoke all on function private.require_household() from public, anon;
grant execute on function private.require_household() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Linked transactions: a transaction written for a goal or debt changes only through that goal or debt,
-- so the goal's saved amount (or the debt's history) and the budget actuals can't drift apart.
-- ---------------------------------------------------------------------------------------------
create or replace function private.guard_linked_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('ledgerloft.linked_write', true), '') = 'on' then
    return coalesce(new, old);
  end if;
  -- The whole household is being deleted (account deletion): everything goes.
  if tg_op = 'DELETE' and not exists (select 1 from public.households h where h.id = old.household_id) then
    return old;
  end if;
  if exists (select 1 from public.goal_contributions g where g.transaction_id = old.id)
     or exists (select 1 from public.debt_payments d where d.transaction_id = old.id) then
    raise exception 'this transaction belongs to a goal or debt' using errcode = '42501', hint = 'linked';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.guard_linked_transaction() from public, anon, authenticated;
create trigger guard_linked before update or delete on public.transactions_manual
  for each row execute function private.guard_linked_transaction();

-- Audit: money moved for a goal or debt (no amounts or names in the log, docs/data-classification.md).
create or replace function private.audit_goal_money()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_event(new.household_id,
    case new.direction when 'in' then 'goal.money_added' else 'goal.money_taken_out' end,
    'goal_contributions', new.id);
  return new;
end;
$$;
revoke all on function private.audit_goal_money() from public, anon, authenticated;
create trigger audit_goal_money after insert on public.goal_contributions
  for each row execute function private.audit_goal_money();

create or replace function private.audit_debt_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_event(new.household_id,
    case new.kind when 'payment' then 'debt.payment_recorded' else 'debt.balance_updated' end,
    'debt_payments', new.id);
  return new;
end;
$$;
revoke all on function private.audit_debt_payment() from public, anon, authenticated;
create trigger audit_debt_payment after insert on public.debt_payments
  for each row execute function private.audit_debt_payment();

-- ---------------------------------------------------------------------------------------------
-- Goals and sinking funds
-- ---------------------------------------------------------------------------------------------

-- New goal or sinking fund (US-30, US-31). Validation of names, amounts and due month happens in the app too;
-- table checks are the backstop.
create or replace function public.create_goal(
  p_kind text, p_name text, p_target bigint, p_monthly bigint, p_starting bigint, p_due text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  gid uuid;
  cid uuid;
begin
  if p_kind not in ('goal', 'sinking_fund') then
    raise exception 'unknown goal kind' using errcode = '22023';
  end if;
  insert into public.goals (household_id, kind, name, target_cents, monthly_cents, starting_cents, due_period)
  values (hid, p_kind, btrim(p_name), p_target, coalesce(p_monthly, 0), coalesce(p_starting, 0),
          case when p_kind = 'sinking_fund' then p_due end)
  returning id into gid;
  cid := private.system_category(hid, case p_kind when 'goal' then 'savings_goals' else 'sinking_funds' end);
  perform private.ensure_current_line(hid, cid, coalesce(p_monthly, 0));
  return gid;
end;
$$;

-- Add money to, or take money out of, a goal or fund (US-32, P-3): a contribution plus a matching
-- spending (in) or refund (out) transaction in the app-managed category. Taking out can't make saved negative.
create or replace function public.goal_move_money(p_goal uuid, p_direction text, p_cents bigint, p_on date)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  g record;
  saved bigint;
  cid uuid;
  tid uuid;
  contribution uuid;
begin
  if p_direction not in ('in', 'out') then
    raise exception 'direction must be in or out' using errcode = '22023';
  end if;
  if p_cents is null or p_cents < 1 then
    raise exception 'amount must be at least 1 cent' using errcode = '22023';
  end if;
  select * into g from public.goals where id = p_goal and household_id = hid for update;
  if not found or g.archived_at is not null then
    raise exception 'unknown goal' using errcode = '22023';
  end if;
  select g.starting_cents + coalesce(sum(case c.direction when 'in' then c.amount_cents else -c.amount_cents end), 0)
    into saved
  from public.goal_contributions c where c.goal_id = p_goal;
  if p_direction = 'out' and p_cents > saved then
    raise exception 'not that much saved' using errcode = '22023', hint = 'insufficient';
  end if;

  cid := private.system_category(hid, case g.kind when 'goal' then 'savings_goals' else 'sinking_funds' end);
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id, description)
  values (hid, case p_direction when 'in' then 'outflow' else 'refund' end, p_cents, p_on, cid,
          case p_direction when 'in' then 'Added to ' else 'Taken from ' end || g.name)
  returning id into tid;
  insert into public.goal_contributions (household_id, goal_id, direction, amount_cents, happened_on, transaction_id)
  values (hid, p_goal, p_direction, p_cents, p_on, tid)
  returning id into contribution;
  return contribution;
end;
$$;

-- Remove a goal (US-33 AC2). 'archive' keeps it and its history out of sight; 'delete' removes the goal, its
-- contributions and their transactions. A goal with no money moved yet is simply deleted.
create or replace function public.remove_goal(p_goal uuid, p_mode text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  tx uuid[];
begin
  if p_mode not in ('archive', 'delete') then
    raise exception 'mode must be archive or delete' using errcode = '22023';
  end if;
  perform 1 from public.goals where id = p_goal and household_id = hid for update;
  if not found then
    raise exception 'unknown goal' using errcode = '22023';
  end if;
  if p_mode = 'archive' and exists (select 1 from public.goal_contributions c where c.goal_id = p_goal) then
    update public.goals set archived_at = now() where id = p_goal;
    return 'archived';
  end if;
  select coalesce(array_agg(c.transaction_id) filter (where c.transaction_id is not null), '{}') into tx
  from public.goal_contributions c where c.goal_id = p_goal;
  perform set_config('ledgerloft.linked_write', 'on', true);
  delete from public.goals where id = p_goal; -- contributions cascade
  delete from public.transactions_manual where id = any (tx) and household_id = hid;
  perform set_config('ledgerloft.linked_write', '', true);
  return 'deleted';
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Debts
-- ---------------------------------------------------------------------------------------------

create or replace function public.create_debt(p_name text, p_balance bigint, p_min bigint, p_rate integer, p_note text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  did uuid;
begin
  insert into public.debts (household_id, name, opening_balance_cents, balance_cents, min_payment_cents, rate_bp, note)
  values (hid, btrim(p_name), p_balance, p_balance, p_min, p_rate, nullif(btrim(p_note), ''))
  returning id into did;
  perform private.ensure_current_line(hid, private.system_category(hid, 'debt_payments'), p_min);
  return did;
end;
$$;

-- Record a payment (US-35, P-4): the payment plus a spending transaction in "Debt payments". A payment larger
-- than the balance needs p_confirm_over; the balance never goes below R 0,00. Returns the new balance.
create or replace function public.debt_record_payment(
  p_debt uuid, p_cents bigint, p_on date, p_note text, p_confirm_over boolean default false
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  d record;
  new_balance bigint;
  tid uuid;
begin
  if p_cents is null or p_cents < 1 then
    raise exception 'amount must be at least 1 cent' using errcode = '22023';
  end if;
  select * into d from public.debts where id = p_debt and household_id = hid for update;
  if not found or d.archived_at is not null then
    raise exception 'unknown debt' using errcode = '22023';
  end if;
  if d.balance_cents = 0 then
    raise exception 'this debt is paid off' using errcode = '22023', hint = 'paid_off';
  end if;
  if p_cents > d.balance_cents and not coalesce(p_confirm_over, false) then
    raise exception 'payment is more than the balance' using errcode = '22023', hint = 'over_balance';
  end if;
  new_balance := greatest(0, d.balance_cents - p_cents);

  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id, description)
  values (hid, 'outflow', p_cents, p_on, private.system_category(hid, 'debt_payments'), 'Payment: ' || d.name)
  returning id into tid;
  insert into public.debt_payments (household_id, debt_id, kind, amount_cents, happened_on, transaction_id, note)
  values (hid, p_debt, 'payment', p_cents, p_on, tid, nullif(btrim(p_note), ''));
  update public.debts
  set balance_cents = new_balance,
      paid_off_on = case when new_balance = 0 then p_on else null end
  where id = p_debt;
  return new_balance;
end;
$$;

-- Update the balance from a statement (US-36). No spending transaction; interest and fees show up this way.
create or replace function public.debt_set_balance(p_debt uuid, p_cents bigint, p_on date, p_note text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  if p_cents is null or p_cents < 0 then
    raise exception 'balance can''t be negative' using errcode = '22023';
  end if;
  perform 1 from public.debts where id = p_debt and household_id = hid and archived_at is null for update;
  if not found then
    raise exception 'unknown debt' using errcode = '22023';
  end if;
  insert into public.debt_payments (household_id, debt_id, kind, new_balance_cents, happened_on, note)
  values (hid, p_debt, 'balance_adjustment', p_cents, p_on, nullif(btrim(p_note), ''));
  update public.debts
  set balance_cents = p_cents,
      paid_off_on = case when p_cents = 0 then p_on else null end
  where id = p_debt;
end;
$$;

-- Remove a debt: 'archive' keeps its history; 'delete' removes it, its payments and their transactions.
create or replace function public.remove_debt(p_debt uuid, p_mode text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  tx uuid[];
begin
  if p_mode not in ('archive', 'delete') then
    raise exception 'mode must be archive or delete' using errcode = '22023';
  end if;
  perform 1 from public.debts where id = p_debt and household_id = hid for update;
  if not found then
    raise exception 'unknown debt' using errcode = '22023';
  end if;
  if p_mode = 'archive' and exists (select 1 from public.debt_payments p where p.debt_id = p_debt) then
    update public.debts set archived_at = now() where id = p_debt;
    return 'archived';
  end if;
  select coalesce(array_agg(p.transaction_id) filter (where p.transaction_id is not null), '{}') into tx
  from public.debt_payments p where p.debt_id = p_debt;
  perform set_config('ledgerloft.linked_write', 'on', true);
  delete from public.debts where id = p_debt; -- payments cascade
  delete from public.transactions_manual where id = any (tx) and household_id = hid;
  perform set_config('ledgerloft.linked_write', '', true);
  return 'deleted';
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.create_goal(text, text, bigint, bigint, bigint, text)',
    'public.goal_move_money(uuid, text, bigint, date)',
    'public.remove_goal(uuid, text)',
    'public.create_debt(text, bigint, bigint, integer, text)',
    'public.debt_record_payment(uuid, bigint, date, text, boolean)',
    'public.debt_set_balance(uuid, bigint, date, text)',
    'public.remove_debt(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
