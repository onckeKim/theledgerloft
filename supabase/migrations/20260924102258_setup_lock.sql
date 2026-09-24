-- Serialise setup saves per household. Two saves of the same step can arrive together (an autosave on blur and
-- the "Save and continue" click); without a lock, both could insert the same new rows. The transaction-scoped
-- advisory lock makes the second wait, and its "replace the list" statements then see the first one's rows.
-- Rollback: re-create private.setup_household() from 20260924100704_setup_functions.sql (without the lock).
create or replace function private.setup_household()
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  hid uuid := private.current_household_id();
  done timestamptz;
begin
  if hid is null then
    raise exception 'no household for this user' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('setup:' || hid::text, 0));
  select h.setup_completed_at into done from public.households h where h.id = hid;
  if done is not null then
    raise exception 'setup is already complete' using errcode = 'P0001', hint = 'setup_complete';
  end if;
  return hid;
end;
$$;
