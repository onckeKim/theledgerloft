/**
 * CSV for "Download all my data" (PRD US-43). RFC 4180 quoting, plus spreadsheet formula-injection protection
 * (threat T8): any text cell starting with = + - @, a tab or a carriage return gets a leading apostrophe so
 * spreadsheet apps show it as text instead of running it. Numbers are written as numbers.
 */
export type Cell = string | number | boolean | null | undefined;

const RISKY = /^[=+\-@\t\r]/;

export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  const text = RISKY.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns: string[], rows: Record<string, Cell>[]): string {
  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c])).join(","));
  // Byte order mark so Excel opens UTF-8 names (é, ’, R …) correctly; CRLF per RFC 4180.
  return `﻿${lines.join("\r\n")}\r\n`;
}
