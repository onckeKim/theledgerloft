-- Pilot payments and entitlements (playbook L9, PRD US-06, US-07, P-1, threat T4).
-- Rules:
--  * The price comes from private.plans (set by the owner), never from the browser.
--  * Only a notification the server has verified with PayFast can change a payment, through
--    public.payfast_apply_itn(), which needs a server-held secret (no service-role key in the app).
--  * Users can read their household's payments and entitlements but can't write them.
-- Rollback: see supabase/rollback/20260924123752_payments.down.sql

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

-- Plans the owner sells. Price is null (and the plan closed) until the owner sets it.
create table private.plans (
  code text primary key check (code ~ '^[a-z_]{1,30}$'),
  name text not null check (char_length(name) between 1 and 100),
  price_cents bigint check (price_cents between 100 and 99999999),
  access_days integer not null check (access_days between 1 and 1000),
  active boolean not null default false,
  updated_at timestamptz not null default now(),
  check (not active or price_cents is not null)
);
insert into private.plans (code, name, price_cents, access_days, active)
values ('pilot', 'The Ledger Loft founding pilot', null, 90, false);

-- Server secrets for narrowly scoped database functions, stored as bcrypt hashes. Set by the owner:
--   insert into private.app_secrets (name, secret_hash)
--   values ('payments', extensions.crypt('<PAYMENTS_DB_SECRET>', extensions.gen_salt('bf')))
--   on conflict (name) do update set secret_hash = excluded.secret_hash;
create table private.app_secrets (
  name text primary key,
  secret_hash text not null
);
revoke all on private.plans, private.app_secrets from public, anon, authenticated;

create table public.payments (
  id uuid primary key default gen_random_uuid(), -- sent to PayFast as m_payment_id
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  plan_code text not null,
  amount_cents bigint not null check (amount_cents > 0),
  access_days integer not null check (access_days > 0),
  status text not null default 'pending' check (status in ('pending', 'complete', 'failed', 'rejected')),
  pf_payment_id text unique,
  pf_status text,
  reject_reason text check (reject_reason in ('amount', 'merchant')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);
create index payments_household_idx on public.payments (household_id, created_at desc);
create index payments_user_idx on public.payments (user_id);
comment on table public.payments is 'C2. Written only by start_checkout() and payfast_apply_itn(). No card data, ever.';

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null default 'pilot' check (kind in ('pilot')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  payment_id uuid unique,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (payment_id, household_id) references public.payments (id, household_id)
);
create index entitlements_household_idx on public.entitlements (household_id, ends_at desc);
comment on table public.entitlements is 'C2. Access to the planner. Granted only for a verified, matching payment.';

alter table public.payments enable row level security;
alter table public.entitlements enable row level security;
revoke all on public.payments, public.entitlements from anon;
revoke insert, update, delete on public.payments, public.entitlements from authenticated;
create policy "member: read payments" on public.payments
  for select to authenticated using ((select private.is_household_member(household_id)));
create policy "member: read entitlements" on public.entitlements
  for select to authenticated using ((select private.is_household_member(household_id)));
create trigger set_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------------------------

-- The offer shown on /app/join. Doesn't reveal anything but the plan's public details.
create or replace function public.plan_offer(p_plan text default 'pilot')
returns table (name text, price_cents bigint, access_days integer, open boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name, p.price_cents, p.access_days, p.active and p.price_cents is not null
  from private.plans p where p.code = p_plan;
$$;

-- Start a checkout: a pending payment for the caller's household at the plan's price (PRD US-06 AC2).
create or replace function public.start_checkout(p_plan text default 'pilot')
returns table (payment_id uuid, amount_cents bigint, item_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid := private.current_household_id();
  plan record;
  pid uuid;
begin
  if uid is null or hid is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  select * into plan from private.plans p where p.code = p_plan;
  if not found or not plan.active or plan.price_cents is null then
    raise exception 'this plan is not open' using errcode = '22023', hint = 'closed';
  end if;
  if exists (select 1 from public.entitlements e where e.household_id = hid and e.ends_at > now()) then
    raise exception 'you already have access' using errcode = '22023', hint = 'entitled';
  end if;
  if (select count(*) from public.payments p where p.household_id = hid and p.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many checkouts' using errcode = '22023', hint = 'too_many';
  end if;
  insert into public.payments (household_id, user_id, plan_code, amount_cents, access_days)
  values (hid, uid, plan.code, plan.price_cents, plan.access_days)
  returning id into pid;
  return query select pid, plan.price_cents, plan.name;
end;
$$;

-- Apply a PayFast notification that the server has already verified (signature, source, server confirmation;
-- src/lib/payments/itn.ts). Guarded by the payments secret. Idempotent and safe out of order:
--  * a completed or rejected payment never changes again (duplicates and late notifications change nothing)
--  * the amount must equal the pending record, and the merchant must match, or the payment is rejected
--  * COMPLETE grants the entitlement once, starting now or when current access ends.
-- Returns: granted | duplicate | rejected | failed | pending | ignored | unknown.
create or replace function public.payfast_apply_itn(
  p_secret text, p_payment_id uuid, p_pf_payment_id text, p_status text, p_amount_cents bigint, p_merchant_ok boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored text;
  pay record;
  starts timestamptz;
begin
  select s.secret_hash into stored from private.app_secrets s where s.name = 'payments';
  if stored is null or p_secret is null or extensions.crypt(p_secret, stored) <> stored then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into pay from public.payments p where p.id = p_payment_id for update;
  if not found then
    return 'unknown';
  end if;
  if pay.status in ('complete', 'rejected') then
    return 'duplicate';
  end if;
  if p_pf_payment_id is not null
     and exists (select 1 from public.payments p where p.pf_payment_id = p_pf_payment_id and p.id <> pay.id) then
    return 'ignored';
  end if;

  if not coalesce(p_merchant_ok, false) or p_amount_cents is distinct from pay.amount_cents then
    update public.payments
    set status = 'rejected', pf_payment_id = p_pf_payment_id, pf_status = p_status,
        reject_reason = case when not coalesce(p_merchant_ok, false) then 'merchant' else 'amount' end
    where id = pay.id;
    insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id)
    values (pay.household_id, pay.user_id, 'payment.rejected', 'payments', pay.id);
    return 'rejected';
  end if;

  if p_status = 'COMPLETE' then
    update public.payments
    set status = 'complete', pf_payment_id = p_pf_payment_id, pf_status = p_status, completed_at = now()
    where id = pay.id;
    select greatest(now(), coalesce(max(e.ends_at), now())) into starts
    from public.entitlements e where e.household_id = pay.household_id;
    insert into public.entitlements (household_id, kind, starts_at, ends_at, payment_id)
    values (pay.household_id, 'pilot', starts, starts + make_interval(days => pay.access_days), pay.id);
    insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id)
    values (pay.household_id, pay.user_id, 'payment.completed', 'payments', pay.id),
           (pay.household_id, pay.user_id, 'entitlement.granted', 'payments', pay.id);
    return 'granted';
  elsif p_status = 'FAILED' then
    update public.payments set status = 'failed', pf_payment_id = p_pf_payment_id, pf_status = p_status
    where id = pay.id;
    return 'failed';
  elsif p_status = 'PENDING' then
    update public.payments set pf_payment_id = p_pf_payment_id, pf_status = p_status where id = pay.id;
    return 'pending';
  end if;
  return 'ignored';
end;
$$;

revoke all on function public.plan_offer(text) from public, anon;
grant execute on function public.plan_offer(text) to authenticated;
revoke all on function public.start_checkout(text) from public, anon;
grant execute on function public.start_checkout(text) to authenticated;
-- Called by the notify route without a user session; the secret is the real gate.
revoke all on function public.payfast_apply_itn(text, uuid, text, text, bigint, boolean) from public;
grant execute on function public.payfast_apply_itn(text, uuid, text, text, bigint, boolean) to anon, authenticated;
