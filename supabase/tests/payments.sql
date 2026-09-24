-- The Ledger Loft: pilot payments and entitlements (PRD US-06, US-07, threat T4). Synthetic users; always rolls back.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a6';
  b uuid := '00000000-0000-4000-8000-0000000000b6';
  ha uuid; hb uuid;
  secret text := 'test-payments-secret';
  pay record; pay2 record; pay3 record;
  r text;
  n bigint;
  passed int := 0;
  failures text[] := '{}';
begin
  -- Known state regardless of seed: an open plan at R 10,00 and a test secret
  update private.plans set price_cents = 1000, access_days = 90, active = true where code = 'pilot';
  insert into private.app_secrets (name, secret_hash) values ('payments', extensions.crypt(secret, extensions.gen_salt('bf')))
  on conflict (name) do update set secret_hash = excluded.secret_hash;

  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', 'pay-a@example.test'),
         ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated', 'pay-b@example.test');
  select household_id into ha from public.household_members where user_id = a;
  select household_id into hb from public.household_members where user_id = b;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- The offer and the checkout use the server-side price
  if (select price_cents from public.plan_offer()) = 1000 and (select open from public.plan_offer()) then passed := passed + 1; else failures := failures || 'offer'; end if;
  select * into pay from public.start_checkout();
  if pay.amount_cents = 1000 and (select status from public.payments where id = pay.payment_id) = 'pending' then passed := passed + 1; else failures := failures || 'checkout'; end if;

  -- Users can't write payments or entitlements themselves
  begin
    insert into public.payments (household_id, plan_code, amount_cents, access_days) values (ha, 'pilot', 1, 90);
    failures := failures || 'user inserted a payment';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    update public.payments set amount_cents = 1 where id = pay.payment_id;
    failures := failures || 'user changed a payment';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    insert into public.entitlements (household_id, starts_at, ends_at) values (ha, now(), now() + interval '1 year');
    failures := failures || 'user granted access';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    perform 1 from private.plans;
    failures := failures || 'user read plans';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- Signed-in users can't apply notifications at all, even with the secret
  begin
    perform public.payfast_apply_itn(secret, pay.payment_id, 'pf-1', 'COMPLETE', 1000, true);
    failures := failures || 'signed-in user applied a notification';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  select * into pay2 from public.start_checkout();
  select * into pay3 from public.start_checkout();

  -- The notify route calls as anon; without the right secret nothing happens (forged call)
  execute 'reset role';
  execute 'set local role anon';
  begin
    perform public.payfast_apply_itn('guess', pay.payment_id, 'pf-1', 'COMPLETE', 1000, true);
    failures := failures || 'wrong secret accepted';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  execute 'reset role';

  -- Tampered amount: rejected, no access
  execute 'set local role anon';
  r := public.payfast_apply_itn(secret, pay2.payment_id, 'pf-tampered', 'COMPLETE', 100, true);
  execute 'reset role';
  if r = 'rejected' and (select status || '/' || reject_reason from public.payments where id = pay2.payment_id) = 'rejected/amount'
     and not exists (select 1 from public.entitlements where household_id = ha)
  then passed := passed + 1; else failures := failures || format('tampered amount: %s', r); end if;
  -- Wrong merchant: rejected
  execute 'set local role anon';
  r := public.payfast_apply_itn(secret, pay3.payment_id, 'pf-merchant', 'COMPLETE', 1000, false);
  execute 'reset role';
  if r = 'rejected' and (select reject_reason from public.payments where id = pay3.payment_id) = 'merchant' then passed := passed + 1; else failures := failures || 'merchant'; end if;

  -- Out of order: PENDING first changes nothing, then COMPLETE grants 90 days once
  execute 'set local role anon';
  r := public.payfast_apply_itn(secret, pay.payment_id, 'pf-1', 'PENDING', 1000, true);
  execute 'reset role';
  if r = 'pending' and not exists (select 1 from public.entitlements where household_id = ha) then passed := passed + 1; else failures := failures || 'pending'; end if;
  execute 'set local role anon';
  r := public.payfast_apply_itn(secret, pay.payment_id, 'pf-1', 'COMPLETE', 1000, true);
  execute 'reset role';
  select count(*) into n from public.entitlements where household_id = ha and ends_at > now() + interval '89 days';
  if r = 'granted' and n = 1 then passed := passed + 1; else failures := failures || format('grant: %s', r); end if;
  if exists (select 1 from public.audit_events where action = 'entitlement.granted' and entity_id = pay.payment_id) then passed := passed + 1; else failures := failures || 'no audit'; end if;

  -- Duplicate and late notifications change nothing
  execute 'set local role anon';
  r := public.payfast_apply_itn(secret, pay.payment_id, 'pf-1', 'COMPLETE', 1000, true);
  execute 'reset role';
  if r = 'duplicate' and (select count(*) from public.entitlements where household_id = ha) = 1 then passed := passed + 1; else failures := failures || 'duplicate'; end if;
  execute 'set local role anon';
  r := public.payfast_apply_itn(secret, pay.payment_id, 'pf-1', 'FAILED', 1000, true);
  execute 'reset role';
  if r = 'duplicate' and (select status from public.payments where id = pay.payment_id) = 'complete' then passed := passed + 1; else failures := failures || 'late failure'; end if;
  -- The same PayFast payment id can't complete a second payment
  insert into public.payments (household_id, user_id, plan_code, amount_cents, access_days) values (ha, a, 'pilot', 1000, 90) returning id into pay2.payment_id;
  execute 'set local role anon';
  r := public.payfast_apply_itn(secret, pay2.payment_id, 'pf-1', 'COMPLETE', 1000, true);
  execute 'reset role';
  if r = 'ignored' and (select count(*) from public.entitlements where household_id = ha) = 1 then passed := passed + 1; else failures := failures || 'reused pf id'; end if;
  -- Unknown payment id
  execute 'set local role anon';
  if public.payfast_apply_itn(secret, gen_random_uuid(), 'pf-x', 'COMPLETE', 1000, true) = 'unknown' then passed := passed + 1; else failures := failures || 'unknown'; end if;
  -- anon can't read payments
  begin
    perform 1 from public.payments;
    failures := failures || 'anon read payments';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- With access, a new checkout isn't needed
  begin
    perform public.start_checkout();
    failures := failures || 'checkout while entitled';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  -- Other households see nothing
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.payments;
  if n = 0 and (select count(*) from public.entitlements) = 0 then passed := passed + 1; else failures := failures || 'B sees A''s payments'; end if;
  execute 'reset role';

  -- Signed out (anon) can't start a checkout or read the offer
  execute 'set local role anon';
  begin
    perform public.start_checkout();
    failures := failures || 'anon checkout';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  execute 'reset role';

  -- A closed plan takes no checkouts
  update private.plans set active = false where code = 'pilot';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.start_checkout();
    failures := failures || 'closed plan checkout';
  exception when invalid_parameter_value then passed := passed + 1;
  end;
  execute 'reset role';

  -- Account deletion removes payments and entitlements with the household
  delete from auth.users where id = a;
  if not exists (select 1 from public.payments where household_id = ha) and not exists (select 1 from public.entitlements where household_id = ha)
  then passed := passed + 1; else failures := failures || 'deletion left payments'; end if;

  raise exception 'PAYMENTS_TESTS passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0),
    case when array_length(failures, 1) > 0 then E'\n - ' || array_to_string(failures, E'\n - ') else '' end;
end;
$$;
