-- The Ledger Loft: tenant isolation and schema checks (threat T1, playbook A4).
--
-- Run the whole file as a database owner (SQL editor, psql, or the Supabase MCP execute_sql tool).
-- It creates two SYNTHETIC users, exercises every household table as each of them and as a signed-out visitor,
-- and ALWAYS ends by raising an exception, so the transaction rolls back and nothing is kept.
-- Success looks like:  ERROR:  RLS_TESTS passed=N failed=0
-- Anything else lists the failures.

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000aa';
  b uuid := '00000000-0000-4000-8000-0000000000bb';
  ha uuid; hb uuid;
  cat_a uuid; cat_b uuid; budget_a uuid; budget_b uuid; tx_a uuid; inc_a uuid; debt_a uuid; goal_a uuid;
  n bigint; p text; t text;
  passed int := 0;
  failures text[] := '{}';
  household_tables text[] := array['accounts_manual', 'income_items', 'categories', 'budgets', 'budget_lines',
    'transactions_manual', 'debts', 'debt_payments', 'goals', 'goal_contributions', 'monthly_checkins', 'exports',
    'audit_events'];
begin
  -- ---------------------------------------------------------------- setup (as owner)
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', 'rls-user-a@example.test'),
         ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated', 'rls-user-b@example.test');
  select household_id into ha from public.household_members where user_id = a;
  select household_id into hb from public.household_members where user_id = b;
  if ha is null or hb is null or ha = hb then
    raise exception 'RLS_TESTS setup failed: sign-up trigger did not create separate households';
  end if;
  passed := passed + 1; -- sign-up provisioning

  -- ---------------------------------------------------------------- user A writes their own data
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.categories (household_id, name, category_group) values (ha, 'Groceries', 'everyday') returning id into cat_a;
  insert into public.budgets (household_id, period, starts_on, ends_on) values (ha, '2026-09', '2026-09-01', '2026-09-30') returning id into budget_a;
  insert into public.budget_lines (household_id, budget_id, category_id, planned_cents) values (ha, budget_a, cat_a, 340000);
  insert into public.income_items (household_id, name, monthly_cents) values (ha, 'Salary', 1950000) returning id into inc_a;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id, description)
    values (ha, 'outflow', 64215, '2026-09-24', cat_a, 'Weekly groceries') returning id into tx_a;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, income_item_id)
    values (ha, 'income', 1950000, '2026-09-25', inc_a);
  insert into public.debts (household_id, name, opening_balance_cents, balance_cents, rate_bp, min_payment_cents)
    values (ha, 'Store card', 215000, 215000, 2100, 45000) returning id into debt_a;
  insert into public.debt_payments (household_id, debt_id, kind, amount_cents, happened_on) values (ha, debt_a, 'payment', 45000, '2026-09-15');
  insert into public.goals (household_id, kind, name, target_cents, monthly_cents) values (ha, 'goal', 'Emergency fund', 2000000, 80000) returning id into goal_a;
  insert into public.goal_contributions (household_id, goal_id, direction, amount_cents, happened_on) values (ha, goal_a, 'in', 80000, '2026-09-01');
  insert into public.monthly_checkins (household_id, period, went_well) values (ha, '2026-09', 'Synthetic reflection');
  insert into public.exports (household_id, kind, period, spec_version) values (ha, 'pdf_summary', '2026-09', 'l4-1.0');
  insert into public.accounts_manual (household_id, name, kind) values (ha, 'Cash', 'cash');
  passed := passed + 1; -- A can write every table in own household

  select count(*) into n from public.audit_events where household_id = ha and action = 'export.created';
  if n = 1 then passed := passed + 1; else failures := failures || format('audit: export.created count %s', n); end if;

  select period into p from public.transactions_manual where id = tx_a;
  if p = '2026-09' then passed := passed + 1; else failures := failures || format('period trigger: got %s', p); end if;

  -- Month starting on the 25th: outside any budget, the 25th belongs to the next period (L4 vector P2);
  -- inside an existing budget the date stays with that budget (L4 §3.1, D-041)
  update public.households set month_start_day = 25 where id = ha;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id)
    values (ha, 'outflow', 1000, '2026-10-25', cat_a) returning period into p;
  if p = '2026-11' then passed := passed + 1; else failures := failures || format('period with start day 25: got %s', p); end if;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id)
    values (ha, 'outflow', 1000, '2026-09-25', cat_a) returning period into p;
  if p = '2026-09' then passed := passed + 1; else failures := failures || format('date inside a budget: got %s', p); end if;

  -- A sees only their own household
  select count(*) into n from public.households;
  if n = 1 then passed := passed + 1; else failures := failures || format('A sees %s households', n); end if;

  -- ---------------------------------------------------------------- user B tries to reach A's data
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.categories (household_id, name, category_group) values (hb, 'Groceries', 'everyday') returning id into cat_b;
  insert into public.budgets (household_id, period, starts_on, ends_on) values (hb, '2026-09', '2026-09-01', '2026-09-30') returning id into budget_b;

  -- B reads nothing of A's
  foreach t in array household_tables loop
    execute format('select count(*) from public.%I where household_id = $1', t) into n using ha;
    if n = 0 then passed := passed + 1; else failures := failures || format('B reads %s rows of A in %s', n, t); end if;
  end loop;
  select count(*) into n from public.households where id = ha;
  if n = 0 then passed := passed + 1; else failures := failures || text 'B reads A household'; end if;
  select count(*) into n from public.profiles where id = a;
  if n = 0 then passed := passed + 1; else failures := failures || text 'B reads A profile'; end if;
  select count(*) into n from public.household_members where household_id = ha;
  if n = 0 then passed := passed + 1; else failures := failures || text 'B reads A membership'; end if;

  -- B changes nothing of A's
  update public.categories set name = 'Hacked' where id = cat_a;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || text 'B updated A category'; end if;
  update public.households set name = 'Hacked' where id = ha;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || text 'B updated A household'; end if;
  delete from public.transactions_manual where id = tx_a;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || text 'B deleted A transaction'; end if;

  -- B cannot insert into A's household (RLS with check)
  begin
    insert into public.categories (household_id, name, category_group) values (ha, 'Planted', 'everyday');
    failures := failures || text 'B inserted into A household';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- B cannot move own rows into A's household
  begin
    update public.categories set household_id = ha where id = cat_b;
    failures := failures || text 'B moved a row into A household';
  exception when insufficient_privilege or foreign_key_violation then passed := passed + 1;
  end;

  -- B cannot point own rows at A's rows (composite foreign keys)
  begin
    insert into public.budget_lines (household_id, budget_id, category_id) values (hb, budget_b, cat_a);
    failures := failures || text 'B linked a budget line to A category';
  exception when foreign_key_violation then passed := passed + 1;
  end;
  begin
    insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id) values (hb, 'outflow', 100, '2026-09-24', cat_a);
    failures := failures || text 'B linked a transaction to A category';
  exception when foreign_key_violation then passed := passed + 1;
  end;
  begin
    insert into public.debt_payments (household_id, debt_id, kind, amount_cents, happened_on) values (hb, debt_a, 'payment', 100, '2026-09-24');
    failures := failures || text 'B paid A debt';
  exception when foreign_key_violation then passed := passed + 1;
  end;
  begin
    insert into public.goal_contributions (household_id, goal_id, direction, amount_cents, happened_on) values (hb, goal_a, 'in', 100, '2026-09-24');
    failures := failures || text 'B contributed to A goal';
  exception when foreign_key_violation then passed := passed + 1;
  end;

  -- B cannot join A's household, forge audit events or create households
  begin
    insert into public.household_members (household_id, user_id) values (ha, b);
    failures := failures || text 'B joined A household';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    insert into public.audit_events (household_id, actor_id, action) values (ha, b, 'forged.event');
    failures := failures || text 'B forged an audit event';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    insert into public.households (name) values ('Extra');
    failures := failures || text 'B created a household directly';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    perform private.log_event(ha, 'forged.event', null, null);
    failures := failures || text 'B called private.log_event';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- ---------------------------------------------------------------- signed-out visitor (anon)
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  foreach t in array household_tables || array['profiles', 'households', 'household_members'] loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      failures := failures || format('anon can read %s (%s rows)', t, n);
    exception when insufficient_privilege then passed := passed + 1;
    end;
  end loop;

  -- ---------------------------------------------------------------- schema-wide checks (as owner)
  execute 'reset role';
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if n = 0 then passed := passed + 1; else failures := failures || format('%s public tables without RLS', n); end if;

  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind = 'r'
     and not exists (select 1 from pg_policies pp where pp.schemaname = 'public' and pp.tablename = c.relname);
  if n = 0 then passed := passed + 1; else failures := failures || format('%s public tables without any policy', n); end if;

  -- period_for matches L4 vectors P1–P7
  if public.period_for('2026-09-24', 25::smallint) = '2026-09' then passed := passed + 1; else failures := failures || text 'P1'; end if;
  if public.period_for('2026-09-25', 25::smallint) = '2026-10' then passed := passed + 1; else failures := failures || text 'P2'; end if;
  if public.period_for('2026-09-15', 1::smallint) = '2026-09' then passed := passed + 1; else failures := failures || text 'P3'; end if;
  if public.period_for('2028-02-29', 1::smallint) = '2028-02' then passed := passed + 1; else failures := failures || text 'P4'; end if;
  if public.period_for('2026-03-01', 28::smallint) = '2026-03' then passed := passed + 1; else failures := failures || text 'P5'; end if;
  if public.period_for('2026-12-26', 25::smallint) = '2027-01' then passed := passed + 1; else failures := failures || text 'P6'; end if;
  begin
    perform public.period_for('2026-09-15', 31::smallint);
    failures := failures || text 'P7 accepted start day 31';
  exception when invalid_parameter_value then passed := passed + 1;
  end;

  raise exception 'RLS_TESTS passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0),
    case when array_length(failures, 1) > 0 then E'\n - ' || array_to_string(failures, E'\n - ') else '' end;
end;
$$;
