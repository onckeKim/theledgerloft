import { describe, expect, it } from "vitest";
import { goalStatus } from "./copy";
import { savedByGoal, withProgress } from "./progress";
import { parseAmount, parseDebt, parseGoal } from "./schemas";

const goal = {
  kind: "goal",
  name: "Emergency fund",
  target: "20 000",
  monthly: "800",
  starting: "6 400",
  due: "",
};

describe("parseGoal", () => {
  it("parses a savings goal into cents", () => {
    expect(parseGoal(goal, "2026-09")).toEqual({
      ok: true,
      data: {
        kind: "goal",
        name: "Emergency fund",
        target: 2_000_000,
        monthly: 80_000,
        starting: 640_000,
        due: null,
      },
    });
  });
  it("keys errors by field", () => {
    const r = parseGoal({ ...goal, name: " ", target: "" }, "2026-09");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["name", "target"]);
  });
  it("needs a due month from next month for a sinking fund", () => {
    const fund = { ...goal, kind: "sinking_fund", due: "2026-09" };
    const r = parseGoal(fund, "2026-09");
    expect(r.ok ? null : r.errors.due).toBe("Choose a month from next month up to 10 years ahead");
    expect(parseGoal({ ...fund, due: "2026-10" }, "2026-09").ok).toBe(true);
  });
  it("lets an existing fund keep a due month that has arrived", () => {
    const fund = { ...goal, kind: "sinking_fund", due: "2026-09" };
    const r = parseGoal(fund, "2026-09", "2026-09");
    expect(r.ok && r.data.due).toBe("2026-09");
    // …but not move to another past month
    expect(parseGoal({ ...fund, due: "2026-08" }, "2026-09", "2026-09").ok).toBe(false);
  });
});

describe("parseDebt", () => {
  const debt = { name: "Store card", balance: "2 150", minPayment: "450", rate: "21", note: "" };
  it("parses amounts, rate and an empty note", () => {
    expect(parseDebt(debt)).toEqual({
      ok: true,
      data: { name: "Store card", balance: 215_000, minPayment: 45_000, rateBp: 2100, note: null },
    });
  });
  it("treats a blank rate as not included and limits the note", () => {
    const r = parseDebt({ ...debt, rate: "", note: "x".repeat(201) });
    expect(r.ok ? null : r.errors).toEqual({ note: "Use 200 characters or fewer" });
    expect(parseDebt({ ...debt, rate: "" }).ok && parseDebt({ ...debt, rate: "" })).toMatchObject({
      data: { rateBp: null },
    });
  });
});

describe("parseAmount", () => {
  it("needs a positive amount and a real date", () => {
    expect(parseAmount({ amount: "0", date: "2026-02-30" })).toEqual({
      ok: false,
      errors: {
        amount: "Enter an amount between 0,01 and 99 999 999,99, like 500,00",
        date: "Enter a real date, like 2026-09-24",
      },
    });
    expect(parseAmount({ amount: "500", date: "2026-09-24", note: "  Statement  " })).toEqual({
      ok: true,
      data: { cents: 50_000, date: "2026-09-24", note: "Statement" },
    });
  });
  it("allows R 0,00 for a balance", () => {
    expect(parseAmount({ amount: "0", date: "2026-09-24" }, { allowZero: true }).ok).toBe(true);
  });
});

describe("goal progress", () => {
  const rows = [
    {
      id: "g",
      kind: "goal",
      name: "Emergency fund",
      target_cents: 2_000_000,
      monthly_cents: 80_000,
      starting_cents: 600_000,
      due_period: null,
    },
    {
      id: "f",
      kind: "sinking_fund",
      name: "School fees",
      target_cents: 720_000,
      monthly_cents: 60_000,
      starting_cents: 0,
      due_period: "2027-01",
    },
  ];
  const contributions = [
    { goal_id: "g", direction: "in", amount_cents: 50_000 },
    { goal_id: "g", direction: "out", amount_cents: 10_000 },
    { goal_id: "f", direction: "in", amount_cents: 480_000 },
    { goal_id: "other", direction: "in", amount_cents: 1 },
  ];
  it("adds money in and takes money out from the starting amount", () => {
    expect([...savedByGoal(rows, contributions)]).toEqual([
      ["g", 640_000],
      ["f", 480_000],
    ]);
  });
  it("matches L4 vectors G1 and S1", () => {
    const [g, f] = withProgress(rows, contributions, "2026-09");
    expect(g!.goal).toMatchObject({ percent: 32, estimate: { months: 17, period: "2028-02" } });
    expect(f!.fund).toMatchObject({
      status: "short",
      shortBy: 60_000,
      requiredMonthly: 80_000,
      percent: 66,
    });
  });
});

describe("goal status copy", () => {
  const plain = (t: string) => t.replace(/\u00a0/g, " ");
  const row = (over: Partial<Parameters<typeof withProgress>[0][number]>, contributions = []) =>
    withProgress(
      [
        {
          id: "x",
          kind: "goal",
          name: "X",
          target_cents: 100_000,
          monthly_cents: 0,
          starting_cents: 0,
          due_period: null,
          ...over,
        },
      ],
      contributions,
      "2026-09",
    )[0]!;
  it("covers goals without an estimate, with one, and reached", () => {
    expect(goalStatus(row({})).text).toBe("Add a monthly amount to see an estimate.");
    const withMonthly = goalStatus(row({ monthly_cents: 30_000 }));
    expect(plain(withMonthly.text)).toBe("Reaches R 1 000,00 around Jan 2027 at R 300,00 a month.");
    expect(withMonthly.estimate).toBe(true);
    expect(goalStatus(row({ starting_cents: 100_000 })).badge).toBe("Goal reached");
  });
  it("uses the L4 short copy for sinking funds (S1)", () => {
    const f = row({
      kind: "sinking_fund",
      target_cents: 720_000,
      monthly_cents: 60_000,
      starting_cents: 480_000,
      due_period: "2027-01",
    });
    expect(goalStatus(f).text.replace(/ /g, " ")).toBe(
      "R 600,00 short by January 2027 at this rate. R 800,00 a month would reach it.",
    );
    const passed = row({ kind: "sinking_fund", due_period: "2026-08" });
    expect(goalStatus(passed).text.replace(/ /g, " ")).toBe(
      "August 2026 has passed with R 1 000,00 still to find. You can change the due month or target.",
    );
  });
});
