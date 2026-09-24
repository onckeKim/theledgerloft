-- Monthly check-in (playbook L8, PRD US-38). Security invoker: RLS applies and the household comes from auth.uid().
-- Rollback: see supabase/rollback/20260924114848_checkin_functions.down.sql

-- Next-month actions are short strings (at most 5, checked by the table).
create or replace function private.valid_next_actions(a jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(a) = 'array'
    and not exists (
      select 1 from jsonb_array_elements(a) e
      where jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') not between 1 and 120
    );
$$;
revoke all on function private.valid_next_actions(jsonb) from public, anon;
grant execute on function private.valid_next_actions(jsonb) to authenticated;

alter table public.monthly_checkins
  add constraint monthly_checkins_next_actions_valid check (private.valid_next_actions(next_actions));

-- Save the check-in for a period and mark it complete (first completion time is kept, so editing later is fine).
-- Also ticks "Monthly check-in" on that month's checklist, when the month has a budget.
create or replace function public.save_checkin(p_period text, p_went_well text, p_surprised text, p_next jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  if p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'period must look like 2026-09' using errcode = '22023';
  end if;
  insert into public.monthly_checkins (household_id, period, went_well, surprised, next_actions, completed_at)
  values (hid, p_period, nullif(btrim(p_went_well), ''), nullif(btrim(p_surprised), ''), coalesce(p_next, '[]'::jsonb), now())
  on conflict (household_id, period) do update
    set went_well = excluded.went_well,
        surprised = excluded.surprised,
        next_actions = excluded.next_actions,
        completed_at = coalesce(public.monthly_checkins.completed_at, excluded.completed_at);
  update public.budgets
  set checklist = jsonb_set(coalesce(checklist, '{}'::jsonb), '{done}',
                            coalesce(checklist -> 'done', '{}'::jsonb) || '{"checkin": true}'::jsonb)
  where household_id = hid and period = p_period;
end;
$$;
revoke all on function public.save_checkin(text, text, text, jsonb) from public, anon;
grant execute on function public.save_checkin(text, text, text, jsonb) to authenticated;
