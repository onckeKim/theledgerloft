#!/usr/bin/env bash
# Logical backup of a Supabase database, following Supabase's "Backup and Restore using the CLI" guide.
# Writes roles.sql, schema.sql, data.sql and the migration history into a new dated folder.
# Usage: DB_URL='postgresql://…' bash scripts/db-backup.sh [out-dir]   (hosted: the Session pooler string)
#        bash scripts/db-backup.sh --local [out-dir]                   (the local stack)
# The files hold personal data once real users exist: store them encrypted, off-site, never in the repo.
# Restore steps: docs/release/operations.md, "Backups and restore".
set -euo pipefail
if [[ "${1:-}" == "--local" ]]; then
  src=(--local)
  shift
else
  : "${DB_URL:?Set DB_URL to the database connection string, or pass --local}"
  src=(--db-url "$DB_URL")
fi
umask 077
out="${1:-backups}/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$out"
npx supabase db dump "${src[@]}" -f "$out/roles.sql" --role-only
npx supabase db dump "${src[@]}" -f "$out/schema.sql"
npx supabase db dump "${src[@]}" -f "$out/data.sql" --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
npx supabase db dump "${src[@]}" -f "$out/history_schema.sql" --schema supabase_migrations
npx supabase db dump "${src[@]}" -f "$out/history_data.sql" --use-copy --data-only --schema supabase_migrations
(cd "$out" && sha256sum ./*.sql >SHA256SUMS)
echo "Backup written to $out"
