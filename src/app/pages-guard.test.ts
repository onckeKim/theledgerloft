import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Every signed-in page must call verifySession() itself (threat T1; layouts don't re-run on navigation).
const appDir = fileURLToPath(new URL(".", import.meta.url));
const PROTECTED_GROUPS = ["(app)", "(setup)"];

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return pages(p);
    return /^page\.(t|j)sx?$/.test(name) ? [p] : [];
  });
}

describe("signed-in pages are protected", () => {
  const found = PROTECTED_GROUPS.flatMap((g) => pages(join(appDir, g)));
  it("finds pages in every protected group", () => {
    for (const g of PROTECTED_GROUPS) expect(found.some((p) => p.includes(`/${g}/`))).toBe(true);
  });
  it.each(found.map((p) => [p.slice(appDir.length)]))("%s calls verifySession()", (rel) => {
    expect(readFileSync(join(appDir, rel), "utf8")).toMatch(/await verifySession\(/);
  });
  it("reset-password is protected too", () => {
    expect(readFileSync(join(appDir, "(auth)/reset-password/page.tsx"), "utf8")).toMatch(
      /await verifySession\(/,
    );
  });
});
