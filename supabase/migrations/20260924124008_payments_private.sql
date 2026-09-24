-- Payments, tidied for the security advisor (lints 0028/0029): the privileged bodies move to the private schema,
-- which the API doesn't expose, behind thin SECURITY INVOKER wrappers in public. Behaviour is unchanged.
-- Only anon (the notify route has no user session) may apply notifications; signed-in users no longer can.
-- Rollback: see supabase/rollback/20260924124008_payments_private.down.sql

-- anon needs to reach private.payfast_apply_itn_impl. Nothing else in private is executable by anon:
grant usage on schema private to anon;
revoke execute on function private.audit_export_created(), private.audit_setup_completed(),
  private.set_transaction_period(), private.set_updated_at() from public;

create or replace function private.plan_offer_impl(p_plan text default 'pilot')
returns table (name text, price_cents bigint, access_days integer, open boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name, p.price_cents, p.access_days, p.active and p.price_cents is not null
  from private.plans p where p.code = p_plan;
$$;

create or replace function private.start_checkout_impl(p_plan text default 'pilot')
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

create or replace function private.payfast_apply_itn_impl(
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

revoke all on function private.plan_offer_impl(text) from public, anon;
grant execute on function private.plan_offer_impl(text) to authenticated;
revoke all on function private.start_checkout_impl(text) from public, anon;
grant execute on function private.start_checkout_impl(text) to authenticated;
revoke all on function private.payfast_apply_itn_impl(text, uuid, text, text, bigint, boolean) from public, authenticated;
grant execute on function private.payfast_apply_itn_impl(text, uuid, text, text, bigint, boolean) to anon;

create or replace function public.plan_offer(p_plan text default 'pilot')
returns table (name text, price_cents bigint, access_days integer, open boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.plan_offer_impl(p_plan); $$;

create or replace function public.start_checkout(p_plan text default 'pilot')
returns table (payment_id uuid, amount_cents bigint, item_name text)
language sql
security invoker
set search_path = ''
as $$ select * from private.start_checkout_impl(p_plan); $$;

create or replace function public.payfast_apply_itn(
  p_secret text, p_payment_id uuid, p_pf_payment_id text, p_status text, p_amount_cents bigint, p_merchant_ok boolean
)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.payfast_apply_itn_impl(p_secret, p_payment_id, p_pf_payment_id, p_status, p_amount_cents, p_merchant_ok); $$;

revoke all on function public.payfast_apply_itn(text, uuid, text, text, bigint, boolean) from public, authenticated;
grant execute on function public.payfast_apply_itn(text, uuid, text, text, bigint, boolean) to anon;
