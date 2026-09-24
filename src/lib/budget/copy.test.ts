import { describe, expect, it } from "vitest";
import { leftToBudgetNote, remainingText } from "./copy";

const NB = " ";
const base = { remaining: 0, over: 0, actual: 0, planned: 0 };

describe("remainingText", () => {
  it("uses words for every status", () => {
    expect(
      remainingText({
        ...base,
        status: "over",
        remaining: -25000,
        over: 25000,
        actual: 365000,
        planned: 340000,
      }),
    ).toBe(`R${NB}250,00 over`);
    expect(
      remainingText({ ...base, status: "under", remaining: 42000, actual: 98000, planned: 140000 }),
    ).toBe(`R${NB}420,00 left`);
    expect(remainingText({ ...base, status: "spent", actual: 1, planned: 1 })).toBe(
      "Spent as planned",
    );
    expect(remainingText({ ...base, status: "unplanned", actual: 15000, over: 15000 })).toBe(
      `R${NB}150,00 not planned`,
    );
    expect(remainingText({ ...base, status: "empty" })).toBe("Not planned yet");
    expect(
      remainingText({ ...base, status: "under", actual: -5000, planned: 10000, remaining: 15000 }),
    ).toBe(`R${NB}50,00 refunded`);
  });
});

describe("leftToBudgetNote", () => {
  it("is neutral when over-planned and depends on style otherwise", () => {
    expect(leftToBudgetNote("flexible", -40000)).toBe(
      `You've planned R${NB}400,00 more than your income. Adjust a category to balance.`,
    );
    expect(leftToBudgetNote("zero_based", 324000)).toBe(
      `Assign R${NB}3${NB}240,00 to reach R 0,00.`,
    );
    expect(leftToBudgetNote("flexible", 324000)).toMatch(/Unassigned/);
    expect(leftToBudgetNote("zero_based", 0)).toBe("Every rand has a job this month.");
  });
});
