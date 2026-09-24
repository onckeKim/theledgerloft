import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  completePrototypeSetup,
  createUser,
  expectAccessible,
  gotoWhenSettled,
  hasLocalStack,
  seedPreviousMonth,
  signIn,
  userClient,
} from "./helpers";

/** Monthly review, PDF summary and data export (PRD US-38, US-39, US-43) against a local Supabase stack. */
test.skip(!hasLocalStack, "needs a local Supabase stack");

const NB = " ";
const zar = (s: string) => s.replace(/ /g, NB);

async function pdfText(path: string) {
  const pdf = await getDocument({ data: new Uint8Array(readFileSync(path)) }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++)
    text += (await (await pdf.getPage(i)).getTextContent()).items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");
  return text.replace(/ /g, " ");
}

test("check in on last month and download the summary and my data", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const user = await createUser("review");
  const other = await createUser("review-other");
  try {
    await completePrototypeSetup(user.email);
    const period = await seedPreviousMonth(user.email);
    const month = new Intl.DateTimeFormat("en-ZA", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${period}-01T00:00:00Z`));
    await signIn(page, user.email);
    await page.waitForURL(/\/app$/);

    // The review index lists months with a plan
    await page.goto("/app/review");
    await expect(page.getByRole("link", { name: month })).toBeVisible();
    await page.getByRole("link", { name: month }).click();
    await page.waitForURL(`**/app/review/${period}`);

    // Plan vs actual in words (L4 B2 amounts)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(month);
    const table = page.getByRole("table");
    await expect(table.getByRole("row", { name: /Groceries/ })).toContainText(zar("R 90,00 under"));
    await expect(table.getByRole("row", { name: /Transport/ })).toContainText(zar("R 120,00 over"));
    await expect(table.getByRole("row", { name: /^Income/ })).toContainText(zar("R 640,00 more"));
    await expectAccessible(page);

    // Check-in: optional prompts, saved and editable
    await page.getByLabel("What went well this month?").fill("Meal planning on Sundays helped.");
    await page.getByLabel("Action 1").fill("Check the electricity reading mid-month");
    await page.getByRole("button", { name: "+ Add an action" }).click();
    await page.getByLabel("Action 2").fill("Decide where the money left over goes");
    await page.getByRole("button", { name: "Save check-in" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: `Your ${month} check-in is complete` }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Action 2")).toHaveValue("Decide where the money left over goes");

    // PDF without reflections, then with them (US-39 AC2, AC3)
    let download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    let file = await download;
    expect(file.suggestedFilename()).toBe(`ledger-loft-review-${period}.pdf`);
    let text = await pdfText((await file.path())!);
    expect(text).toContain(month);
    expect(text).toContain("R 90,00 under");
    expect(text).toContain("Calculation spec v1.0");
    expect(text).toContain("does not provide financial, legal, tax or debt advice");
    expect(text).not.toContain("Meal planning");
    await page.getByLabel(/Include my reflections/).check();
    download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    file = await download;
    text = await pdfText((await file.path())!);
    expect(text).toContain("Meal planning on Sundays helped.");

    // All my data (US-43): one CSV per entity, formula-looking text escaped
    await gotoWhenSettled(page, "/app/settings");
    await page.getByRole("link", { name: "Download or delete" }).click();
    await expectAccessible(page);
    download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download all my data" }).click();
    file = await download;
    expect(file.suggestedFilename()).toMatch(/^ledger-loft-data-\d{4}-\d{2}-\d{2}\.zip$/);
    const zip = unzipSync(new Uint8Array(readFileSync((await file.path())!)));
    expect(Object.keys(zip)).toEqual(
      expect.arrayContaining([
        "README.txt",
        "transactions.csv",
        "goals.csv",
        "debts.csv",
        "monthly_checkins.csv",
        "account_activity.csv",
      ]),
    );
    const tx = strFromU8(zip["transactions.csv"]!);
    expect(tx).toContain("'=1+1 groceries");
    expect(tx).not.toMatch(/(^|,)=1\+1/m);
    expect(strFromU8(zip["monthly_checkins.csv"]!)).toContain("Meal planning on Sundays helped.");
    expect(strFromU8(zip["account_activity.csv"]!)).toContain("export.created");

    // Links are for their own household only, and expire (US-39 AC4)
    const sb = await userClient(user.email);
    const { data: household } = await sb.from("households").select("id").single();
    const { data: expired } = await sb
      .from("exports")
      .insert({
        household_id: household!.id,
        kind: "csv_all",
        spec_version: "1.0",
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })
      .select("id")
      .single();
    expect((await page.request.get(`/api/exports/${expired!.id}`)).status()).toBe(410);
    const { data: fresh } = await sb
      .from("exports")
      .insert({
        household_id: household!.id,
        kind: "csv_all",
        spec_version: "1.0",
        expires_at: new Date(Date.now() + 600_000).toISOString(),
      })
      .select("id")
      .single();
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await signIn(otherPage, other.email);
    await otherPage.waitForURL(/\/app/);
    expect((await otherPage.request.get(`/api/exports/${fresh!.id}`)).status()).toBe(404);
    await otherContext.close();
    const signedOut = await browser.newContext();
    expect(
      (
        await signedOut.request.get(`${page.url().split("/app")[0]}/api/exports/${fresh!.id}`)
      ).status(),
    ).toBe(401);
    await signedOut.close();
  } finally {
    await user.remove();
    await other.remove();
  }
});
