-- Prints every privilege and managed-schema trigger the app depends on, one sorted line each.
-- After a restore, run it on the old and new database and diff the output; it must be identical.
--   psql "$OLD_DB_URL" -XAtf scripts/db-acl-snapshot.sql > old.txt
--   psql "$NEW_DB_URL" -XAtf scripts/db-acl-snapshot.sql > new.txt && diff old.txt new.txt
select line from (
  select format('schema %s %s', nspname, coalesce(nspacl, acldefault('n', nspowner))::text) as line
    from pg_namespace where nspname in ('public', 'private')
  union all
  select format('%s %s.%s %s', case relkind when 'S' then 'sequence' else 'table' end, n.nspname, relname,
                coalesce(relacl, acldefault(case relkind when 'S' then 's' else 'r' end::"char", relowner))::text)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private') and relkind in ('r', 'p', 'v', 'S')
  union all
  select format('function %s.%s(%s) %s', n.nspname, proname, pg_get_function_identity_arguments(p.oid),
                coalesce(proacl, acldefault('f', proowner))::text)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
  union all
  select format('default %s %s %s %s', pg_get_userbyid(defaclrole), coalesce(n.nspname, '*'),
                defaclobjtype::text, defaclacl::text)
    from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
    where coalesce(n.nspname, '*') in ('public', 'private', '*')
  union all
  select format('policy %s.%s %s', n.nspname, c.relname, pol.polname)
    from pg_policy pol join pg_class c on c.oid = pol.polrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private')
  union all
  select format('rls %s.%s enabled=%s forced=%s', n.nspname, relname, relrowsecurity, relforcerowsecurity)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private') and relkind = 'r'
  union all
  select format('trigger %s on %s.%s', tgname, n.nspname, c.relname)
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('auth', 'storage', 'public', 'private') and not tgisinternal
) x order by line;
