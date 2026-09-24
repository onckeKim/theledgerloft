import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatRate, formatZAR, parseRandToCents, toCents } from "./money";

type Vector = { id: string; fn: string; input: Record<string, number>; expected: unknown };
const { vectors } = JSON.parse(
  readFileSync(new URL("../../docs/l4/test-vectors.json", import.meta.url), "utf8"),
) as { vectors: Vector[] };

describe("formatZAR matches L4 vectors", () => {
  for (const v of vectors.filter((v) => v.fn === "formatZAR")) {
    it(`${v.id}: ${v.input.cents} cents`, () => expect(formatZAR(v.input.cents!)).toBe(v.expected));
  }
});

describe("formatRate matches L4 vectors", () => {
  for (const v of vectors.filter((v) => v.fn === "formatRate")) {
    it(`${v.id}: ${v.input.bp} bp`, () => expect(formatRate(v.input.bp!)).toBe(v.expected));
  }
});

describe("toCents", () => {
  it("accepts integers", () => expect(toCents(250)).toBe(250));
  it.each([1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])("rejects %s", (n) =>
    expect(() => toCents(n)).toThrow(RangeError),
  );
});

describe("parseRandToCents", () => {
  it.each([
    ["1 234,56", 123456],
    ["1234.56", 123456],
    ["1,234.56", 123456],
    ["1.234,56", 123456],
    ["R 250", 25000],
    ["r250,5", 25050],
    [" 1 000,00 ", 100000],
    ["0,01", 1],
    ["99 999 999,99", 9_999_999_999],
    ["1,234", 123400], // three digits after a comma can only be a thousands group
  ])("%j → %i cents", (input, expected) => expect(parseRandToCents(input)).toBe(expected));

  it.each([
    "",
    "abc",
    "-5",
    "1,2345",
    "12.345,6.7",
    "0",
    "0,00",
    "100 000 000,00",
    "1e3",
    "12,",
    ",5",
  ])("rejects %j", (input) => expect(parseRandToCents(input)).toBeNull());
});
