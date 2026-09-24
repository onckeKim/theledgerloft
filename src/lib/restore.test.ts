import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// `supabase db dump` skips the Supabase-managed auth and storage schemas and the pg_cron job table, so a restore
// loses any trigger or scheduled job the migrations put there (B6 restore rehearsal).
// supabase/restore/after_schema.sql re-creates them; keep it complete.
const supabaseDir = fileURLToPath(new URL("../../supabase", import.meta.url));
const TRIGGER = /create\s+(?:or\s+replace\s+)?trigger\s+(\w+)[^;]*?\bon\s+(auth|storage)\.(\w+)/gi;
const CRON_JOB = /cron\.schedule\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\s*\)/gi;

function managed(sql: string): string[] {
  return [
    ...[...sql.matchAll(TRIGGER)].map((m) => `trigger ${m[1]} on ${m[2]}.${m[3]}`.toLowerCase()),
    ...[...sql.matchAll(CRON_JOB)].map((m) => `cron job ${m[1]} at "${m[2]}": ${m[3]}`),
  ];
}

describe("restore covers what the dump leaves out", () => {
  const migrationsDir = join(supabaseDir, "migrations");
  const inMigrations = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .flatMap((f) => managed(readFileSync(join(migrationsDir, f), "utf8")));
  const inRestore = managed(readFileSync(join(supabaseDir, "restore/after_schema.sql"), "utf8"));

  it("finds the auth triggers and cron jobs in the migrations", () => {
    expect(inMigrations).toContain("trigger on_auth_user_created on auth.users");
    expect(inMigrations.some((m) => m.startsWith("cron job "))).toBe(true);
  });
  it.each(inMigrations.map((m) => [m]))("re-creates %s", (m) => {
    expect(inRestore).toContain(m);
  });
});
