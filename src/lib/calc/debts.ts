import { addMonths } from "./period";

/** Debt ordering and payoff projection (docs/l4/calculation-spec.md §6). Always shown as an Estimate. Vectors D1–D9. */

export type DebtInput = {
  id: string;
  balance: number;
  rateBp: number;
  minPayment: number;
  created: number;
};
export type DebtMethod = "snowball" | "avalanche";
export const MAX_MONTHS = 600;

/** Round n/d to the nearest integer, halves away from zero (L4 §2.3). */
export function divRoundHalfUp(n: number, d: number): number {
  const sign = n < 0 ? -1 : 1;
  const a = Math.abs(n);
  const q = Math.floor(a / d);
  const r = a - q * d;
  return sign * (2 * r >= d ? q + 1 : q);
}

export function orderDebts(debts: DebtInput[], method: DebtMethod): string[] {
  const byCreated = (a: DebtInput, b: DebtInput) => a.created - b.created;
  const cmp =
    method === "snowball"
      ? (a: DebtInput, b: DebtInput) =>
          a.balance - b.balance || b.rateBp - a.rateBp || byCreated(a, b)
      : (a: DebtInput, b: DebtInput) =>
          b.rateBp - a.rateBp || a.balance - b.balance || byCreated(a, b);
  return [...debts].sort(cmp).map((d) => d.id);
}

export function projectDebts({
  debts,
  method,
  extra = 0,
  currentPeriod,
}: {
  debts: DebtInput[];
  method: DebtMethod;
  extra?: number;
  currentPeriod: string;
}) {
  const open = debts.filter((d) => d.balance > 0);
  const order = orderDebts(open, method);
  const byId = new Map(open.map((d) => [d.id, d]));
  const bal = new Map(open.map((d) => [d.id, d.balance]));
  const interest = new Map(open.map((d) => [d.id, 0]));
  const paidOff = new Map<string, number>();
  const budget = open.reduce((a, d) => a + d.minPayment, 0) + extra;
  const monthlyInterest = (id: string) =>
    divRoundHalfUp(bal.get(id)! * byId.get(id)!.rateBp, 120_000);
  const notCovering = open
    .filter((d) => d.minPayment <= divRoundHalfUp(d.balance * d.rateBp, 120_000))
    .map((d) => d.id);

  let month = 0;
  while ([...bal.values()].some((b) => b > 0) && month < MAX_MONTHS) {
    month++;
    for (const id of order)
      if (bal.get(id)! > 0) {
        const i = monthlyInterest(id);
        bal.set(id, bal.get(id)! + i);
        interest.set(id, interest.get(id)! + i);
      }
    let pool = budget;
    for (const id of order)
      if (bal.get(id)! > 0) {
        const p = Math.min(byId.get(id)!.minPayment, bal.get(id)!, pool);
        bal.set(id, bal.get(id)! - p);
        pool -= p;
      }
    for (const id of order)
      if (bal.get(id)! > 0 && pool > 0) {
        const p = Math.min(pool, bal.get(id)!);
        bal.set(id, bal.get(id)! - p);
        pool -= p;
      }
    for (const id of order) if (bal.get(id) === 0 && !paidOff.has(id)) paidOff.set(id, month);
  }
  const done = [...bal.values()].every((b) => b === 0);
  return {
    order,
    monthlyBudget: budget,
    notCovering,
    debts: order.map((id) => {
      const m = paidOff.get(id) ?? null;
      return {
        id,
        months: m,
        period: m ? addMonths(currentPeriod, m) : null,
        interest: interest.get(id)!,
      };
    }),
    debtFree:
      done && open.length ? { months: month, period: addMonths(currentPeriod, month) } : null,
    totalInterest: [...interest.values()].reduce((a, b) => a + b, 0),
  };
}
