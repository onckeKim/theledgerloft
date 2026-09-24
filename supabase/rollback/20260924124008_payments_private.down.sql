-- Rollback for 20260924124008_payments_private.sql: re-run the function part of 20260924123752_payments.sql
-- (it recreates the public SECURITY DEFINER versions), then drop the private bodies.
drop function if exists private.payfast_apply_itn_impl(text, uuid, text, text, bigint, boolean);
drop function if exists private.start_checkout_impl(text);
drop function if exists private.plan_offer_impl(text);
revoke usage on schema private from anon;
