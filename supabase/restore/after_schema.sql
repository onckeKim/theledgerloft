-- Runs after schema.sql in scripts/db-restore.sh, before the data.
-- `supabase db dump` leaves out default privileges and the Supabase-managed auth and storage schemas, so a restore
-- loses what the migrations set there. src/lib/restore.test.ts fails if a migration adds an auth or storage
-- trigger that isn't here; scripts/db-acl-snapshot.sql checks the privileges after a restore.

-- Default privileges as the migrations leave them: the platform defaults, minus anon on tables and sequences
-- (20260924094744_security).
alter default privileges for role postgres in schema public
  grant all on tables to authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on functions to anon, authenticated, service_role;

-- 20260924094744_security: every new user gets their own household (sign-up would otherwise leave users stuck).
create or replace trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- 20260924105354_delete_account_data: deleting a user deletes the households only they belong to (D-029, US-44).
create or replace trigger on_auth_user_deleted before delete on auth.users
  for each row execute function private.delete_sole_households();
