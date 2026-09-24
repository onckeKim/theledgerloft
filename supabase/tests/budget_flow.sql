-- The Ledger Loft: monthly budget functions (PRD US-21…US-25). Synthetic users; always rolls back.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a2';
  b uuid := '00000000-0000-4000-8000-0000000000b2';
  ha uuid;
  sep uuid; oct uuid; bid_b uuid; again uuid;
  groceries uuid; transport uuid; gifts uuid; r text;
  n bigint; total bigint; rng record;
  passed int := 0;
  failures text[] := '{}';
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', 'budget-a@example.test'),
         ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated', 'budget-b@example.test');
  select household_id into ha from public.household_members where user_id = a;

  -- period_range (L4 §3)
  select * into rng from public.period_range('2026-09', 25::smallint);
  if (rng.starts_on, rng.ends_on) = ('2026-08-25'::date, '2026-09-24'::date) then passed := passed + 1; else failures := failures || text 'range 25'; end if;
  select * into rng from public.period_range('2028-02', 1::smallint);
  if (rng.starts_on, rng.ends_on) = ('2028-02-01'::date, '2028-02-29'::date) then passed := passed + 1; else failures := failures || text 'range leap'; end if;
  select * into rng from public.period_range('2026-03', 28::smallint);
  if (rng.starts_on, rng.ends_on) = ('2026-02-28'::date, '2026-03-27'::date) then passed := passed + 1; else failures := failures || text 'range 28'; end if;
  begin
    perform public.period_range('2026-13', 1::smallint);
    failures := failures || text 'range accepted month 13';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  sep := public.ensure_budget('2026-09');
  again := public.ensure_budget('2026-09');
  if sep = again then passed := passed + 1; else failures := failures || text 'ensure_budget not idempotent'; end if;

  groceries := public.add_category(sep, 'Groceries', 'everyday', 340000);
  transport := public.add_category(sep, 'Transport', 'everyday', 140000);
  gifts := public.add_category(sep, 'Gifts', 'everyday', 0);
  begin
    perform public.add_category(sep, 'groceries', 'fixed', 1);
    failures := failures || text 'duplicate category accepted';
  exception when unique_violation then passed := passed + 1;
  end;

  -- move money keeps the total
  perform public.move_budget_money(sep, groceries, transport, 25000);
  select sum(planned_cents) into total from public.budget_lines where budget_id = sep;
  select planned_cents into n from public.budget_lines where budget_id = sep and category_id = transport;
  if total = 480000 and n = 165000 then passed := passed + 1; else failures := failures || format('move: total %s transport %s', total, n); end if;
  begin
    perform public.move_budget_money(sep, groceries, transport, 99999999);
    failures := failures || text 'moved more than planned';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  -- a used category is archived, an unused one deleted
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id) values (ha, 'outflow', 5000, '2026-09-10', transport);
  r := public.remove_category(transport);
  if r = 'archived' then passed := passed + 1; else failures := failures || format('remove used: %s', r); end if;
  r := public.remove_category(gifts);
  if r = 'deleted' then passed := passed + 1; else failures := failures || format('remove unused: %s', r); end if;

  -- next month copies the plan, without archived categories
  oct := public.ensure_budget('2026-10');
  select count(*), coalesce(sum(planned_cents), 0) into n, total from public.budget_lines where budget_id = oct;
  if n = 1 and total = 315000 then passed := passed + 1; else failures := failures || format('october copy: %s lines, %s', n, total); end if;

  -- B can't touch A's budget
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  bid_b := public.ensure_budget('2026-09');
  if bid_b <> sep then passed := passed + 1; else failures := failures || text 'B got A budget'; end if;
  begin
    perform public.move_budget_money(sep, groceries, transport, 1);
    failures := failures || text 'B moved money in A budget';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  begin
    perform public.remove_category(groceries);
    failures := failures || text 'B removed A category';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  begin
    perform public.add_category(sep, 'Planted', 'everyday', 1);
    failures := failures || text 'B added a category to A budget';
  exception when foreign_key_violation or insufficient_privilege then passed := passed + 1;
  end;

  execute 'reset role';
  select count(*) into n from public.budget_lines where budget_id = sep;
  if n = 2 then passed := passed + 1; else failures := failures || format('A budget lines changed: %s', n); end if;

  raise exception 'BUDGET_TESTS passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0),
    case when array_length(failures, 1) > 0 then E'\n - ' || array_to_string(failures, E'\n - ') else '' end;
end;
$$;
