import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Every signed-in page must call verifySession() itself (threat T1; layouts don't re-run on navigation).
const root = fileURLToPath(new URL(".", import.meta.url));
function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return pages(p);
    return /^page\.(t|j)sx?$/.test(name) ? [p] : [];
  });
}

describe("app pages are protected", () => {
  const found = pages(root);
  it("finds the app pages", () => expect(found.length).toBeGreaterThan(0));
  it.each(found.map((p) => [p.slice(root.length)]))("%s calls verifySession()", (rel) => {
    expect(readFileSync(join(root, rel), "utf8")).toMatch(/await verifySession\(/);
  });
});
