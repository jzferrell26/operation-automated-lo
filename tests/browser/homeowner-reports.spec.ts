import { expect, test, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

test.beforeEach(({ page }, info) => {
  test.skip(info.project.name !== "dashboard-preview", "Requires the explicit sample workspace");
  expect(page.isClosed()).toBe(false);
});
async function open(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function create(page: Page, known = true) {
  await open(page, "/homeowners/new");
  await page.getByRole("button", { name: "Use fictional sample property" }).click();
  await page
    .getByLabel("I have confirmed this property belongs with the selected homeowner contact.")
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  if (known) {
    await choose(page, "Mortgage information source", "I have current loan balances");
    await page.getByLabel("Current first mortgage balance").fill("325000");
    await page.getByLabel("Other secured loan balances").fill("20000");
    await page
      .getByLabel(
        "I have included every mortgage, HELOC and other secured loan. Unknown balances stay blank.",
      )
      .check();
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create report", exact: true }).click();
  await expect(page).toHaveURL(/\/homeowners\/home_[a-f0-9]{32}$/u);
  await expect(page.getByRole("heading", { name: "Your equity picture" })).toBeVisible();
}

test("creates a report, preserves history, revises balances without changing valuation and downloads its PDF", async ({
  page,
  browser,
}, info) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await create(page);
  const report = page.locator("[data-home-report]");
  await expect(report.getByText("$140,000", { exact: true })).toBeVisible();
  await expect(report.getByText("Fictional sample report", { exact: true })).toBeVisible();
  const url = page.url();
  await page.reload();
  await expect(report.getByText("$140,000", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Update loan details", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Current first mortgage balance").fill("300000");
  await page.getByRole("button", { name: "Save updated report", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(report.getByText("$165,000", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Report history" }).click();
  await expect(page.getByRole("option")).toHaveCount(2);
  await page.getByRole("option").last().click();
  await expect(report.getByText("$140,000", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^homeowner-report-.+\.pdf$/u);
  const path = info.outputPath("homeowner-sample.pdf");
  await download.saveAs(path);
  const pdf = await readFile(path);
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  expect(pdf.length).toBeGreaterThan(3000);
  await page.screenshot({ path: info.outputPath("homeowner-report-desktop.png"), fullPage: true });
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: info.outputPath("homeowner-report-print.png"), fullPage: true });
  await page.emulateMedia({ media: "screen" });
  const other = await browser.newContext();
  try {
    const isolated = await other.newPage();
    await isolated.goto(url);
    await expect(
      isolated.getByRole("heading", { name: "This property report is not available." }),
    ).toBeVisible();
  } finally {
    await other.close();
  }
  expect(failures).toEqual([]);
});

test("unknown debt remains unavailable, sample schedules are honest, and removal clears the property", async ({
  page,
}) => {
  await create(page, false);
  const equity = page.getByRole("heading", { name: "Your equity picture" }).locator("xpath=../..");
  await expect(equity.getByText("Unavailable", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Share report", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hand off to HighLevel" })).toBeDisabled();
  await page.getByRole("button", { name: "Update schedule", exact: true }).click();
  await choose(page, "Update frequency", "Monthly valuation refresh");
  await page.getByRole("button", { name: "Save update preferences" }).click();
  await expect(
    page.getByText(
      "Demo update preference saved. No automatic lookups or delivery are scheduled.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Monthly updates", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove property", exact: true }).click();
  await page.getByLabel("I confirm removal of this property's reports.").check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove property", exact: true })
    .click();
  await expect(page).toHaveURL(/\/homeowners$/u);
  await expect(
    page.getByText("Your first homeowner report starts here", { exact: true }),
  ).toBeVisible();
});

test("canceled schedule edits and report validation preserve the saved report", async ({
  page,
}, info) => {
  await create(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("button", { name: "Update schedule", exact: true }).click();
  await choose(page, "Update frequency", "Monthly valuation refresh");
  await page.getByLabel("Pause scheduled updates").check();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Update schedule", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Update frequency" })).toContainText(
    "On demand only",
  );
  await expect(page.getByLabel("Pause scheduled updates")).not.toBeChecked();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Update loan details", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Update mortgage details" });
  await dialog.getByLabel("Current first mortgage balance").fill("invalid");
  await dialog.getByRole("button", { name: "Save updated report" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Check the mortgage details and branding fields before saving.",
  );
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("report-error-mobile.png"), fullPage: true });
  await dialog.getByLabel("Current first mortgage balance").fill("300000");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Save updated report" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.locator("[data-home-report]").getByText("$165,000", { exact: true }),
  ).toBeVisible();
});

test("failed storage never creates a saved report and live endpoints remain closed in demo", async ({
  page,
  request,
}) => {
  await open(page, "/homeowners/new");
  await page.getByRole("button", { name: "Use fictional sample property" }).click();
  await page
    .getByLabel("I have confirmed this property belongs with the selected homeowner contact.")
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Unavailable storage", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Create report", exact: true }).click();
  await expect(page).toHaveURL(/\/homeowners\/new$/u);
  await expect(
    page
      .getByText("The report was not saved. Check browser storage and try again.", { exact: true })
      .first(),
  ).toBeVisible();
  expect((await request.get("/api/homeowner-reports")).status()).toBe(401);
  expect(
    (await request.post("/api/homeowner-reports/contacts", { data: { query: "Morgan" } })).status(),
  ).toBe(401);
  expect((await request.get("/api/jobs/homeowner-reports")).status()).toBe(401);
  expect((await request.get(`/api/homeowner-reports/shared/${"a".repeat(64)}`)).status()).toBe(404);
});

test("report creation and reading fit mobile and both themes with no accessibility violations", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await create(page);
  const propertyPath = new URL(page.url()).pathname;
  for (const theme of ["Light", "Dark"] as const) {
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    await page.keyboard.press("Escape");
    for (const route of ["/homeowners", "/homeowners/new", propertyPath]) {
      await open(page, route);
      await page.setViewportSize({ width: 1440, height: 1000 });
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, failure: n.failureSummary })),
        })),
        `${theme} ${route}`,
      ).toEqual([]);
      for (const width of [1180, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${width} ${route}`,
        ).toBe(true);
      }
      await page.screenshot({
        path: info.outputPath(
          `${theme}-${route.includes("home_") ? "report" : route.endsWith("new") ? "builder" : "list"}-mobile.png`,
        ),
        fullPage: true,
      });
    }
  }
});
