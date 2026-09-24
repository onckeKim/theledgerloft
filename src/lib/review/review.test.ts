import { describe, expect, it } from "vitest";
import { parseCheckin } from "./schemas";
import { periodRange } from "@/lib/calc/period";
import {
  buildReview,
  checkinOpensOn,
  incomeDifference,
  leftOverNote,
  spendingDifference,
} from "./review";

const plain = (t: string) => t.replace(/ /g, " ");

describe("period range and check-in window", () => {
  it("labels periods by the month they end in (L4 §3)", () => {
    expect(periodRange("2026-09", 1)).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(periodRange("2026-09", 25)).toEqual({ start: "2026-08-25", end: "2026-09-24" });
    expect(periodRange("2028-02", 1)).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });
  it("opens 3 days before the period ends", () => {
    expect(checkinOpensOn("2026-09-30")).toBe("2026-09-28");
    expect(checkinOpensOn("2026-03-01")).toBe("2026-02-27");
  });
});

describe("differences in words (L4 §4, vector B2)", () => {
  it("spending is planned − actual", () => {
    expect(plain(spendingDifference(340_000, 331_000))).toBe("R 90,00 under");
    expect(plain(spendingDifference(140_000, 152_000))).toBe("R 120,00 over");
    expect(spendingDifference(60_000, 60_000)).toBe("On plan");
  });
  it("income is actual − planned", () => {
    expect(plain(incomeDifference(2_174_000, 2_238_000))).toBe("R 640,00 more");
    expect(plain(incomeDifference(2_174_000, 2_000_000))).toBe("R 1 740,00 less");
  });
  it("left over below zero is described, not coloured", () => {
    expect(leftOverNote(100)).toBeNull();
    expect(plain(leftOverNote(-25_000)!)).toBe(
      "You've spent R 250,00 more than the income recorded this month.",
    );
  });
});

describe("buildReview: the August 2026 prototype review (B2)", () => {
  const plan: [string, number, number][] = [
    ["Housing", 620_000, 620_000],
    ["Electricity & water", 110_000, 118_400],
    ["Phone & data", 45_000, 45_000],
    ["Insurance", 60_000, 60_000],
    ["Groceries", 340_000, 331_000],
    ["Transport", 140_000, 152_000],
    ["Personal & fun", 60_000, 74_500],
    ["Debt payments", 260_000, 260_000],
    ["Sinking funds", 135_000, 135_000],
    ["Savings goals", 80_000, 80_000],
  ];
  const review = buildReview({
    incomePlanned: [{ planned: 1_950_000 }, { planned: 224_000 }],
    lines: plan.map(([name, planned], i) => ({ categoryId: `c${i}`, name, planned, sort: i })),
    categoryNames: new Map([["gifts", "Gifts"]]),
    tx: [
      { kind: "income", categoryId: null, amount: 2_238_000 },
      ...plan.map(([, , actual], i) => ({
        kind: "outflow" as const,
        categoryId: `c${i}`,
        amount: actual,
      })),
    ],
    saved: [
      { name: "Emergency fund", cents: 80_000 },
      { name: "School fees", cents: 60_000 },
    ],
    debtPayments: [
      { name: "Store card", cents: 45_000 },
      { name: "Store card", cents: 0 },
    ],
  });
  it("matches the worked example", () => {
    expect(review.income.actual).toBe(2_238_000);
    expect(review.spent).toBe(1_875_900);
    expect(review.leftOver).toBe(362_100);
    expect(plain(review.total.difference)).toBe("R 259,00 over");
    expect(plain(review.income.difference)).toBe("R 640,00 more");
    expect(review.rows.map((r) => plain(r.difference))).toEqual([
      "On plan",
      "R 84,00 over",
      "On plan",
      "On plan",
      "R 90,00 under",
      "R 120,00 over",
      "R 145,00 over",
      "On plan",
      "On plan",
      "On plan",
    ]);
    expect(review.debtPayments).toEqual([{ name: "Store card", cents: 45_000 }]);
  });
  it("lists spending outside the plan", () => {
    const r = buildReview({
      incomePlanned: [],
      lines: [],
      categoryNames: new Map([["gifts", "Gifts"]]),
      tx: [{ kind: "outflow", categoryId: "gifts", amount: 20_000 }],
      saved: [],
      debtPayments: [],
    });
    expect(r.rows).toEqual([
      { name: "Gifts", planned: 0, actual: 20_000, difference: "Not in your plan", over: true },
    ]);
    expect(r.empty).toBe(false);
  });
});

describe("parseCheckin", () => {
  it("trims, drops empty actions and allows everything to be blank", () => {
    expect(
      parseCheckin({ wentWell: "  ", surprised: "", nextActions: [" Check  the meter ", ""] }),
    ).toEqual({
      ok: true,
      data: { wentWell: "", surprised: "", nextActions: ["Check the meter"] },
    });
  });
  it("limits lengths and the number of actions", () => {
    const r = parseCheckin({
      wentWell: "x".repeat(1001),
      surprised: "",
      nextActions: ["a", "b", "c", "d", "e", "f"],
    });
    expect(r.ok ? null : Object.keys(r.errors).sort()).toEqual(["nextActions", "wentWell"]);
    const long = parseCheckin({ wentWell: "", surprised: "", nextActions: ["x".repeat(121)] });
    expect(long.ok ? null : long.errors).toEqual({ "action-0": "Use 120 characters or fewer" });
  });
});
