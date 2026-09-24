import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import tokens from "../../../design/tokens/tokens.json";
import { formatPeriod } from "@/lib/calc/period";
import { CALC_SPEC_VERSION } from "@/lib/calc/version";
import { formatZAR } from "@/lib/money";
import { leftOverNote } from "@/lib/review/review";
import type { LoadedReview } from "@/lib/review/queries";

/**
 * Monthly summary PDF (PRD US-39): A4, planner style from the brand tokens (white page, navy rule, one gold
 * accent, sage labels). Built only from the LoadedReview passed in, which was read as the signed-in user.
 * Reflections appear only when asked for. Every page carries the short disclaimer and the calc spec version.
 */

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const C = {
  navy: hex(tokens.color.navy.$value),
  ink: hex(tokens.color.ink.$value),
  muted: hex(tokens.color.inkMuted.$value),
  sage: hex(tokens.color.sageText.$value),
  gold: hex(tokens.color.gold.$value),
  line: hex(tokens.color.line.$value),
  fill: hex(tokens.color.creamDeep.$value),
};

const A4: [number, number] = [595.28, 841.89];
const M = 48; // margin
const RIGHT = A4[0] - M;
const WIDTH = RIGHT - M;
const FOOTER = 60; // space kept for the footer

export const DISCLAIMER =
  "The Ledger Loft is a budgeting and planning tool. It does not provide financial, legal, tax or debt advice.";

let fontFiles: Promise<Buffer[]> | null = null;
const loadFonts = () =>
  (fontFiles ??= Promise.all(
    ["Inter-Regular.ttf", "Inter-SemiBold.ttf", "PlayfairDisplay-SemiBold.ttf"].map((f) =>
      readFile(path.join(process.cwd(), "src/lib/export/fonts", f)),
    ),
  ));

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

export async function reviewPdf(
  r: LoadedReview,
  { reflections, createdOn }: { reflections: boolean; createdOn: string },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regular, semibold, display] = await loadFonts();
  const body = await doc.embedFont(regular!, { subset: false });
  const bold = await doc.embedFont(semibold!, { subset: false });
  const serif = await doc.embedFont(display!, { subset: true });
  const month = formatPeriod(r.period);
  doc.setTitle(`Monthly review, ${month}`);
  doc.setAuthor("The Ledger Loft");
  doc.setCreator("The Ledger Loft");
  doc.setProducer("The Ledger Loft");
  doc.setLanguage("en-ZA");
  doc.setCreationDate(new Date());

  let page!: PDFPage;
  let y = 0;
  const text = (t: string, x: number, size: number, font = body, color = C.ink) =>
    page.drawText(t, { x, y, size, font, color });
  const right = (t: string, x: number, size: number, font = body, color = C.ink) =>
    page.drawText(t, { x: x - font.widthOfTextAtSize(t, size), y, size, font, color });
  const rule = (thickness = 0.75, color = C.line) =>
    page.drawLine({ start: { x: M, y }, end: { x: RIGHT, y }, thickness, color });

  const newPage = (first: boolean) => {
    page = doc.addPage(A4);
    y = A4[1] - M;
    if (first) {
      y -= 8;
      text("MONTHLY REVIEW", M, 8, bold, C.sage);
      right("The Ledger Loft", RIGHT, 11, serif, C.navy);
      y -= 28;
      text(month, M, 26, serif, C.navy);
      y -= 12;
      rule(2, C.navy);
      page.drawRectangle({ x: M, y: y - 12, width: 40, height: 3, color: C.gold });
      y -= 34;
    } else {
      y -= 8;
      text(`Monthly review, ${month} (continued)`, M, 9, bold, C.sage);
      y -= 12;
      rule(1, C.navy);
      y -= 22;
    }
  };
  const space = (h: number) => {
    if (y - h < M + FOOTER) newPage(false);
  };
  const heading = (t: string) => {
    space(52);
    y -= 20;
    text(t, M, 14, serif, C.navy);
    y -= 16;
  };
  const label = (t: string, x: number, alignRight = false) =>
    alignRight
      ? right(t.toUpperCase(), x, 7.5, bold, C.sage)
      : text(t.toUpperCase(), x, 7.5, bold, C.sage);

  newPage(true);

  // Summary
  const rv = r.review;
  const boxW = (WIDTH - 16) / 3;
  const summary: [string, number][] = [
    ["Income", rv.income.actual],
    ["Spent & set aside", rv.spent],
    ["Left over", rv.leftOver],
  ];
  summary.forEach(([k, v], i) => {
    const x = M + i * (boxW + 8);
    page.drawRectangle({
      x,
      y: y - 46,
      width: boxW,
      height: 52,
      borderColor: C.line,
      borderWidth: 0.75,
    });
    const top = y;
    y = top - 10;
    label(k, x + 10);
    y = top - 34;
    text(formatZAR(v), x + 10, 16, serif, C.navy);
    y = top;
  });
  y -= 64;
  const note = leftOverNote(rv.leftOver);
  if (note) {
    text(note, M, 9, body, C.muted);
    y -= 18;
  }

  // Plan vs actual
  heading("Plan vs actual");
  const col = { planned: M + WIDTH * 0.56, actual: M + WIDTH * 0.75, diff: RIGHT };
  label("Category", M);
  label("Planned", col.planned, true);
  label("Actual", col.actual, true);
  label("Difference", col.diff, true);
  y -= 8;
  rule();
  const row = (name: string, planned: string, actual: string, diff: string, strong = false) => {
    space(22);
    y -= 14;
    const f = strong ? bold : body;
    const nameLines = wrap(name, f, 9.5, WIDTH * 0.4);
    text(nameLines[0]!, M, 9.5, f);
    right(planned, col.planned, 9.5, f);
    right(actual, col.actual, 9.5, f);
    right(diff, col.diff, 9.5, f);
    for (const extra of nameLines.slice(1)) {
      y -= 12;
      text(extra, M, 9.5, f);
    }
    y -= 7;
    rule();
  };
  row("Income", formatZAR(rv.income.planned), formatZAR(rv.income.actual), rv.income.difference);
  for (const c of rv.rows) row(c.name, formatZAR(c.planned), formatZAR(c.actual), c.difference);
  row(
    "Total spending",
    formatZAR(rv.total.planned),
    formatZAR(rv.total.actual),
    rv.total.difference,
    true,
  );
  y -= 10;

  const list = (title: string, items: { name: string; cents: number }[], empty: string) => {
    heading(title);
    if (!items.length) {
      text(empty, M, 9.5, body, C.muted);
      y -= 14;
      return;
    }
    for (const i of items) {
      space(20);
      y -= 13;
      text(i.name, M, 9.5);
      right(formatZAR(i.cents), RIGHT, 9.5);
      y -= 6;
      rule();
    }
    y -= 6;
  };
  list(
    `Saved in ${formatPeriod(r.period).split(" ")[0]}`,
    rv.saved,
    "Nothing added to goals or funds.",
  );
  list("Debt payments", rv.debtPayments, "No debt payments recorded.");

  // Reflections, only when chosen
  const c = r.checkin;
  if (reflections && (c.wentWell || c.surprised || c.nextActions.length)) {
    heading("Your reflection");
    const para = (q: string, a: string) => {
      if (!a) return;
      space(30);
      y -= 12;
      text(q, M, 9.5, bold);
      for (const l of wrap(a, body, 9.5, WIDTH)) {
        space(16);
        y -= 13;
        text(l, M, 9.5);
      }
      y -= 8;
    };
    para("What went well this month?", c.wentWell);
    para("What surprised you?", c.surprised);
    if (c.nextActions.length) {
      space(30);
      y -= 12;
      text("Next month, I'd like to…", M, 9.5, bold);
      for (const a of c.nextActions) {
        const lines = wrap(a, body, 9.5, WIDTH - 18);
        space(14 * lines.length + 4);
        y -= 14;
        page.drawRectangle({
          x: M,
          y: y - 1,
          width: 8,
          height: 8,
          borderColor: C.navy,
          borderWidth: 0.75,
        });
        lines.forEach((l, i) => {
          if (i) y -= 12;
          text(l, M + 16, 9.5);
        });
      }
    }
  }

  // Footer on every page: disclaimer, spec version, date, page number
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    page = p;
    y = M + 26;
    rule();
    y = M + 12;
    text(DISCLAIMER, M, 7.5, body, C.muted);
    y = M;
    text(
      `Figures are as entered by you; projections are estimates. Calculation spec v${CALC_SPEC_VERSION}. Created ${createdOn}.`,
      M,
      7.5,
      body,
      C.muted,
    );
    right(`Page ${i + 1} of ${pages.length}`, RIGHT, 7.5, body, C.muted);
  });

  return doc.save();
}
