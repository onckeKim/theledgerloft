-- The Ledger Loft: row level security, grants, triggers and sign-up provisioning (playbook A4, threat T1).
-- Rule: a signed-in user can read and change only rows of households they belong to.
-- anon (signed-out) gets no table access at all.
-- Rollback: see supabase/rollback/20260924094744_security.down.sql

-- ---------------------------------------------------------------------------------------------
-- Grants: start from nothing for anon; narrow authenticated where users must not write directly
-- ---------------------------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

revoke insert, delete on public.profiles from authenticated;
revoke insert, delete on public.households from authenticated;
revoke insert, update, delete on public.household_members from authenticated;
revoke insert, update, delete on public.audit_events from authenticated;
revoke update on public.exports from authenticated;

revoke execute on function public.period_for(date, smallint) from public, anon;
grant execute on function public.period_for(date, smallint) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- RLS on every table in public (a test fails if any table is missed)
-- ---------------------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.accounts_manual enable row level security;
alter table public.income_items enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_lines enable row level security;
alter table public.transactions_manual enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.monthly_checkins enable row level security;
alter table public.exports enable row level security;
alter table public.audit_events enable row level security;

create policy "own profile: read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "member: read household" on public.households
  for select to authenticated using ((select private.is_household_member(id)));
create policy "member: update household" on public.households
  for update to authenticated
  using ((select private.is_household_member(id)))
  with check ((select private.is_household_member(id)));

create policy "own memberships: read" on public.household_members
  for select to authenticated using (user_id = (select auth.uid()));

-- Household-owned data: identical rule for every table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts_manual', 'income_items', 'categories', 'budgets', 'budget_lines', 'transactions_manual',
    'debts', 'debt_payments', 'goals', 'goal_contributions', 'monthly_checkins', 'exports'
  ] loop
    execute format(
      'create policy "member: all" on public.%I for all to authenticated
         using (private.is_household_member(household_id))
         with check (private.is_household_member(household_id))', t);
  end loop;
end;
$$;

create policy "member: read audit" on public.audit_events
  for select to authenticated
  using (actor_id = (select auth.uid()) or (household_id is not null and private.is_household_member(household_id)));

-- ---------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'households', 'accounts_manual', 'income_items', 'categories', 'budgets', 'budget_lines',
    'transactions_manual', 'debts', 'goals', 'monthly_checkins'
  ] loop
    execute format('create trigger set_updated_at before update on public.%I
                      for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;

create trigger set_period before insert or update of occurred_on, household_id on public.transactions_manual
  for each row execute function private.set_transaction_period();

-- Audit log writer: callable only from triggers and definer functions, never by clients.
create or replace function private.log_event(hid uuid, action text, entity_type text, entity_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id)
  values (hid, (select auth.uid()), action, entity_type, entity_id);
$$;
revoke all on function private.log_event(uuid, text, text, uuid) from public, anon, authenticated;

create or replace function private.audit_export_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_event(new.household_id, 'export.created', 'exports', new.id);
  return new;
end;
$$;
create trigger audit_export_created after insert on public.exports
  for each row execute function private.audit_export_created();

create or replace function private.audit_setup_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.setup_completed_at is null and new.setup_completed_at is not null then
    perform private.log_event(new.id, 'household.setup_completed', 'households', new.id);
  end if;
  return new;
end;
$$;
create trigger audit_setup_completed after update of setup_completed_at on public.households
  for each row execute function private.audit_setup_completed();

-- Sign-up: every new user gets a profile, their own household and an owner membership (A-02).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
begin
  insert into public.profiles (id) values (new.id);
  insert into public.households (created_by) values (new.id) returning id into hid;
  insert into public.household_members (household_id, user_id, role) values (hid, new.id, 'owner');
  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id)
  values (hid, new.id, 'account.created', 'households', hid);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
