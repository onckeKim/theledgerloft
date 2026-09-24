import { describe, expect, it } from "vitest";
import { parseBasics, parseDebtsGoals, parseMoneyRows } from "./schemas";
import { setupPlan } from "./plan";
import { resumeRoute, stepInfo } from "./steps";

describe("steps", () => {
  it("describes progress and neighbours", () => {
    expect(stepInfo("basics")).toMatchObject({
      number: 1,
      total: 6,
      prev: "welcome",
      next: "income",
      minutesLeft: 12,
    });
    expect(stepInfo("review")).toMatchObject({ number: 6, next: null, prev: "debts-goals" });
  });
  it("resumes after the last saved step", () => {
    expect(resumeRoute(null)).toBe("welcome");
    expect(resumeRoute("income")).toBe("bills");
    expect(resumeRoute("debts-goals")).toBe("review");
    expect(resumeRoute("nonsense")).toBe("basics");
  });
});

describe("parseBasics", () => {
  it("accepts valid choices", () => {
    expect(
      parseBasics({ payFrequency: "monthly", monthStartDay: "25", budgetStyle: "zero_based" }),
    ).toEqual({
      ok: true,
      data: { payFrequency: "monthly", monthStartDay: 25, budgetStyle: "zero_based" },
    });
  });
  it("rejects anything outside the lists", () => {
    const r = parseBasics({ payFrequency: "daily", monthStartDay: "31", budgetStyle: "" });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errors).sort()).toEqual([
        "budgetStyle",
        "monthStartDay",
        "payFrequency",
      ]);
  });
});

describe("parseMoneyRows", () => {
  it("parses typed amounts into cents and tidies names", () => {
    const r = parseMoneyRows(
      [{ key: "r1", name: "  Side   income ", amount: "2 240,00" }],
      "income",
    );
    expect(r).toEqual({
      ok: true,
      data: [{ key: "r1", id: undefined, name: "Side income", cents: 224000 }],
    });
  });
  it("puts each error next to its field, in plain words", () => {
    const r = parseMoneyRows(
      [
        { key: "r1", name: "", amount: "" },
        { key: "r2", name: "Groceries", amount: "abc" },
        { key: "r3", name: "groceries", amount: "10" },
      ],
      "spending category",
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors).toEqual({
        "r1.name": "Give this spending category a name",
        "r1.amount": "Enter an amount, like 1 250,00",
        "r2.amount": "Enter an amount between 0,01 and 99 999 999,99, like 1 250,00",
        "r3.name": "You've already added a spending category called “groceries”",
      });
  });
  it("rejects tampered row keys and ids", () => {
    expect(parseMoneyRows([{ key: "<script>", name: "x", amount: "1" }], "income").ok).toBe(false);
    expect(
      parseMoneyRows([{ key: "r1", id: "not-a-uuid", name: "x", amount: "1" }], "income").ok,
    ).toBe(false);
  });
  it("allows an empty list (steps can be skipped)", () => {
    expect(parseMoneyRows([], "bill")).toEqual({ ok: true, data: [] });
  });
});

describe("parseDebtsGoals", () => {
  const debt = {
    key: "d1",
    name: "Store card",
    balance: "2 150,00",
    minPayment: "450,00",
    rate: "21",
  };
  const fund = {
    key: "g1",
    kind: "sinking_fund" as const,
    name: "School fees",
    target: "7 200,00",
    monthly: "600",
    starting: "4 800",
    due: "2027-01",
  };

  it("parses the prototype debts and funds", () => {
    const r = parseDebtsGoals(
      [debt, { ...debt, key: "d2", name: "Loan", rate: "" }],
      [fund],
      "2026-09",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.debts[0]).toMatchObject({ balance: 215000, minPayment: 45000, rateBp: 2100 });
      expect(r.data.debts[1]!.rateBp).toBeNull();
      expect(r.data.goals[0]).toMatchObject({
        target: 720000,
        monthly: 60000,
        starting: 480000,
        due: "2027-01",
      });
    }
  });
  it("needs a due month from next month up to 10 years ahead", () => {
    for (const due of ["2026-09", "2036-10", "", "2027-13"]) {
      const r = parseDebtsGoals([], [{ ...fund, due }], "2026-09");
      expect(r.ok).toBe(false);
    }
    expect(parseDebtsGoals([], [{ ...fund, due: "2026-10" }], "2026-09").ok).toBe(true);
  });
  it("treats blank monthly and starting amounts as zero for goals", () => {
    const r = parseDebtsGoals(
      [],
      [
        {
          key: "g2",
          kind: "goal",
          name: "Holiday",
          target: "8000",
          monthly: "",
          starting: "",
          due: "",
        },
      ],
      "2026-09",
    );
    expect(r.ok && r.data.goals[0]).toMatchObject({ monthly: 0, starting: 0, due: null });
  });
  it("rejects rates above 100%", () => {
    const r = parseDebtsGoals([{ ...debt, rate: "120" }], [], "2026-09");
    expect(!r.ok && r.errors["d1.rate"]).toMatch(/0 to 100/);
  });
});

describe("setupPlan", () => {
  it("reproduces the prototype review (L4 B1: planned R 18 500,00, left R 3 240,00)", () => {
    const plan = setupPlan({
      income: [
        { name: "Salary", cents: 1950000 },
        { name: "Side income", cents: 224000 },
      ],
      bills: [620000, 110000, 45000, 60000].map((cents) => ({ name: "b", cents })),
      spending: [340000, 140000, 60000].map((cents) => ({ name: "s", cents })),
      debts: [{ minPayment: 45000 }, { minPayment: 120000 }, { minPayment: 95000 }],
      goals: [
        { kind: "goal", monthly: 80000 },
        { kind: "goal", monthly: 0 },
        { kind: "sinking_fund", monthly: 60000 },
        { kind: "sinking_fund", monthly: 50000 },
        { kind: "sinking_fund", monthly: 25000 },
      ],
    });
    expect(plan.income.cents).toBe(2174000);
    expect(plan.planned.map((p) => p.cents)).toEqual([835000, 540000, 260000, 135000, 80000]);
    expect(plan.plannedTotal).toBe(1850000);
    expect(plan.leftToBudget).toBe(324000);
    expect(plan.overPlanned).toBe(0);
  });
  it("reports over-planning without blocking", () => {
    const plan = setupPlan({
      income: [{ name: "Pay", cents: 1000000 }],
      bills: [{ name: "Rent", cents: 1040000 }],
      spending: [],
      debts: [],
      goals: [],
    });
    expect(plan.leftToBudget).toBe(-40000);
    expect(plan.overPlanned).toBe(40000);
  });
});
