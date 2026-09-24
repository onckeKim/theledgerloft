-- Rollback for 20260924094744_security.sql. Run BEFORE the foundation rollback.
-- Removes sign-up provisioning, audit triggers, policies and RLS. Data is kept.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists private.handle_new_user();
drop trigger if exists audit_setup_completed on public.households;
drop function if exists private.audit_setup_completed();
drop trigger if exists audit_export_created on public.exports;
drop function if exists private.audit_export_created();
drop function if exists private.log_event(uuid, text, text, uuid);
drop trigger if exists set_period on public.transactions_manual;
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
  for r in select tgname, tgrelid::regclass as tbl from pg_trigger where tgname = 'set_updated_at' loop
    execute format('drop trigger %I on %s', r.tgname, r.tbl);
  end loop;
end;
$$;
-- RLS stays enabled deliberately: with no policies, tables are closed rather than open.
