-- Rollback for 20260924102258_setup_lock.sql: private.setup_household() as it was in 20260924100704_setup_functions.sql
-- (without the per-household advisory lock). Only do this together with a fix for the duplicate-row race.
create or replace function private.setup_household()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  hid uuid := private.current_household_id();
  done timestamptz;
begin
  if hid is null then
    raise exception 'no household for this user' using errcode = '42501';
  end if;
  select h.setup_completed_at into done from public.households h where h.id = hid;
  if done is not null then
    raise exception 'setup is already complete' using errcode = 'P0001', hint = 'setup_complete';
  end if;
  return hid;
end;
$$;
