-- The Ledger Loft: owner pilot metrics count the analytics-plan definitions correctly and stay private.
-- Synthetic users in a far-future window (so other test data never falls inside it); always rolls back.
do $$
declare
  u1 uuid := '00000000-0000-4000-8000-0000000000d1';
  u2 uuid := '00000000-0000-4000-8000-0000000000d2';
  u3 uuid := '00000000-0000-4000-8000-0000000000d3';
  u4 uuid := '00000000-0000-4000-8000-0000000000d4';
  u5 uuid := '00000000-0000-4000-8000-0000000000d5';
  u6 uuid := '00000000-0000-4000-8000-0000000000d6';
  u7 uuid := '00000000-0000-4000-8000-0000000000d7';
  h uuid[] := '{}';
  u uuid;
  i int;
  cat uuid;
  got text;
  passed int := 0;
  failures text[] := '{}';
  expected constant jsonb := '{
    "signups": [6, null], "accounts_deleted": [1, null], "cohort": [5, null],
    "setup_completed_7d": [2, 5], "activated": [1, 5], "active_last_30_days": [2, 5], "habit": [1, 5],
    "checkout_started": [2, 5], "paid": [1, 2],
    "setup_stopped_after:income": [1, 5], "setup_stopped_after:not started": [1, 5]
  }';
  k text;
begin
  foreach u in array array[u1, u2, u3, u4, u5, u6, u7] loop
    insert into auth.users (instance_id, id, aud, role, email)
    values ('00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
            'metrics-' || right(u::text, 2) || '@example.test');
    h := h || (select household_id from public.household_members where user_id = u);
  end loop;

  -- Sign-up dates: u6 is before the window; the rest are inside 2090-03-01 … 2090-03-31
  i := 0;
  foreach u in array array[u1, u2, u3, u4, u5, u6, u7] loop
    i := i + 1;
    update public.households set created_at = case i when 3 then '2090-03-01 00:00Z'::timestamptz
                                                     when 6 then '2090-02-15 09:00Z'
                                                     else '2090-03-05 09:00Z' end
    where id = h[i];
    update public.audit_events set created_at = (select created_at from public.households where id = h[i])
    where action = 'account.created' and actor_id = u;
  end loop;

  -- u1: setup on day 2, three transactions on day 3, consecutive check-ins, paid
  update public.households set setup_completed_at = '2090-03-07 09:00Z' where id = h[1];
  insert into public.categories (household_id, name, category_group) values (h[1], 'Groceries', 'everyday') returning id into cat;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id, created_at)
  select h[1], 'outflow', 1000, '2090-03-08', cat, '2090-03-08 10:00Z' from generate_series(1, 3);
  insert into public.monthly_checkins (household_id, period, completed_at)
  values (h[1], '2090-03', '2090-03-30 10:00Z'), (h[1], '2090-04', '2090-04-29 10:00Z');
  insert into public.payments (household_id, user_id, plan_code, amount_cents, access_days, status)
  values (h[1], u1, 'pilot', 5000, 90, 'complete');

  -- u2: setup on day 10 (too late), five transactions, check-ins a month apart missing, checkout not paid
  update public.households set setup_completed_at = '2090-03-15 09:00Z' where id = h[2];
  insert into public.categories (household_id, name, category_group) values (h[2], 'Groceries', 'everyday') returning id into cat;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id, created_at)
  select h[2], 'outflow', 1000, '2090-03-20', cat, '2090-03-20 10:00Z' from generate_series(1, 5);
  insert into public.monthly_checkins (household_id, period, completed_at)
  values (h[2], '2090-03', '2090-03-30 10:00Z'), (h[2], '2090-05', '2090-05-29 10:00Z');
  insert into public.payments (household_id, user_id, plan_code, amount_cents, access_days, status)
  values (h[2], u2, 'pilot', 5000, 90, 'pending');

  -- u3: setup on day 1; three transactions but one deleted (not activated); all before the last-30-days window
  update public.households set setup_completed_at = '2090-03-02 09:00Z' where id = h[3];
  insert into public.categories (household_id, name, category_group) values (h[3], 'Groceries', 'everyday') returning id into cat;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id, created_at, deleted_at)
  values (h[3], 'outflow', 1000, '2090-03-01', cat, '2090-03-01 10:00Z', null),
         (h[3], 'outflow', 1000, '2090-03-01', cat, '2090-03-01 10:00Z', null),
         (h[3], 'outflow', 1000, '2090-03-01', cat, '2090-03-01 10:00Z', '2090-03-01 11:00Z');
  update public.transactions_manual set updated_at = created_at where household_id = h[3];

  -- u4 stopped after the income step; u5 never started
  update public.households set setup_step = 'income' where id = h[4];

  -- u6 (outside the window) would count everywhere if the window leaked
  update public.households set setup_completed_at = '2090-02-16 09:00Z' where id = h[6];
  insert into public.monthly_checkins (household_id, period, completed_at)
  values (h[6], '2090-03', '2090-03-30 10:00Z'), (h[6], '2090-04', '2090-04-29 10:00Z');

  -- u7 signed up in the window, then deleted their account (as delete_my_account does)
  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, created_at)
  values (null, null, 'account.deleted', 'users', u7, '2090-03-20 09:00Z');
  delete from auth.users where id = u7;

  for k in select jsonb_object_keys(expected) loop
    select format('[%s, %s]', m.value, coalesce(m.out_of::text, 'null')) into got
    from private.pilot_metrics('2090-03-01', '2090-03-31') m where m.metric = k;
    if got::jsonb = expected -> k then passed := passed + 1;
    else failures := failures || format('%s: expected %s, got %s', k, expected -> k, coalesce(got, 'no row'));
    end if;
  end loop;
  if (select count(*) from private.pilot_metrics('2090-03-01', '2090-03-31')) = 11 then passed := passed + 1;
  else failures := failures || text 'unexpected extra metric rows'; end if;

  -- Private: no API role can call it
  if not has_function_privilege('anon', 'private.pilot_metrics(date, date)', 'execute')
     and not has_function_privilege('authenticated', 'private.pilot_metrics(date, date)', 'execute') then
    passed := passed + 1;
  else failures := failures || text 'pilot_metrics callable by an API role'; end if;

  raise exception 'PILOT_METRICS_TESTS passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0),
    case when array_length(failures, 1) > 0 then E'\n - ' || array_to_string(failures, E'\n - ') else '' end;
end $$;
