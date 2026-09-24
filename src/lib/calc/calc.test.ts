import { describe, expect, it } from "vitest";
import { budgetSummary } from "./budget";
import { addMonths, formatPeriod, monthsBetween, periodFor, todayInJohannesburg } from "./period";
import { subsetMismatches, vectors } from "./vectors.test-helper";

describe("budgetSummary matches L4 vectors B1–B6", () => {
  for (const v of vectors.filter((v) => v.fn === "budgetSummary")) {
    it(`${v.id}: ${v.description}`, () => {
      expect(
        subsetMismatches(v.expected, budgetSummary(v.input as Parameters<typeof budgetSummary>[0])),
      ).toEqual([]);
    });
  }
});

describe("periodFor matches L4 vectors P1–P7", () => {
  for (const v of vectors.filter((v) => v.fn === "periodFor")) {
    const input = v.input as { date: string; startDay: number };
    it(`${v.id}: ${v.description}`, () => {
      if ((v.expected as { error?: boolean }).error)
        expect(() => periodFor(input.date, input.startDay)).toThrow();
      else expect(subsetMismatches(v.expected, periodFor(input.date, input.startDay))).toEqual([]);
    });
  }
});

describe("period helpers", () => {
  it("adds and counts months across years", () => {
    expect(addMonths("2026-09", 17)).toBe("2028-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthsBetween("2026-09", "2027-01")).toBe(4);
  });
  it("formats periods", () => {
    expect(formatPeriod("2026-09")).toBe("September 2026");
    expect(formatPeriod("2026-09", "short")).toBe("Sep 2026");
  });
  it("uses Johannesburg time for today (UTC+2)", () => {
    expect(todayInJohannesburg(new Date("2026-09-30T22:30:00Z"))).toBe("2026-10-01");
    expect(todayInJohannesburg(new Date("2026-09-30T21:30:00Z"))).toBe("2026-09-30");
  });
});
