// Reference implementation of docs/l4/calculation-spec.md.
// Purpose: prove the spec's worked examples and test vectors are correct. It is NOT app code:
// the app's calculation library (A3/L7) is written separately in TypeScript and must pass the same vectors.
// All money is integer cents. All rates are basis points (20,75% = 2075). Periods are "YYYY-MM" labels.

// ---- rounding ------------------------------------------------------------
/** Round a non-negative rational n/d to the nearest integer, halves away from zero (spec §2.3). */
export function divRoundHalfUp(n, d) {
  if (d <= 0) throw new Error("divisor must be positive");
  const sign = n < 0 ? -1 : 1;
  const a = Math.abs(n);
  const q = Math.floor(a / d), r = a - q * d;
  return sign * (2 * r >= d ? q + 1 : q);
}
/** Ceiling division for non-negative integers. */
export const divCeil = (n, d) => (n <= 0 ? 0 : Math.floor((n + d - 1) / d));

// ---- periods (§3) --------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
export function addMonths(label, k) {
  const [y, m] = label.split("-").map(Number);
  const t = y * 12 + (m - 1) + k;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
}
export const monthsBetween = (from, to) => {
  const [a, b] = from.split("-").map(Number), [c, d] = to.split("-").map(Number);
  return (c * 12 + d) - (a * 12 + b);
};
/** Budget period containing a local date (YYYY-MM-DD) for a month start day 1–28. Label = month the period ends in. */
export function periodFor(dateStr, startDay) {
  if (!(startDay >= 1 && startDay <= 28)) throw new Error("startDay must be 1–28");
  const [y, m, d] = dateStr.split("-").map(Number);
  const startMonth = d >= startDay ? `${y}-${pad(m)}` : addMonths(`${y}-${pad(m)}`, -1);
  const label = startDay === 1 ? startMonth : addMonths(startMonth, 1);
  const start = `${startMonth}-${pad(startDay)}`;
  const nextStartMonth = addMonths(startMonth, 1);
  // end = day before next start
  const [ny, nm] = nextStartMonth.split("-").map(Number);
  const endDate = new Date(Date.UTC(ny, nm - 1, startDay) - 86400000);
  const end = `${endDate.getUTCFullYear()}-${pad(endDate.getUTCMonth() + 1)}-${pad(endDate.getUTCDate())}`;
  return { label, start, end };
}

// ---- budget (§4) ---------------------------------------------------------
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
/**
 * lines: [{ category, planned }]; income: [{ planned }]; tx: [{ kind: "income"|"outflow"|"refund", category?, amount }]
 */
export function budgetSummary({ income, lines, tx }) {
  const incomePlanned = sum(income.map((i) => i.planned));
  const incomeActual = sum(tx.filter((t) => t.kind === "income").map((t) => t.amount));
  const plannedTotal = sum(lines.map((l) => l.planned));
  const actualBy = {};
  for (const t of tx) {
    if (t.kind === "income") continue;
    actualBy[t.category] = (actualBy[t.category] || 0) + (t.kind === "refund" ? -t.amount : t.amount);
  }
  const categories = lines.map((l) => {
    const actual = actualBy[l.category] || 0;
    const remaining = l.planned - actual;
    return { category: l.category, planned: l.planned, actual, remaining, over: Math.max(0, -remaining),
      status: l.planned === 0 ? (actual > 0 ? "unplanned" : "empty") : remaining < 0 ? "over" : remaining === 0 ? "spent" : "under",
      barPermille: l.planned === 0 ? (actual > 0 ? 1000 : 0) : Math.min(1000, Math.floor((Math.max(actual, 0) * 1000) / l.planned)) };
  });
  const unbudgeted = Object.keys(actualBy).filter((c) => !lines.some((l) => l.category === c)).map((c) => ({ category: c, actual: actualBy[c] }));
  const actualTotal = sum(Object.values(actualBy));
  const plannedBalance = incomePlanned - plannedTotal;
  return {
    incomePlanned, incomeActual, plannedTotal, actualTotal,
    plannedBalance, leftToBudget: plannedBalance, overPlanned: Math.max(0, -plannedBalance),
    planRemaining: plannedTotal - actualTotal,
    actualBalance: incomeActual - actualTotal,
    categories, unbudgeted,
  };
}

// ---- goals (§5) ----------------------------------------------------------
export function goalProgress({ saved, target, monthly = 0, currentPeriod }) {
  if (!(target > 0)) throw new Error("target must be > 0");
  const complete = saved >= target;
  const percent = complete ? 100 : Math.max(0, Math.floor((saved * 100) / target));
  const remaining = Math.max(0, target - saved);
  let estimate = null;
  if (!complete && monthly > 0) {
    const months = divCeil(remaining, monthly);
    estimate = { months, period: addMonths(currentPeriod, months) };
  }
  return { percent, remaining, complete, estimate };
}

export function sinkingFund({ saved, target, monthly = 0, currentPeriod, duePeriod }) {
  if (!(target > 0)) throw new Error("target must be > 0");
  const remaining = Math.max(0, target - saved);
  const contributionsLeft = Math.max(0, monthsBetween(currentPeriod, duePeriod) - 1);
  const projected = saved + monthly * contributionsLeft;
  const shortBy = Math.max(0, target - projected);
  const requiredMonthly = remaining === 0 ? 0 : contributionsLeft === 0 ? null : divCeil(remaining, contributionsLeft);
  let status;
  if (remaining === 0) status = "funded";
  else if (contributionsLeft === 0) status = monthsBetween(currentPeriod, duePeriod) < 0 ? "past-due" : "due-now";
  else status = shortBy === 0 ? "on-track" : "short";
  const reachPeriod = remaining === 0 ? currentPeriod : monthly > 0 && shortBy === 0 ? addMonths(currentPeriod, divCeil(remaining, monthly)) : null;
  return { remaining, contributionsLeft, projected, shortBy, requiredMonthly, status, reachPeriod,
    percent: remaining === 0 ? 100 : Math.floor((Math.max(saved, 0) * 100) / target) };
}

// ---- debts (§6) ----------------------------------------------------------
export function orderDebts(debts, method) {
  const byCreated = (a, b) => a.created - b.created;
  const cmp = method === "snowball"
    ? (a, b) => a.balance - b.balance || b.rateBp - a.rateBp || byCreated(a, b)
    : (a, b) => b.rateBp - a.rateBp || a.balance - b.balance || byCreated(a, b);
  return [...debts].sort(cmp).map((d) => d.id);
}

export const MAX_MONTHS = 600;
/** debts: [{ id, balance, rateBp, minPayment, created }]; extra: extra monthly amount on top of minimums. */
export function projectDebts({ debts, method, extra = 0, currentPeriod }) {
  const order = orderDebts(debts, method);
  const bal = Object.fromEntries(debts.map((d) => [d.id, d.balance]));
  const D = Object.fromEntries(debts.map((d) => [d.id, d]));
  const budget = sum(debts.map((d) => d.minPayment)) + extra;
  const paidOff = {}, interestBy = Object.fromEntries(debts.map((d) => [d.id, 0]));
  // a debt whose minimum payment never beats its first month's interest can't be estimated on its own
  const notCovering = debts.filter((d) => d.balance > 0 && d.minPayment <= divRoundHalfUp(d.balance * d.rateBp, 120000)).map((d) => d.id);
  let month = 0;
  while (Object.values(bal).some((b) => b > 0) && month < MAX_MONTHS) {
    month++;
    for (const id of order) if (bal[id] > 0) { const i = divRoundHalfUp(bal[id] * D[id].rateBp, 120000); bal[id] += i; interestBy[id] += i; }
    let pool = budget;
    for (const id of order) if (bal[id] > 0) { const p = Math.min(D[id].minPayment, bal[id], pool); bal[id] -= p; pool -= p; }
    for (const id of order) if (bal[id] > 0 && pool > 0) { const p = Math.min(pool, bal[id]); bal[id] -= p; pool -= p; }
    for (const id of order) if (bal[id] === 0 && !(id in paidOff)) paidOff[id] = month;
  }
  const done = Object.values(bal).every((b) => b === 0);
  return {
    order, monthlyBudget: budget, notCovering,
    debts: order.map((id) => ({ id, months: paidOff[id] ?? null, period: paidOff[id] ? addMonths(currentPeriod, paidOff[id]) : null, interest: interestBy[id] })),
    debtFree: done ? { months: month, period: addMonths(currentPeriod, month) } : null,
    totalInterest: sum(Object.values(interestBy)),
  };
}

// ---- formatting (§7) -----------------------------------------------------
const NBSP = " ", MINUS = "−";
export function formatZAR(cents) {
  const neg = cents < 0, a = Math.abs(cents);
  const r = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${neg ? MINUS : ""}R${NBSP}${r},${pad(a % 100)}`;
}
export const formatRate = (bp) => `${Math.floor(bp / 100)},${pad(bp % 100)}%`;
