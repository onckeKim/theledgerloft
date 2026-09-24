-- The Ledger Loft: guided setup functions (PRD US-10…US-16). Same conventions as rls_isolation.sql:
-- synthetic users only, always ends by raising SETUP_TESTS passed=N failed=M so everything rolls back.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b1';
  ha uuid;
  ids uuid[]; ids2 uuid[]; dg jsonb;
  n bigint; total bigint; p text; bounds record;
  passed int := 0;
  failures text[] := '{}';
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', 'setup-a@example.test'),
         ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated', 'setup-b@example.test');
  select household_id into ha from public.household_members where user_id = a;

  -- period_bounds (L4 §3)
  select * into bounds from public.period_bounds('2026-09-24', 25::smallint);
  if (bounds.period, bounds.starts_on, bounds.ends_on) = ('2026-09', '2026-08-25'::date, '2026-09-24'::date) then passed := passed + 1; else failures := failures || text 'bounds start 25'; end if;
  select * into bounds from public.period_bounds('2028-02-10', 1::smallint);
  if (bounds.period, bounds.starts_on, bounds.ends_on) = ('2028-02', '2028-02-01'::date, '2028-02-29'::date) then passed := passed + 1; else failures := failures || text 'bounds leap'; end if;
  select * into bounds from public.period_bounds('2026-12-26', 25::smallint);
  if (bounds.period, bounds.starts_on, bounds.ends_on) = ('2027-01', '2026-12-25'::date, '2027-01-24'::date) then passed := passed + 1; else failures := failures || text 'bounds year end'; end if;

  -- ---------------------------------------------------------------- A completes setup (prototype household)
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  perform public.setup_save_basics('monthly', 1::smallint, 'flexible');
  select count(*) into n from public.budgets where household_id = ha;
  if n = 1 then passed := passed + 1; else failures := failures || format('basics created %s budgets', n); end if;

  ids := public.setup_save_income('[{"name":"Salary","monthly_cents":1950000},{"name":"Side income","monthly_cents":224000}]');
  -- autosave again with the ids: must update, not duplicate
  ids2 := public.setup_save_income(jsonb_build_array(
    jsonb_build_object('id', ids[1], 'name', 'Salary', 'monthly_cents', 1950000),
    jsonb_build_object('id', ids[2], 'name', 'Side income', 'monthly_cents', 224000)));
  select count(*) into n from public.income_items where household_id = ha;
  if n = 2 and ids = ids2 then passed := passed + 1; else failures := failures || format('income resave: %s rows', n); end if;

  -- removing a row from the list deletes it
  perform public.setup_save_income(jsonb_build_array(jsonb_build_object('id', ids[1], 'name', 'Salary', 'monthly_cents', 1950000)));
  select count(*) into n from public.income_items where household_id = ha;
  if n = 1 then passed := passed + 1; else failures := failures || text 'income removal'; end if;
  perform public.setup_save_income(jsonb_build_array(
    jsonb_build_object('id', ids[1], 'name', 'Salary', 'monthly_cents', 1950000),
    jsonb_build_object('name', 'Side income', 'monthly_cents', 224000)));

  ids := public.setup_save_categories('fixed', '[{"name":"Housing","planned_cents":620000},{"name":"Electricity & water","planned_cents":110000},{"name":"Phone & data","planned_cents":45000},{"name":"Insurance","planned_cents":60000}]');
  perform public.setup_save_categories('everyday', '[{"name":"Groceries","planned_cents":340000},{"name":"Transport","planned_cents":140000},{"name":"Personal & fun","planned_cents":60000}]');

  -- a name already used in another group is rejected, and nothing from that save is kept
  begin
    perform public.setup_save_categories('everyday', '[{"name":"Groceries","planned_cents":340000},{"name":"housing","planned_cents":1}]');
    failures := failures || text 'duplicate category accepted';
  exception when unique_violation then passed := passed + 1;
  end;
  select count(*) into n from public.categories where household_id = ha and category_group = 'everyday';
  if n = 3 then passed := passed + 1; else failures := failures || format('failed save changed everyday categories (%s)', n); end if;

  dg := public.setup_save_debts_goals(
    '[{"name":"Store card","balance_cents":215000,"min_payment_cents":45000,"rate_bp":2100},
      {"name":"Credit card","balance_cents":890000,"min_payment_cents":120000,"rate_bp":2075},
      {"name":"Personal loan","balance_cents":1460000,"min_payment_cents":95000,"rate_bp":2400}]',
    '[{"kind":"goal","name":"Emergency fund","target_cents":2000000,"monthly_cents":80000,"starting_cents":640000},
      {"kind":"goal","name":"Holiday","target_cents":800000,"monthly_cents":0,"starting_cents":120000},
      {"kind":"sinking_fund","name":"School fees","target_cents":720000,"monthly_cents":60000,"starting_cents":480000,"due_period":"2027-01"},
      {"kind":"sinking_fund","name":"December","target_cents":500000,"monthly_cents":50000,"starting_cents":400000,"due_period":"2026-12"},
      {"kind":"sinking_fund","name":"Car licence & service","target_cents":300000,"monthly_cents":25000,"starting_cents":175000,"due_period":"2027-03"}]');
  if jsonb_array_length(dg -> 'debts') = 3 and jsonb_array_length(dg -> 'goals') = 5 then passed := passed + 1; else failures := failures || text 'debts/goals ids'; end if;

  perform public.setup_complete();
  select coalesce(sum(planned_cents), 0) into total from public.budget_lines where household_id = ha;
  if total = 1850000 then passed := passed + 1; else failures := failures || format('planned total %s, expected 1850000 (L4 B1)', total); end if;
  select coalesce(sum(l.planned_cents), 0) into total from public.budget_lines l join public.categories c on c.id = l.category_id
   where l.household_id = ha and c.system_key = 'debt_payments';
  if total = 260000 then passed := passed + 1; else failures := failures || format('debt payments line %s', total); end if;
  select count(*) into n from public.audit_events where household_id = ha and action = 'household.setup_completed';
  if n = 1 then passed := passed + 1; else failures := failures || text 'setup_completed audit event'; end if;

  -- once complete, the setup functions refuse to run (their replace-the-list behaviour is setup-only)
  begin
    perform public.setup_save_income('[]');
    failures := failures || text 'setup_save_income ran after completion';
  exception when raise_exception then passed := passed + 1;
  end;
  select count(*) into n from public.income_items where household_id = ha;
  if n = 2 then passed := passed + 1; else failures := failures || text 'income changed after completion'; end if;

  -- ---------------------------------------------------------------- B's setup only ever touches B's household
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.setup_save_income('[]');
  begin
    -- A's ids are not B's: updating them must fail
    perform public.setup_save_income(jsonb_build_array(jsonb_build_object('id', ids2[1], 'name', 'Hijack', 'monthly_cents', 1)));
    failures := failures || text 'B updated A income via setup';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  execute 'reset role';
  select count(*) into n from public.income_items where household_id = ha and name = 'Salary';
  if n = 1 then passed := passed + 1; else failures := failures || text 'A income changed by B'; end if;

  -- signed-out visitors can't call setup functions
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  begin
    perform public.setup_complete();
    failures := failures || text 'anon called setup_complete';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  execute 'reset role';

  raise exception 'SETUP_TESTS passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0),
    case when array_length(failures, 1) > 0 then E'\n - ' || array_to_string(failures, E'\n - ') else '' end;
end;
$$;
