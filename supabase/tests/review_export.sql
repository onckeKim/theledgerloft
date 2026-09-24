-- The Ledger Loft: monthly check-in and exports (PRD US-38, US-39, US-43). Synthetic users; always rolls back.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a5';
  b uuid := '00000000-0000-4000-8000-0000000000b5';
  ha uuid;
  bid uuid;
  first_done timestamptz;
  e uuid;
  n bigint;
  passed int := 0;
  failures text[] := '{}';
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', 'review-a@example.test'),
         ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated', 'review-b@example.test');
  select household_id into ha from public.household_members where user_id = a;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  bid := public.ensure_budget('2026-08');

  -- Saving completes the check-in and ticks the checklist; editing keeps the first completion time
  perform public.save_checkin('2026-08', ' Groceries came in under plan. ', '', '["Check the electricity reading"]');
  select completed_at into first_done from public.monthly_checkins where period = '2026-08';
  if first_done is not null and (select surprised from public.monthly_checkins where period = '2026-08') is null
  then passed := passed + 1; else failures := failures || text 'first save'; end if;
  if (select checklist #>> '{done,checkin}' from public.budgets where id = bid) = 'true' then passed := passed + 1; else failures := failures || text 'checklist not ticked'; end if;
  perform public.save_checkin('2026-08', 'Edited', 'Going out', '[]');
  if (select completed_at from public.monthly_checkins where period = '2026-08') = first_done
     and (select went_well from public.monthly_checkins where period = '2026-08') = 'Edited'
  then passed := passed + 1; else failures := failures || text 'edit'; end if;
  -- A month without a budget can still be checked in
  perform public.save_checkin('2026-07', null, null, null);
  if exists (select 1 from public.monthly_checkins where period = '2026-07') then passed := passed + 1; else failures := failures || text 'no-budget month'; end if;

  -- Next-month actions: at most 5, each 1 to 120 characters, strings only
  begin
    perform public.save_checkin('2026-08', null, null, '["1","2","3","4","5","6"]');
    failures := failures || text 'six actions';
  exception when check_violation then passed := passed + 1;
  end;
  begin
    perform public.save_checkin('2026-08', null, null, jsonb_build_array(repeat('x', 121)));
    failures := failures || text 'long action';
  exception when check_violation then passed := passed + 1;
  end;
  begin
    perform public.save_checkin('2026-08', null, null, '[1]');
    failures := failures || text 'number action';
  exception when check_violation then passed := passed + 1;
  end;
  begin
    perform public.save_checkin('2026-08', repeat('x', 1001), null, '[]');
    failures := failures || text 'long reflection';
  exception when check_violation then passed := passed + 1;
  end;

  -- Exports: created by the user, audited, never changed afterwards
  insert into public.exports (household_id, kind, period, include_reflections, spec_version, expires_at)
  values (ha, 'pdf_summary', '2026-08', true, '1.0', now() + interval '10 minutes') returning id into e;
  if exists (select 1 from public.audit_events where action = 'export.created' and entity_id = e) then passed := passed + 1; else failures := failures || text 'no export audit'; end if;
  begin
    update public.exports set expires_at = now() + interval '1 year' where id = e;
    failures := failures || text 'export updated';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    insert into public.exports (household_id, kind, spec_version) values (ha, 'pdf_summary', '1.0');
    failures := failures || text 'pdf export without period';
  exception when check_violation then passed := passed + 1;
  end;

  -- Another household sees none of it
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.monthly_checkins;
  if n = 0 then passed := passed + 1; else failures := failures || text 'B reads A''s check-ins'; end if;
  select count(*) into n from public.exports;
  if n = 0 then passed := passed + 1; else failures := failures || text 'B reads A''s exports'; end if;
  begin
    insert into public.exports (household_id, kind, period, spec_version) values (ha, 'pdf_summary', '2026-08', '1.0');
    failures := failures || text 'B created an export for A';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  perform public.save_checkin('2026-08', 'B''s own', null, '[]');
  select count(*) into n from public.monthly_checkins;
  if n = 1 then passed := passed + 1; else failures := failures || text 'B check-in'; end if;
  execute 'reset role';
  if (select went_well from public.monthly_checkins where household_id = ha and period = '2026-08') = 'Edited'
  then passed := passed + 1; else failures := failures || text 'B changed A''s check-in'; end if;

  raise exception 'REVIEW_EXPORT_TESTS passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0),
    case when array_length(failures, 1) > 0 then E'\n - ' || array_to_string(failures, E'\n - ') else '' end;
end;
$$;
