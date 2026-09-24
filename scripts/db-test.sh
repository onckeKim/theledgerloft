#!/usr/bin/env bash
# Runs the SQL test files in supabase/tests against a database (default: the local Supabase stack).
# Each file ends by raising "<NAME>_TESTS passed=N failed=M", which also rolls everything back.
# Usage: npm run db:test            (local stack from `npm run db:start`)
#        DATABASE_URL=... npm run db:test
set -uo pipefail
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
status=0
for f in supabase/tests/*.sql; do
  out=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -X -q -f "$f" 2>&1)
  line=$(grep -oE "[A-Z_]+_TESTS passed=[0-9]+ failed=[0-9]+" <<<"$out" | head -1)
  if [[ "$line" =~ failed=0$ ]]; then
    echo "✓ $f: $line"
  else
    echo "✗ $f"
    echo "$out" | sed 's/^/    /'
    status=1
  fi
done
exit $status
