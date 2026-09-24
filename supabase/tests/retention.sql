-- The Ledger Loft: the nightly purge keeps to the retention periods (N11, R3) and stays private. Synthetic user;
-- always rolls back.
do $$
declare
  u uuid := '00000000-0000-4000-8000-0000000000e1';
  hid uuid;
  cat uuid;
  g uuid;
  t_old uuid; t_recent uuid; t_live uuid; t_linked uuid;
  e_old uuid; e_recent uuid;
  a_old bigint; a_recent bigint;
  n bigint;
  passed int := 0;
  failures text[] := '{}';
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 'retention@example.test');
  select household_id into hid from public.household_members where user_id = u;
  insert into public.categories (household_id, name, category_group) values (hid, 'Groceries', 'everyday') returning id into cat;

  -- Transactions: deleted 31 days ago (purged), deleted 29 days ago (kept), never deleted and old (kept)
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id, deleted_at)
  values (hid, 'outflow', 100, current_date - 40, cat, now() - interval '31 days') returning id into t_old;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id, deleted_at)
  values (hid, 'outflow', 100, current_date - 40, cat, now() - interval '29 days') returning id into t_recent;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id, created_at)
  values (hid, 'outflow', 100, current_date - 400, cat, now() - interval '400 days') returning id into t_live;
  -- A goal-linked transaction marked deleted long ago (not possible through the app) must not stop the purge
  insert into public.goals (household_id, kind, name, target_cents) values (hid, 'goal', 'Holiday', 100000) returning id into g;
  insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id)
  values (hid, 'outflow', 100, current_date - 40, cat) returning id into t_linked;
  insert into public.goal_contributions (household_id, goal_id, direction, amount_cents, happened_on, transaction_id)
  values (hid, g, 'in', 100, current_date - 40, t_linked);
  perform set_config('ledgerloft.linked_write', 'on', true);
  update public.transactions_manual set deleted_at = now() - interval '60 days' where id = t_linked;
  perform set_config('ledgerloft.linked_write', '', true);

  -- Export links: 8 days old (purged), 6 days old (kept)
  insert into public.exports (household_id, kind, spec_version, created_at, expires_at)
  values (hid, 'csv_all', '1.0', now() - interval '8 days', now() - interval '8 days') returning id into e_old;
  insert into public.exports (household_id, kind, spec_version, created_at, expires_at)
  values (hid, 'csv_all', '1.0', now() - interval '6 days', now() - interval '6 days') returning id into e_recent;

  -- Audit events: 13 months old (purged), 11 months old (kept)
  insert into public.audit_events (household_id, actor_id, action, entity_type, created_at)
  values (hid, u, 'export.created', 'exports', now() - interval '13 months') returning id into a_old;
  insert into public.audit_events (household_id, actor_id, action, entity_type, created_at)
  values (hid, u, 'export.created', 'exports', now() - interval '11 months') returning id into a_recent;

  perform private.purge_expired();

  if not exists (select 1 from public.transactions_manual where id = t_old) then passed := passed + 1;
  else failures := failures || text 'transaction deleted 31 days ago kept'; end if;
  if exists (select 1 from public.transactions_manual where id = t_recent) then passed := passed + 1;
  else failures := failures || text 'transaction deleted 29 days ago purged'; end if;
  if exists (select 1 from public.transactions_manual where id = t_live) then passed := passed + 1;
  else failures := failures || text 'live transaction purged'; end if;
  if exists (select 1 from public.transactions_manual where id = t_linked) then passed := passed + 1;
  else failures := failures || text 'goal-linked transaction purged'; end if;
  if not exists (select 1 from public.exports where id = e_old) then passed := passed + 1;
  else failures := failures || text 'export row older than 7 days kept'; end if;
  if exists (select 1 from public.exports where id = e_recent) then passed := passed + 1;
  else failures := failures || text 'export row younger than 7 days purged'; end if;
  if not exists (select 1 from public.audit_events where id = a_old) then passed := passed + 1;
  else failures := failures || text 'audit event older than 12 months kept'; end if;
  if exists (select 1 from public.audit_events where id = a_recent) then passed := passed + 1;
  else failures := failures || text 'audit event younger than 12 months purged'; end if;

  -- A second run finds nothing more of ours to remove, and reports counts per kind
  select count(*) into n from private.purge_expired() p where p.removed = 0;
  if n = 3 then passed := passed + 1; else failures := failures || text 'second run removed more'; end if;

  -- Scheduled nightly, and private
  if exists (select 1 from cron.job where jobname = 'ledgerloft-purge-expired' and schedule = '17 1 * * *'
             and command = 'select private.purge_expired()' and active) then passed := passed + 1;
  else failures := failures || text 'nightly purge not scheduled'; end if;
  if not has_function_privilege('anon', 'private.purge_expired(timestamptz)', 'execute')
     and not has_function_privilege('authenticated', 'private.purge_expired(timestamptz)', 'execute') then
    passed := passed + 1;
  else failures := failures || text 'purge callable by an API role'; end if;

  -- R10: the entitlements foreign key has a covering index
  if exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'entitlements_payment_household_idx')
  then passed := passed + 1; else failures := failures || text 'entitlements index missing'; end if;

  raise exception 'RETENTION_TESTS passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0),
    case when array_length(failures, 1) > 0 then E'\n - ' || array_to_string(failures, E'\n - ') else '' end;
end $$;
