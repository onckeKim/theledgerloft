-- Rollback for 20260924123752_payments.sql. DESTROYS payment and entitlement records: export them first.
drop function if exists public.payfast_apply_itn(text, uuid, text, text, bigint, boolean);
drop function if exists public.start_checkout(text);
drop function if exists public.plan_offer(text);
drop table if exists public.entitlements;
drop table if exists public.payments;
drop table if exists private.app_secrets;
drop table if exists private.plans;
