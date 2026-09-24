-- The Ledger Loft: changing budget setup (PRD US-41, L4 §3.1) and deleting an account (US-44).
-- Synthetic users; dates relative to today; always rolls back.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a7';
  b uuid := '00000000-0000-4000-8000-0000000000b7';
  ha uuid; hb uuid;
  today date := (now() at time zone 'Africa/Johannesburg')::date;
  cur text; nxt text; nxt2 text;
  cur_b record; nxt_b record; nxt2_b record;
  r record;
  t_early uuid; t_late uuid; cat uuid;
  n bigint;
  passed int := 0;
  failures text[] := '{}';
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', 'settings-a@example.test'),
         ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated', 'settings-b@example.test');
  select household_id into ha from public.household_members where user_id = a;
  select household_id into hb from public.household_members where user_id = b;
  update public.households set month_start_day = 1 where id in (ha, hb);
  cur := public.period_for(today, 1::smallint);
  nxt := to_char(to_date(cur || '-01', 'YYYY-MM-DD') + interval '1 month', 'YYYY-MM');
  nxt2 := to_char(to_date(cur || '-01', 'YYYY-MM-DD') + interval '2 months', 'YYYY-MM');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Not before setup is finished
  begin
    perform public.change_budget_setup('monthly', 25::smallint, 'flexible');
    failures := failures || text 'changed before setup';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  execute 'reset role';
  update public.households set setup_completed_at = now() where id = ha;
  execute 'set local role authenticated';

  perform public.ensure_budget(cur);
  perform public.ensure_budget(nxt);
  insert into public.categories (household_id, name, category_group) values (ha, 'Groceries', 'everyday') returning id into cat;
  -- Two future-dated transactions next month: the 10th and the 26th
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id)
  values (ha, 'outflow', 100, to_date(nxt || '-10', 'YYYY-MM-DD'), cat) returning id into t_early;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id)
  values (ha, 'outflow', 100, to_date(nxt || '-26', 'YYYY-MM-DD'), cat) returning id into t_late;
  select * into cur_b from public.budgets where period = cur;

  -- Style and pay frequency change on their own
  select * into r from public.change_budget_setup('weekly', 1::smallint, 'zero_based');
  if not r.start_day_changed and (select pay_frequency || '/' || budget_style from public.households where id = ha) = 'weekly/zero_based'
  then passed := passed + 1; else failures := failures || text 'style/frequency'; end if;

  -- Start day 1 -> 25 applies from next month: this month keeps its dates, next month is the transition
  select * into r from public.change_budget_setup('weekly', 25::smallint, 'zero_based');
  select * into nxt_b from public.budgets where period = nxt;
  if r.start_day_changed and r.transition_period = nxt
     and (select starts_on || '/' || ends_on from public.budgets where period = cur) = cur_b.starts_on || '/' || cur_b.ends_on
     and nxt_b.starts_on = cur_b.ends_on + 1
     and nxt_b.ends_on = to_date(nxt || '-24', 'YYYY-MM-DD')
     and r.transition_ends = nxt_b.ends_on
  then passed := passed + 1; else failures := failures || format('transition %s %s–%s', r.transition_period, nxt_b.starts_on, nxt_b.ends_on); end if;
  -- Transactions follow: the 10th stays in the transition month, the 26th moves to the month after
  if (select period from public.transactions_manual where id = t_early) = nxt
     and (select period from public.transactions_manual where id = t_late) = nxt2
  then passed := passed + 1; else failures := failures || text 'transactions not moved'; end if;
  -- A new transaction in this month still belongs to this month
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id)
  values (ha, 'outflow', 100, cur_b.ends_on, cat);
  if (select period from public.transactions_manual where occurred_on = cur_b.ends_on and household_id = ha) = cur then passed := passed + 1; else failures := failures || text 'current month date'; end if;
  -- The month after the transition follows the new day, back to back
  perform public.ensure_budget(nxt2);
  select * into nxt2_b from public.budgets where period = nxt2;
  if nxt2_b.starts_on = to_date(nxt || '-25', 'YYYY-MM-DD') and nxt2_b.ends_on = to_date(nxt2 || '-24', 'YYYY-MM-DD')
  then passed := passed + 1; else failures := failures || format('after transition %s–%s', nxt2_b.starts_on, nxt2_b.ends_on); end if;

  -- Back to the 1st: the months after this one move again, still with no gaps or overlaps
  select * into r from public.change_budget_setup('monthly', 1::smallint, 'flexible');
  select * into nxt_b from public.budgets where period = nxt;
  if r.transition_period = nxt and nxt_b.starts_on = cur_b.ends_on + 1
     and nxt_b.ends_on = (to_date(nxt || '-01', 'YYYY-MM-DD') + interval '1 month')::date - 1
  then passed := passed + 1; else failures := failures || text 'change back'; end if;
  select count(*) into n from public.budgets x join public.budgets y
    on x.household_id = y.household_id and x.id < y.id and x.starts_on <= y.ends_on and y.starts_on <= x.ends_on
  where x.household_id = ha;
  if n = 0 then passed := passed + 1; else failures := failures || text 'overlapping months'; end if;
  select count(*) into n from (
    select starts_on, lag(ends_on) over (order by starts_on) as prev_end from public.budgets where household_id = ha
  ) s where prev_end is not null and starts_on <> prev_end + 1;
  if n = 0 then passed := passed + 1; else failures := failures || text 'gaps between months'; end if;

  -- Bad values
  begin
    perform public.change_budget_setup('monthly', 29::smallint, 'flexible');
    failures := failures || text 'start day 29';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  begin
    perform public.change_budget_setup('daily', 1::smallint, 'flexible');
    failures := failures || text 'pay frequency';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  -- Deleting an account: needs DELETE, removes the user and their household, keeps a data-free audit event
  begin
    perform public.delete_my_account('delete');
    failures := failures || text 'deleted without DELETE';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  perform public.delete_my_account('DELETE');
  execute 'reset role';
  if not exists (select 1 from auth.users where id = a) and not exists (select 1 from public.households where id = ha)
     and not exists (select 1 from public.transactions_manual where household_id = ha)
  then passed := passed + 1; else failures := failures || text 'account not deleted'; end if;
  if exists (select 1 from public.audit_events where action = 'account.deleted' and entity_id = a and household_id is null and actor_id is null)
  then passed := passed + 1; else failures := failures || text 'no deletion audit'; end if;
  if exists (select 1 from auth.users where id = b) and exists (select 1 from public.households where id = hb) then passed := passed + 1; else failures := failures || text 'other account touched'; end if;

  -- Signed out can't call it
  execute 'set local role anon';
  begin
    perform public.delete_my_account('DELETE');
    failures := failures || text 'anon delete';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  execute 'reset role';

  raise exception 'SETTINGS_TESTS passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0),
    case when array_length(failures, 1) > 0 then E'\n - ' || array_to_string(failures, E'\n - ') else '' end;
end;
$$;
