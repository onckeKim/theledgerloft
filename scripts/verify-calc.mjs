#!/usr/bin/env node
// Runs docs/l4/test-vectors.json against scripts/calc-reference.mjs.
// Usage: node scripts/verify-calc.mjs   (exits 1 on any failure)
import { readFileSync } from "node:fs";
import * as C from "./calc-reference.mjs";

const { vectors } = JSON.parse(readFileSync(new URL("../docs/l4/test-vectors.json", import.meta.url), "utf8"));
const call = {
  budgetSummary: (i) => C.budgetSummary(i),
  goalProgress: (i) => C.goalProgress(i),
  sinkingFund: (i) => C.sinkingFund(i),
  projectDebts: (i) => C.projectDebts(i),
  orderDebts: (i) => C.orderDebts(i.debts, i.method),
  periodFor: (i) => C.periodFor(i.date, i.startDay),
  formatZAR: (i) => C.formatZAR(i.cents),
  formatRate: (i) => C.formatRate(i.bp),
};
// expected is a subset of actual; {} inside arrays skips that element
function match(exp, act, path, errs) {
  if (exp === null || typeof exp !== "object") {
    if (exp !== act) errs.push(`${path}: expected ${JSON.stringify(exp)}, got ${JSON.stringify(act)}`);
    return;
  }
  if (Array.isArray(exp)) {
    if (!Array.isArray(act)) return void errs.push(`${path}: expected array, got ${JSON.stringify(act)}`);
    if (exp.every((e) => typeof e !== "object" || e === null) && exp.length !== act.length) errs.push(`${path}: expected length ${exp.length}, got ${act.length}`);
    exp.forEach((e, i) => match(e, act[i], `${path}[${i}]`, errs));
    return;
  }
  if (act === null || typeof act !== "object") return void errs.push(`${path}: expected object, got ${JSON.stringify(act)}`);
  for (const k of Object.keys(exp)) match(exp[k], act[k], `${path}.${k}`, errs);
}
let failed = 0;
for (const v of vectors) {
  const errs = [];
  try {
    const out = call[v.fn](v.input);
    if (v.expected && v.expected.error) errs.push("expected an error, got a result");
    else match(v.expected, out, v.fn, errs);
  } catch (e) {
    if (!(v.expected && v.expected.error)) errs.push(`threw: ${e.message}`);
  }
  if (errs.length) { failed++; console.error(`✗ ${v.id} ${v.description}\n    ${errs.join("\n    ")}`); }
}
console.log(`${vectors.length - failed}/${vectors.length} vectors pass`);
process.exit(failed ? 1 : 0);
