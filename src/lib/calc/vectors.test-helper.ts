import { readFileSync } from "node:fs";

export type Vector = {
  id: string;
  fn: string;
  description: string;
  input: unknown;
  expected: unknown;
};

export const vectors: Vector[] = (
  JSON.parse(
    readFileSync(new URL("../../../docs/l4/test-vectors.json", import.meta.url), "utf8"),
  ) as { vectors: Vector[] }
).vectors;

/** Subset match used by scripts/verify-calc.mjs: listed keys must match; {} in an array skips that element. */
export function subsetMismatches(expected: unknown, actual: unknown, path = "$"): string[] {
  if (expected === null || typeof expected !== "object") {
    return expected === actual
      ? []
      : [`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [`${path}: expected an array`];
    const lengthCheck =
      expected.every((e) => typeof e !== "object" || e === null) &&
      expected.length !== actual.length
        ? [`${path}: expected length ${expected.length}, got ${actual.length}`]
        : [];
    return [
      ...lengthCheck,
      ...expected.flatMap((e, i) => subsetMismatches(e, actual[i], `${path}[${i}]`)),
    ];
  }
  if (actual === null || typeof actual !== "object") return [`${path}: expected an object`];
  return Object.entries(expected).flatMap(([k, v]) =>
    subsetMismatches(v, (actual as Record<string, unknown>)[k], `${path}.${k}`),
  );
}
