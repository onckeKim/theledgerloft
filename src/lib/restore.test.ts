import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// `supabase db dump` skips the Supabase-managed auth and storage schemas, so a restore loses any trigger the
// migrations put there (B6 restore rehearsal). supabase/restore/after_schema.sql re-creates them; keep it complete.
const supabaseDir = fileURLToPath(new URL("../../supabase", import.meta.url));
const TRIGGER = /create\s+(?:or\s+replace\s+)?trigger\s+(\w+)[^;]*?\bon\s+(auth|storage)\.(\w+)/gi;

function triggers(sql: string): string[] {
  return [...sql.matchAll(TRIGGER)].map((m) => `${m[1]} on ${m[2]}.${m[3]}`.toLowerCase());
}

describe("restore covers the managed schemas", () => {
  const migrationsDir = join(supabaseDir, "migrations");
  const inMigrations = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .flatMap((f) => triggers(readFileSync(join(migrationsDir, f), "utf8")));
  const inRestore = triggers(readFileSync(join(supabaseDir, "restore/after_schema.sql"), "utf8"));

  it("finds the auth triggers in the migrations", () => {
    expect(inMigrations).toContain("on_auth_user_created on auth.users");
  });
  it.each(inMigrations.map((t) => [t]))("re-creates %s", (t) => {
    expect(inRestore).toContain(t);
  });
});
