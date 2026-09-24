import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell (threat T8)", () => {
  it.each([
    ['=HYPERLINK("http://x")', '"\'=HYPERLINK(""http://x"")"'],
    ["+27 82 000 0000", "'+27 82 000 0000"],
    ["-R 250", "'-R 250"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\tcmd", "'\tcmd"],
    ["Groceries", "Groceries"],
  ])("escapes %j", (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });
  it("quotes commas, quotes and new lines", () => {
    expect(csvCell("Rent, water")).toBe('"Rent, water"');
    expect(csvCell('The "big" shop')).toBe('"The ""big"" shop"');
    expect(csvCell("line 1\nline 2")).toBe('"line 1\nline 2"');
  });
  it("writes numbers, booleans and blanks as they are", () => {
    expect(csvCell(-250)).toBe("-250");
    expect(csvCell(98000)).toBe("98000");
    expect(csvCell(true)).toBe("true");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("toCsv", () => {
  it("writes a header, rows in column order, a BOM and CRLF", () => {
    expect(toCsv(["name", "cents"], [{ cents: 100, name: "=x" }, { name: "Fuel" }])).toBe(
      "﻿name,cents\r\n'=x,100\r\nFuel,\r\n",
    );
  });
});
