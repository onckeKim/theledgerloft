-- The Ledger Loft: pilot metrics from data the app already keeps (docs/analytics-plan.md §2; launch gate
-- "analytics measure activation, repeated value and conversion without collecting unnecessary sensitive data").
-- Counts only: no ids, amounts, names or text leave this function. Not exposed through the API (private schema,
-- no grants); the owner runs it in the SQL editor: select * from private.pilot_metrics('2026-10-01', '2026-10-31');
-- The cohort is households created between p_from and p_to (inclusive). Deleted accounts leave the cohort; their
-- sign-up and deletion still count through the data-free audit events.

create or replace function private.pilot_metrics(p_from date, p_to date)
returns table (metric text, value bigint, out_of bigint, definition text)
language sql
stable
set search_path = ''
as $$
  with window_ as (
    select p_from::timestamptz as starts, (p_to + 1)::timestamptz as ends
  ),
  cohort as (
    select h.id, h.created_at, h.setup_completed_at, h.setup_step
    from public.households h, window_ w
    where h.created_at >= w.starts and h.created_at < w.ends
  ),
  setup_7d as (
    select c.id from cohort c where c.setup_completed_at <= c.created_at + interval '7 days'
  ),
  activated as (
    select s.id
    from setup_7d s
    join cohort c on c.id = s.id
    where (select count(*) from public.transactions_manual t
           where t.household_id = c.id and t.deleted_at is null
             and t.created_at <= c.created_at + interval '7 days') >= 3
  ),
  active_30d as (
    select c.id
    from cohort c, window_ w
    where exists (select 1 from public.transactions_manual t
                  where t.household_id = c.id
                    and greatest(t.created_at, t.updated_at) >= w.ends - interval '30 days'
                    and t.created_at < w.ends)
       or exists (select 1 from public.budget_lines l
                  where l.household_id = c.id
                    and l.updated_at >= w.ends - interval '30 days' and l.updated_at < w.ends
                    and l.updated_at > l.created_at)
  ),
  habit as (
    select distinct m.household_id as id
    from public.monthly_checkins m
    join cohort c on c.id = m.household_id
    join public.monthly_checkins n
      on n.household_id = m.household_id
     and n.completed_at is not null
     and to_date(n.period || '-01', 'YYYY-MM-DD') = to_date(m.period || '-01', 'YYYY-MM-DD') + interval '1 month'
    where m.completed_at is not null
  ),
  checkout as (
    select distinct p.household_id as id from public.payments p join cohort c on c.id = p.household_id
  ),
  paid as (
    select distinct p.household_id as id
    from public.payments p join cohort c on c.id = p.household_id
    where p.status = 'complete'
  ),
  n as (select count(*) as cohort from cohort)
  select * from (
    select 'signups', (select count(*) from public.audit_events a, window_ w
                       where a.action = 'account.created' and a.created_at >= w.starts and a.created_at < w.ends),
           null::bigint, 'Accounts created in the window, including any deleted since'
    union all
    select 'accounts_deleted', (select count(*) from public.audit_events a, window_ w
                                where a.action = 'account.deleted' and a.created_at >= w.starts and a.created_at < w.ends),
           null, 'Accounts deleted in the window (any sign-up date)'
    union all
    select 'cohort', n.cohort, null, 'Households created in the window that still exist' from n
    union all
    select 'setup_completed_7d', (select count(*) from setup_7d), n.cohort,
           'Finished setup within 7 days of sign-up' from n
    union all
    select 'activated', (select count(*) from activated), n.cohort,
           'Finished setup and added 3 or more transactions within 7 days of sign-up' from n
    union all
    select 'active_last_30_days', (select count(*) from active_30d), n.cohort,
           'Added or edited a transaction, or changed a planned amount, in the 30 days before the window ends' from n
    union all
    select 'habit', (select count(*) from habit), n.cohort,
           'Completed the monthly check-in in two consecutive months (north star)' from n
    union all
    select 'checkout_started', (select count(*) from checkout), n.cohort,
           'Started a pilot checkout at least once' from n
    union all
    select 'paid', (select count(*) from paid), (select count(*) from checkout),
           'Has a confirmed pilot payment (out of those who started a checkout)'
  ) core
  union all
  select 'setup_stopped_after:' || coalesce(c.setup_step, 'not started'), count(*), (select cohort from n),
         'Setup not finished; the last step they saved'
  from cohort c
  where c.setup_completed_at is null
  group by c.setup_step;
$$;

revoke all on function private.pilot_metrics(date, date) from public, anon, authenticated;
comment on function private.pilot_metrics(date, date) is
  'Owner-only pilot metrics (counts only). Definitions: docs/analytics-plan.md §2 and docs/release/operations.md §6.';
