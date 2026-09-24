import { describe, expect, it } from "vitest";
import {
  isValidDate,
  likePattern,
  parseNewCategory,
  parsePlannedCents,
  parseTransaction,
} from "./schemas";

const cat = "3f1c2b8e-9a55-4c1e-8d0f-2b7a1c9e4d33";

describe("parsePlannedCents", () => {
  it.each([
    ["0", 0],
    ["0,00", 0],
    ["R 0", 0],
    ["3 400,00", 340000],
  ])("%j → %i", (input, cents) => expect(parsePlannedCents(input)).toBe(cents));
  it.each(["", "-1", "abc"])("rejects %j", (input) => expect(parsePlannedCents(input)).toBeNull());
});

describe("isValidDate", () => {
  it.each(["2026-09-24", "2028-02-29"])("accepts %s", (d) => expect(isValidDate(d)).toBe(true));
  it.each(["2026-02-29", "2026-13-01", "24/09/2026", "1999-12-31", ""])("rejects %j", (d) =>
    expect(isValidDate(d)).toBe(false),
  );
});

describe("parseTransaction", () => {
  it("parses spending", () => {
    expect(
      parseTransaction({
        kind: "outflow",
        amount: "642,15",
        description: "  Weekly   groceries ",
        categoryId: cat,
        date: "2026-09-23",
      }),
    ).toEqual({
      ok: true,
      data: {
        kind: "outflow",
        amountCents: 64215,
        description: "Weekly groceries",
        categoryId: cat,
        date: "2026-09-23",
      },
    });
  });
  it("doesn't need a category for income, and ignores one if sent", () => {
    const r = parseTransaction({
      kind: "income",
      amount: "1 120",
      description: "",
      categoryId: cat,
      date: "2026-09-21",
    });
    expect(r.ok && r.data).toMatchObject({
      categoryId: null,
      description: null,
      amountCents: 112000,
    });
  });
  it("requires a category for spending and refunds", () => {
    const r = parseTransaction({
      kind: "refund",
      amount: "10",
      description: "",
      categoryId: "",
      date: "2026-09-21",
    });
    expect(!r.ok && r.errors.categoryId).toBe("Choose a category");
  });
  it("reports every problem at once", () => {
    const r = parseTransaction({
      kind: "gift",
      amount: "0",
      description: "x".repeat(81),
      categoryId: "",
      date: "2026-02-30",
    });
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual([
      "amount",
      "date",
      "description",
      "kind",
    ]);
  });
});

describe("parseNewCategory", () => {
  it("accepts a zero plan", () => {
    expect(parseNewCategory({ name: "Gifts", group: "everyday", planned: "0" })).toEqual({
      ok: true,
      data: { name: "Gifts", group: "everyday", plannedCents: 0 },
    });
  });
  it("only allows user groups", () => {
    expect(parseNewCategory({ name: "X", group: "debts", planned: "1" }).ok).toBe(false);
  });
});

describe("likePattern", () => {
  it("escapes wildcards", () => expect(likePattern(" 50%_off ")).toBe("%50\\%\\_off%"));
});
