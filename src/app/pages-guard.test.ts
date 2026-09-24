import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Every signed-in page checks access itself (threat T1; layouts don't re-run on navigation).
// Pages that need pilot access call requireAccess(); only settings, data rights and joining use verifySession()
// alone (PRD route map: [A] vs [E]; US-43, US-44 work without entitlement).
const appDir = fileURLToPath(new URL(".", import.meta.url));
const root = fileURLToPath(new URL("../..", import.meta.url));
const PROTECTED_GROUPS = ["(app)", "(setup)"];
const OPEN_TO_SIGNED_IN = /\/app\/(settings|join)(\/|$)/;

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
  it.each(found.map((p) => [p.slice(appDir.length)]))("%s checks access", (rel) => {
    const src = readFileSync(join(appDir, rel), "utf8");
    const route = `/${rel.replace(/\(.*?\)\//g, "").replace(/\/page\.tsx$/, "")}`;
    if (OPEN_TO_SIGNED_IN.test(route)) expect(src).toMatch(/await (verifySession|requireAccess)\(/);
    else expect(src).toMatch(/await requireAccess\(/);
  });
  it("reset-password is protected too", () => {
    expect(readFileSync(join(appDir, "(auth)/reset-password/page.tsx"), "utf8")).toMatch(
      /await verifySession\(/,
    );
  });
});

describe("server actions check access", () => {
  const files = [
    "src/lib/budget/actions.ts",
    "src/lib/goals/actions.ts",
    "src/lib/debts/actions.ts",
    "src/lib/review/actions.ts",
    "src/app/(setup)/app/setup/actions.ts",
  ];
  it.each(files)("every action in %s calls requireAccess()", (f) => {
    const src = readFileSync(join(root, f), "utf8");
    const actions = src.match(/^export async function /gm)?.length ?? 0;
    expect(actions).toBeGreaterThan(0);
    expect(src.match(/await requireAccess\(/g)?.length).toBe(actions);
  });
  it("exports: the review PDF needs access, all-my-data doesn't", () => {
    const src = readFileSync(join(root, "src/lib/export/actions.ts"), "utf8");
    expect(src).toMatch(/createReviewPdf[\s\S]*?await requireAccess\(/);
    expect(src).toMatch(/createDataExport[\s\S]*?await verifySession\(/);
  });
});
