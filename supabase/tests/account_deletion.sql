-- The Ledger Loft: deleting an account removes its household data (PRD US-44). Synthetic users; always rolls back.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a3';
  b uuid := '00000000-0000-4000-8000-0000000000b3';
  c uuid := '00000000-0000-4000-8000-0000000000c3';
  ha uuid; hb uuid; cat uuid; g uuid; t uuid; d uuid;
  n bigint;
  passed int := 0;
  failures text[] := '{}';
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', 'delete-a@example.test'),
         ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated', 'delete-b@example.test'),
         ('00000000-0000-0000-0000-000000000000', c, 'authenticated', 'authenticated', 'delete-c@example.test');
  select household_id into ha from public.household_members where user_id = a;
  select household_id into hb from public.household_members where user_id = b;
  insert into public.categories (household_id, name, category_group) values (ha, 'Groceries', 'everyday'), (hb, 'Groceries', 'everyday');
  -- Money linked to a goal and a debt (these transactions are guarded against direct changes)
  insert into public.categories (household_id, name, category_group, system_key) values (ha, 'Savings goals', 'saving', 'savings_goals') returning id into cat;
  insert into public.goals (household_id, kind, name, target_cents) values (ha, 'goal', 'Emergency fund', 100000) returning id into g;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id) values (ha, 'outflow', 5000, current_date, cat) returning id into t;
  insert into public.goal_contributions (household_id, goal_id, direction, amount_cents, happened_on, transaction_id) values (ha, g, 'in', 5000, current_date, t);
  insert into public.debts (household_id, name, opening_balance_cents, balance_cents, min_payment_cents) values (ha, 'Store card', 1000, 1000, 100) returning id into d;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id) values (ha, 'outflow', 100, current_date, cat) returning id into t;
  insert into public.debt_payments (household_id, debt_id, kind, amount_cents, happened_on, transaction_id) values (ha, d, 'payment', 100, current_date, t);
  -- c also joins b's household (sharing is Later, but the model allows it)
  insert into public.household_members (household_id, user_id, role) values (hb, c, 'member');

  delete from auth.users where id = a;
  select count(*) into n from public.households where id = ha;
  if n = 0 then passed := passed + 1; else failures := failures || 'sole household kept'; end if;
  select count(*) into n from public.categories where household_id = ha;
  if n = 0 then passed := passed + 1; else failures := failures || 'household data kept'; end if;
  select count(*) into n from public.transactions_manual where household_id = ha;
  if n = 0 then passed := passed + 1; else failures := failures || 'linked transactions kept'; end if;
  select count(*) into n from public.categories where household_id = hb;
  if n = 1 then passed := passed + 1; else failures := failures || 'other household touched'; end if;

  delete from auth.users where id = b;
  select count(*) into n from public.households where id = hb;
  if n = 1 then passed := passed + 1; else failures := failures || 'shared household deleted'; end if;
  select count(*) into n from public.household_members where household_id = hb and user_id = c;
  if n = 1 then passed := passed + 1; else failures := failures || 'remaining member lost access'; end if;

  delete from auth.users where id = c;
  select count(*) into n from public.households where id = hb;
  if n = 0 then passed := passed + 1; else failures := failures || 'last member household kept'; end if;

  raise exception 'ACCOUNT_DELETION_TESTS passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0),
    case when array_length(failures, 1) > 0 then E'\n - ' || array_to_string(failures, E'\n - ') else '' end;
end;
$$;
