-- The Ledger Loft: deleting an account deletes the household data it alone belongs to (PRD US-44, N11, threat model T15).
-- Memberships already cascade from auth.users, but households (and everything hanging off them) did not,
-- which would leave orphaned C3 data behind. A household shared with someone else is kept for them.

create or replace function private.delete_sole_households()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.households h
  where exists (
      select 1 from public.household_members m
      where m.household_id = h.id and m.user_id = old.id
    )
    and not exists (
      select 1 from public.household_members m
      where m.household_id = h.id and m.user_id <> old.id
    );
  return old;
end;
$$;
revoke all on function private.delete_sole_households() from public, anon, authenticated;

create trigger on_auth_user_deleted
  before delete on auth.users
  for each row execute function private.delete_sole_households();
