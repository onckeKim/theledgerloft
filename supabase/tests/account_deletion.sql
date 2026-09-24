-- The Ledger Loft: deleting an account removes its household data (PRD US-44). Synthetic users; always rolls back.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a3';
  b uuid := '00000000-0000-4000-8000-0000000000b3';
  c uuid := '00000000-0000-4000-8000-0000000000c3';
  ha uuid; hb uuid;
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
  -- c also joins b's household (sharing is Later, but the model allows it)
  insert into public.household_members (household_id, user_id, role) values (hb, c, 'member');

  delete from auth.users where id = a;
  select count(*) into n from public.households where id = ha;
  if n = 0 then passed := passed + 1; else failures := failures || 'sole household kept'; end if;
  select count(*) into n from public.categories where household_id = ha;
  if n = 0 then passed := passed + 1; else failures := failures || 'household data kept'; end if;
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
