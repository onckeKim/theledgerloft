#!/usr/bin/env bash
# Restores a scripts/db-backup.sh folder into a NEW, empty Supabase project, following Supabase's
# "Backup and Restore using the CLI" guide. Refuses to run if the target already has app tables,
# so it can't overwrite a live database.
# Usage: TARGET_DB_URL='postgresql://…' bash scripts/db-restore.sh <backup-folder>
set -euo pipefail
dir="${1:?Pass the backup folder written by scripts/db-backup.sh}"
: "${TARGET_DB_URL:?Set TARGET_DB_URL to the connection string of the new project}"
(cd "$dir" && sha256sum --quiet -c SHA256SUMS)

tables=$(psql "$TARGET_DB_URL" -X -Atc "select count(*) from pg_tables where schemaname = 'public'")
if [[ "$tables" != "0" ]]; then
  echo "Refusing: the target has $tables tables in public. Restore into a new, empty project." >&2
  exit 1
fi

# A new project already carries the platform's own parameter grants; only the platform can re-grant them.
roles=$(mktemp)
trap 'rm -f "$roles"' EXIT
grep -v '^GRANT SET ON PARAMETER ' "$dir/roles.sql" >"$roles"

psql --single-transaction --variable ON_ERROR_STOP=1 -X -q -o /dev/null \
  --file "$roles" \
  --file "$(dirname "$0")/../supabase/restore/before_schema.sql" \
  --file "$dir/schema.sql" \
  --file "$(dirname "$0")/../supabase/restore/after_schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$dir/data.sql" \
  --dbname "$TARGET_DB_URL"
psql --single-transaction --variable ON_ERROR_STOP=1 -X -q -o /dev/null \
  --file "$dir/history_schema.sql" \
  --file "$dir/history_data.sql" \
  --dbname "$TARGET_DB_URL"
echo "Restored $dir. Now run the checks in docs/release/operations.md, \"Backups and restore\"."
