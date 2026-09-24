-- SYNTHETIC seed data for LOCAL development only (`supabase start` / `supabase db reset`).
-- Never run against a project that holds real users. Every value is made up: the prototype household from
-- docs/l3/screens.md ("Sam"), matching the L4 test vectors.
-- Sign in locally with: sam@example.test / Synthetic-seed-2026

do $$
declare
  uid uuid := '00000000-0000-4000-8000-00000000005a';
  hid uuid;
  b uuid;
  c record;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'sam@example.test',
    extensions.crypt('Synthetic-seed-2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', 'sam@example.test', 'email_verified', true),
    'email', now(), now(), now());

  select household_id into hid from public.household_members where user_id = uid;
  update public.profiles set display_name = 'Sam' where id = uid;
  update public.households set name = 'Sam (synthetic)', setup_completed_at = now() where id = hid;

  insert into public.income_items (household_id, name, monthly_cents, sort_order)
  values (hid, 'Salary', 1950000, 1), (hid, 'Side income', 224000, 2);

  insert into public.budgets (household_id, period, starts_on, ends_on)
  values (hid, '2026-09', '2026-09-01', '2026-09-30') returning id into b;

  for c in select * from (values
      ('Housing', 'fixed', null::text, 620000, 620000),
      ('Electricity & water', 'fixed', null, 110000, 110000),
      ('Phone & data', 'fixed', null, 45000, 45000),
      ('Insurance', 'fixed', null, 60000, 60000),
      ('Groceries', 'everyday', null, 340000, 365000),
      ('Transport', 'everyday', null, 140000, 98000),
      ('Personal & fun', 'everyday', null, 60000, 41000),
      ('Debt payments', 'debts', 'debt_payments', 260000, 260000),
      ('Sinking funds', 'saving', 'sinking_funds', 135000, 135000),
      ('Savings goals', 'saving', 'savings_goals', 80000, 80000)
    ) as v(name, grp, sys, planned, actual)
  loop
    with cat as (
      insert into public.categories (household_id, name, category_group, system_key)
      values (hid, c.name, c.grp, c.sys) returning id
    ), line as (
      insert into public.budget_lines (household_id, budget_id, category_id, planned_cents)
      select hid, b, id, c.planned from cat returning category_id
    )
    insert into public.transactions_manual (household_id, kind, amount_cents, occurred_on, category_id, description)
    select hid, 'outflow', c.actual, '2026-09-15', category_id, 'Synthetic total for ' || c.name from line;
  end loop;

  insert into public.debts (household_id, name, opening_balance_cents, balance_cents, rate_bp, min_payment_cents) values
    (hid, 'Store card', 215000, 215000, 2100, 45000),
    (hid, 'Credit card', 890000, 890000, 2075, 120000),
    (hid, 'Personal loan', 1460000, 1460000, 2400, 95000);

  insert into public.goals (household_id, kind, name, target_cents, monthly_cents, starting_cents, due_period) values
    (hid, 'goal', 'Emergency fund', 2000000, 80000, 640000, null),
    (hid, 'goal', 'Holiday', 800000, 0, 120000, null),
    (hid, 'sinking_fund', 'School fees', 720000, 60000, 480000, '2027-01'),
    (hid, 'sinking_fund', 'December', 500000, 50000, 400000, '2026-12'),
    (hid, 'sinking_fund', 'Car licence & service', 300000, 25000, 175000, '2027-03');
end;
$$;

-- LOCAL ONLY payments setup (playbook L9). A test price, a test secret and pilot access for Sam.
-- The hosted project starts with the plan closed and no secret; the owner sets both (supabase/README.md).
update private.plans set price_cents = 1000, active = true where code = 'pilot'; -- R 10,00, test value only
insert into private.app_secrets (name, secret_hash)
values ('payments', extensions.crypt('local-payments-secret-not-for-production', extensions.gen_salt('bf')));
insert into public.entitlements (household_id, kind, starts_at, ends_at)
select m.household_id, 'pilot', now(), now() + interval '90 days'
from public.household_members m where m.user_id = '00000000-0000-4000-8000-00000000005a';
