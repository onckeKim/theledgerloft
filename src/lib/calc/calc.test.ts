import { describe, expect, it } from "vitest";
import { budgetSummary } from "./budget";
import { divRoundHalfUp, orderDebts, projectDebts, type DebtInput } from "./debts";
import { goalProgress, sinkingFund } from "./goals";
import { addMonths, formatPeriod, monthsBetween, periodFor, todayInJohannesburg } from "./period";
import { formatRate, formatZAR } from "@/lib/money";
import { subsetMismatches, vectors, type Vector } from "./vectors.test-helper";

// Every L4 vector runs against the app's own implementation (the reference in scripts/ only proves the vectors).
const impl: Record<string, (input: never) => unknown> = {
  budgetSummary: (i: Parameters<typeof budgetSummary>[0]) => budgetSummary(i),
  goalProgress: (i: Parameters<typeof goalProgress>[0]) => goalProgress(i),
  sinkingFund: (i: Parameters<typeof sinkingFund>[0]) => sinkingFund(i),
  projectDebts: (i: Parameters<typeof projectDebts>[0]) => projectDebts(i),
  orderDebts: (i: { debts: DebtInput[]; method: "snowball" | "avalanche" }) =>
    orderDebts(i.debts, i.method),
  periodFor: (i: { date: string; startDay: number }) => periodFor(i.date, i.startDay),
  formatZAR: (i: { cents: number }) => formatZAR(i.cents),
  formatRate: (i: { bp: number }) => formatRate(i.bp),
};

describe("L4 vectors against the app implementation", () => {
  it("covers every function the vectors use", () => {
    expect([...new Set(vectors.map((v) => v.fn))].filter((fn) => !impl[fn])).toEqual([]);
  });
  const run = (v: Vector) => impl[v.fn]!(v.input as never);
  for (const v of vectors) {
    it(`${v.id}: ${v.description}`, () => {
      if ((v.expected as { error?: boolean } | null)?.error) expect(() => run(v)).toThrow();
      else expect(subsetMismatches(v.expected, run(v))).toEqual([]);
    });
  }
});

describe("boundary cases beyond the vectors", () => {
  it("rounds interest halves away from zero, including negatives", () => {
    expect(divRoundHalfUp(5, 10)).toBe(1);
    expect(divRoundHalfUp(4, 10)).toBe(0);
    expect(divRoundHalfUp(-5, 10)).toBe(-1);
  });
  it("projects nothing for no debts", () => {
    expect(projectDebts({ debts: [], method: "snowball", currentPeriod: "2026-09" })).toMatchObject(
      {
        order: [],
        debtFree: null,
        totalInterest: 0,
      },
    );
  });
  it("ignores debts already at zero", () => {
    const r = projectDebts({
      debts: [
        { id: "a", balance: 0, rateBp: 0, minPayment: 100, created: 1 },
        { id: "b", balance: 300, rateBp: 0, minPayment: 100, created: 2 },
      ],
      method: "snowball",
      currentPeriod: "2026-09",
    });
    expect(r.order).toEqual(["b"]);
    expect(r.monthlyBudget).toBe(100);
    expect(r.debtFree).toEqual({ months: 3, period: "2026-12" });
  });
  it("treats a negative saved balance as 0% (withdrawals can't go below zero in the UI)", () => {
    expect(goalProgress({ saved: -100, target: 1000, currentPeriod: "2026-09" }).percent).toBe(0);
  });
  it("handles an empty budget month", () => {
    expect(budgetSummary({ income: [], lines: [], tx: [] })).toMatchObject({
      leftToBudget: 0,
      actualBalance: 0,
    });
  });
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

describe("spec version", () => {
  it("matches the calculation spec's status line", async () => {
    const { readFileSync } = await import("node:fs");
    const { CALC_SPEC_VERSION } = await import("./version");
    const spec = readFileSync("docs/l4/calculation-spec.md", "utf8");
    expect(spec).toContain(`Status: v${CALC_SPEC_VERSION} `);
  });
});
