-- The Ledger Loft: goals, sinking funds and debts (PRD US-30…US-37, P-3, P-4). Synthetic users; always rolls back.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a4';
  b uuid := '00000000-0000-4000-8000-0000000000b4';
  ha uuid;
  cur text;
  bid uuid;
  g1 uuid; g2 uuid; f1 uuid; d1 uuid; c uuid; tid uuid;
  cat uuid; r text; bal bigint;
  n bigint;
  passed int := 0;
  failures text[] := '{}';
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', 'goals-a@example.test'),
         ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated', 'goals-b@example.test');
  select household_id into ha from public.household_members where user_id = a;
  cur := public.period_for((now() at time zone 'Africa/Johannesburg')::date, 1::smallint);

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  bid := public.ensure_budget(cur);

  -- Creating a goal creates the app category and this month's line, planned at its monthly amount
  g1 := public.create_goal('goal', ' Emergency fund ', 2000000, 80000, 640000, null);
  select id into cat from public.categories where system_key = 'savings_goals';
  select planned_cents into n from public.budget_lines where budget_id = bid and category_id = cat;
  if cat is not null and n = 80000 then passed := passed + 1; else failures := failures || format('goal line %s', n); end if;
  if (select name from public.goals where id = g1) = 'Emergency fund' then passed := passed + 1; else failures := failures || 'name not trimmed'; end if;
  -- A second goal doesn't change the plan the user already has
  g2 := public.create_goal('goal', 'Holiday', 800000, 0, 0, null);
  select planned_cents into n from public.budget_lines where budget_id = bid and category_id = cat;
  if n = 80000 then passed := passed + 1; else failures := failures || 'second goal changed plan'; end if;
  -- A sinking fund needs a due month
  begin
    perform public.create_goal('sinking_fund', 'School fees', 720000, 60000, 0, null);
    failures := failures || 'fund without due month';
  exception when check_violation then passed := passed + 1;
  end;
  f1 := public.create_goal('sinking_fund', 'School fees', 720000, 60000, 480000, '2027-01');
  if exists (select 1 from public.categories where system_key = 'sinking_funds') then passed := passed + 1; else failures := failures || 'no sinking category'; end if;

  -- Add money: contribution plus a spending transaction in the app category, audited
  c := public.goal_move_money(g1, 'in', 50000, current_date);
  select transaction_id into tid from public.goal_contributions where id = c;
  select count(*) into n from public.transactions_manual
  where id = tid and kind = 'outflow' and amount_cents = 50000 and category_id = cat and description = 'Added to Emergency fund';
  if n = 1 then passed := passed + 1; else failures := failures || 'add money transaction'; end if;
  if exists (select 1 from public.audit_events where action = 'goal.money_added' and entity_id = c) then passed := passed + 1; else failures := failures || 'no audit event'; end if;
  -- Taking out can't make saved negative (saved is 6 400 + 500 = 6 900)
  begin
    perform public.goal_move_money(g1, 'out', 690001, current_date);
    failures := failures || 'took out more than saved';
  exception when invalid_parameter_value then
    if sqlerrm = 'not that much saved' then passed := passed + 1; else failures := failures || sqlerrm; end if;
  end;
  c := public.goal_move_money(g1, 'out', 690000, current_date);
  select count(*) into n from public.transactions_manual t join public.goal_contributions gc on gc.transaction_id = t.id
  where gc.id = c and t.kind = 'refund';
  if n = 1 then passed := passed + 1; else failures := failures || 'take out is not a refund'; end if;

  -- Linked transactions change only through their goal or debt
  begin
    update public.transactions_manual set amount_cents = 1 where id = tid;
    failures := failures || 'linked transaction edited';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    update public.transactions_manual set deleted_at = now() where id = tid;
    failures := failures || 'linked transaction soft-deleted';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- Remove: archive keeps history, delete removes it all; a goal with no money moved is just deleted
  r := public.remove_goal(g1, 'archive');
  if r = 'archived' and exists (select 1 from public.transactions_manual where id = tid) then passed := passed + 1; else failures := failures || 'archive goal'; end if;
  begin
    perform public.goal_move_money(g1, 'in', 100, current_date);
    failures := failures || 'money added to archived goal';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  r := public.remove_goal(g1, 'delete');
  select count(*) into n from public.transactions_manual where category_id = cat;
  if r = 'deleted' and n = 0 and not exists (select 1 from public.goals where id = g1) then passed := passed + 1; else failures := failures || format('delete goal left %s', n); end if;
  r := public.remove_goal(g2, 'archive');
  if r = 'deleted' then passed := passed + 1; else failures := failures || 'empty goal archived'; end if;

  -- Debts
  d1 := public.create_debt('Store card', 215000, 45000, 2100, '  ');
  select id into cat from public.categories where system_key = 'debt_payments';
  select planned_cents into n from public.budget_lines where budget_id = bid and category_id = cat;
  if n = 45000 and (select note from public.debts where id = d1) is null then passed := passed + 1; else failures := failures || 'debt line or note'; end if;
  bal := public.debt_record_payment(d1, 45000, current_date, null);
  select count(*) into n from public.transactions_manual where category_id = cat and kind = 'outflow' and amount_cents = 45000;
  if bal = 170000 and n = 1 then passed := passed + 1; else failures := failures || format('payment balance %s', bal); end if;
  begin
    perform public.debt_record_payment(d1, 200000, current_date, null);
    failures := failures || 'overpayment without confirm';
  exception when invalid_parameter_value then
    if sqlerrm = 'payment is more than the balance' then passed := passed + 1; else failures := failures || sqlerrm; end if;
  end;
  bal := public.debt_record_payment(d1, 200000, current_date, 'Settled', true);
  if bal = 0 and (select paid_off_on from public.debts where id = d1) = current_date then passed := passed + 1; else failures := failures || 'paid off'; end if;
  begin
    perform public.debt_record_payment(d1, 100, current_date, null, true);
    failures := failures || 'payment on paid-off debt';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  select count(*) into n from public.transactions_manual where category_id = cat;
  perform public.debt_set_balance(d1, 12000, current_date, 'Interest from statement');
  if (select balance_cents from public.debts where id = d1) = 12000
     and (select paid_off_on from public.debts where id = d1) is null
     and (select count(*) from public.transactions_manual where category_id = cat) = n
  then passed := passed + 1; else failures := failures || 'set balance'; end if;
  if exists (select 1 from public.audit_events where action = 'debt.balance_updated') then passed := passed + 1; else failures := failures || 'no balance audit'; end if;
  begin
    perform public.debt_set_balance(d1, -1, current_date, null);
    failures := failures || 'negative balance';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  -- Hidden checklist items accept only known keys
  update public.households set checklist_hidden = array['weekly'] where id = ha;
  begin
    update public.households set checklist_hidden = array['bogus'] where id = ha;
    failures := failures || 'unknown checklist key';
  exception when check_violation then passed := passed + 1;
  end;

  -- Another household can't touch these
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.goal_move_money(f1, 'in', 100, current_date);
    failures := failures || 'B added money to A''s fund';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  begin
    perform public.debt_record_payment(d1, 100, current_date, null, true);
    failures := failures || 'B paid A''s debt';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  begin
    perform public.remove_debt(d1, 'delete');
    failures := failures || 'B removed A''s debt';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  r := public.remove_debt(d1, 'delete');
  select count(*) into n from public.transactions_manual where category_id = cat;
  if r = 'deleted' and n = 0 then passed := passed + 1; else failures := failures || 'delete debt'; end if;
  execute 'reset role';

  raise exception 'GOALS_DEBTS_TESTS passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0),
    case when array_length(failures, 1) > 0 then E'\n - ' || array_to_string(failures, E'\n - ') else '' end;
end;
$$;
