#!/usr/bin/env node
// Checks The Ledger Loft Co design tokens:
//  1. every colour in tokens.json matches tokens.css, the Kotlin and the Swift files
//  2. WCAG 2.2 contrast for the pairings the design system relies on
// Usage: node scripts/check-tokens.mjs   (exits 1 on any required failure)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "design", "tokens");
const read = (p) => readFileSync(join(root, p), "utf8");
const json = JSON.parse(read("tokens.json"));
const css = read("tokens.css");
const kt = read("platforms/LedgerLoftTokens.kt");
const swift = read("platforms/LedgerLoftTokens.swift");
const appCss = read("app.css");

const kebab = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
let failures = 0;

// 1. Cross-platform consistency
const colors = Object.fromEntries(
  Object.entries(json.color).map(([k, v]) => [k, v.$value.toUpperCase()]),
);
for (const [name, hex] of Object.entries(colors)) {
  const checks = {
    css: new RegExp(`--ll-color-${kebab(name)}:\\s*${hex}\\b`, "i").test(css),
    kotlin: kt.includes(`val ${name} = Color(0xFF${hex.slice(1)})`),
    swift: new RegExp(`static let ${name} = .*// ${hex}\\b`, "i").test(swift),
  };
  for (const [platform, ok] of Object.entries(checks)) {
    if (!ok) {
      console.error(`✗ ${name} (${hex}) missing or different in ${platform}`);
      failures++;
    }
  }
}
for (const theme of ["light", "dark"]) {
  for (const [name, tok] of Object.entries(json.theme[theme])) {
    const [lightBlock, darkBlock] = css.split(/^\[data-theme="dark"\]\s*\{/m);
    const block = theme === "light" ? lightBlock : darkBlock;
    if (!new RegExp(`--ll-${kebab(name)}:\\s*${tok.$value}\\b`, "i").test(block)) {
      console.error(`✗ theme.${theme}.${name} (${tok.$value}) differs in tokens.css`);
      failures++;
    }
  }
}
if (!failures) console.log(`✓ ${Object.keys(colors).length} colours and both themes consistent across JSON, CSS, Kotlin, Swift`);

// 2. Contrast
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const L = Object.fromEntries(Object.entries(json.theme.light).map(([k, v]) => [k, v.$value]));
const D = Object.fromEntries(Object.entries(json.theme.dark).map(([k, v]) => [k, v.$value]));

// App layer (app.css): first block is light, second is [data-theme="dark"]
const [appLightCss, appDarkCss] = appCss.split(/^\[data-theme="dark"\]\s*\{/m);
const appVar = (block, name) => {
  const m = block.match(new RegExp(`--ll-${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!m) throw new Error(`app.css is missing --ll-${name}`);
  return m[1];
};
const A = (name) => appVar(appLightCss, name);
const AD = (name) => appVar(appDarkCss, name);

// [label, fg, bg, minimum, required?]  4.5 = body text, 3 = large text / UI components
const pairs = [
  ["light text-primary on bg", L.textPrimary, L.bg, 4.5, true],
  ["light text-primary on bg-raised", L.textPrimary, L.bgRaised, 4.5, true],
  ["light text-secondary on bg", L.textSecondary, L.bg, 4.5, true],
  ["light text-secondary on bg-sunken", L.textSecondary, L.bgSunken, 4.5, true],
  ["light label (sageText, 11px) on bg", L.label, L.bg, 4.5, true],
  ["light label (sageText, 11px) on bg-raised", L.label, L.bgRaised, 4.5, true],
  ["goldText on cream", colors.goldText, colors.cream, 4.5, true],
  ["warningText on warningBg", colors.warningText, colors.warningBg, 4.5, true],
  ["success on cream", colors.success, colors.cream, 4.5, true],
  ["success on successBg", colors.success, colors.successBg, 4.5, true],
  ["danger on cream", colors.danger, colors.cream, 4.5, true],
  ["danger on dangerBg", colors.danger, colors.dangerBg, 4.5, true],
  ["info on cream", colors.info, colors.cream, 4.5, true],
  ["info on infoBg", colors.info, colors.infoBg, 4.5, true],
  ["primary button: cream on navy", colors.cream, colors.navy, 4.5, true],
  ["focus ring: navy on cream", colors.navy, colors.cream, 3, true],
  ["input border: inkMuted on white", colors.inkMuted, L.bgRaised, 3, true],
  ["dark text-primary on bg", D.textPrimary, D.bg, 4.5, true],
  ["dark text-primary on bg-raised", D.textPrimary, D.bgRaised, 4.5, true],
  ["dark text-secondary on bg-raised", D.textSecondary, D.bgRaised, 4.5, true],
  ["dark label (gold) on bg-raised", D.label, D.bgRaised, 4.5, true],
  ["dark focus ring: gold on bg", colors.gold, D.bg, 3, true],
  ["dark input border: inkFaint on bg-raised", colors.inkFaint, D.bgRaised, 3, true],
  ["app label-text on bg", A("label-text"), L.bg, 4.5, true],
  ["app label-text on bg-sunken", A("label-text"), L.bgSunken, 4.5, true],
  ["app accent-text-sm on bg", A("accent-text-sm"), L.bg, 4.5, true],
  ["app warning-text on warningBg", A("warning-text"), colors.warningBg, 4.5, true],
  ["app control-border on bg", A("control-border"), L.bg, 3, true],
  ["app focus on bg", A("focus"), L.bg, 3, true],
  ["app positive on bg-raised", A("positive"), L.bgRaised, 4.5, true],
  ["app negative on bg-raised", A("negative"), L.bgRaised, 4.5, true],
  ["app dark label-text on bg-raised", AD("label-text"), D.bgRaised, 4.5, true],
  ["app dark control-border on bg-raised", AD("control-border"), D.bgRaised, 3, true],
  ["app dark focus on bg-raised", AD("focus"), D.bgRaised, 3, true],
  ["app dark positive on bg-raised", AD("positive"), D.bgRaised, 4.5, true],
  ["app dark negative on bg-raised", AD("negative"), D.bgRaised, 4.5, true],
  // Restricted: allowed only where the design system says so (large text, icons, decoration)
  ["light accent-text (goldDeep) on bg", L.accentText, L.bg, 4.5, false],
  ["warning on cream", colors.warning, colors.cream, 4.5, false],
  ["warning on warningBg", colors.warning, colors.warningBg, 4.5, false],
  ["light text-tertiary on bg", L.textTertiary, L.bg, 4.5, false],
  ["dark text-tertiary on bg-raised", D.textTertiary, D.bgRaised, 4.5, false],
];

console.log("\nContrast (WCAG 2.2)");
for (const [label, fg, bg, min, required] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  const mark = ok ? "✓" : required ? "✗" : "!";
  console.log(`${mark} ${r.toFixed(2).padStart(5)}:1  (needs ${min})  ${label}${!ok && !required ? "  → restricted use, see docs/l3/design-system.md" : ""}`);
  if (!ok && required) failures++;
}

if (failures) {
  console.error(`\n${failures} required check(s) failed`);
  process.exit(1);
}
console.log("\nAll required checks passed. '!' rows are restricted-use colours.");
