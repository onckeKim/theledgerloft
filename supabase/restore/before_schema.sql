-- Runs before schema.sql in scripts/db-restore.sh.
-- A new Supabase project grants everything on new public tables, sequences and functions to anon, authenticated
-- and service_role by default. schema.sql only re-applies the grants that existed, it never revokes, so without
-- this every table would come back open to anon (found in the B6 restore rehearsal). Clearing the defaults makes
-- the dump's own GRANT statements the exact privileges; after_schema.sql then puts the defaults back as the
-- migrations left them.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
