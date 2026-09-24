-- Rollback for 20260924105354_delete_account_data.sql
drop trigger if exists on_auth_user_deleted on auth.users;
drop function if exists private.delete_sole_households();
