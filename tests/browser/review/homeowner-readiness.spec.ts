import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { buildHomeReport } from "../../../packages/application/src/homeowner-reports.js";
import type { HomeWorkspace } from "@oalo/contracts";
import {
  homeownerInput,
  homeownerValuation,
} from "../../../apps/web/src/server/homeowners/homeowner-fixtures.js";
import {
  guardLocalOrigin,
  expectNoExternalRequests,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";
import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  settleForScreenshot,
  warmFullPageCapture,
} from "../helpers/design-quality.js";
import { chooseThemeFromTheHeader } from "./helpers/review-session.js";
import { signInForReviewPreparation } from "./helpers/signin-session.js";

async function expectReadableMobileNotice(page: Page, title: string, width: number) {
  if (width !== 390) return;
  const copy = page.getByText(title, { exact: true }).locator("..");
  const notice = copy.locator("..");
  const action = page.getByRole("button", { name: "Check report availability", exact: true });
  const [copyBox, actionBox, contentWidth] = await Promise.all([
    copy.boundingBox(),
    action.boundingBox(),
    notice.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        element.getBoundingClientRect().width -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight) -
        parseFloat(style.borderLeftWidth) -
        parseFloat(style.borderRightWidth)
      );
    }),
  ]);
  expect(copyBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  if (!copyBox || !actionBox) throw new Error("The readiness notice is not rendered.");
  // Long copy gets the available column; a non-overflowing sliver beside the action is still wrong.
  expect(copyBox.width).toBeGreaterThanOrEqual(contentWidth - 1);
  expect(actionBox.y).toBeGreaterThanOrEqual(copyBox.y + copyBox.height);
  expect(Math.abs(actionBox.x - copyBox.x)).toBeLessThanOrEqual(1);
}

// A real signed-in shell with synthetic report API answers isolates presentation. PostgreSQL route
// tests verify the server projection; this spec never requests a valuation or makes a report write.
for (const frame of REVIEW_FRAMES) {
  const width = frame.width;
  test(`homeowner readiness keeps saved outputs usable at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: frame.height });
    const guard = await guardLocalOrigin(page);
    const evidenceDirectory = resolve("test-results/product-review-frames/homeowner-readiness");
    await mkdir(evidenceDirectory, { recursive: true });
    const { creatorEmail, password } = seededCredentials();
    await signInForReviewPreparation(page, creatorEmail, () =>
      signInExisting(page, creatorEmail, password),
    );
    const now = new Date();
    const report = buildHomeReport(
      {
        ...homeownerInput(now),
        association: "property_only",
        contactId: "property-only",
        contactName: "Property valuation",
      },
      homeownerValuation(now),
      `hreport_${"a".repeat(32)}`,
      `home_${"b".repeat(32)}`,
      now,
    );
    const property = {
      id: report.propertyId,
      contactId: report.input.contactId,
      contactName: report.input.contactName,
      address: report.input.address,
      createdAt: report.createdAt,
      updatedAt: report.createdAt,
      enrollment: {
        cadence: "off" as const,
        paused: false,
        deliverUpdates: false,
        nextRefreshAt: null,
      },
      reports: [report],
      reviewRequestedAt: null,
      lastError: null,
    };
    let workspace: HomeWorkspace = {
      mode: "live",
      canWrite: true,
      valuationConnected: true,
      ghlConnected: false,
      deliveryEnabled: false,
      monthlyLookupLimit: 0,
      lookupsThisMonth: 0,
      properties: [property],
      readiness: {
        storage: "ready",
        writeAccess: "allowed",
        valuation: "ready",
        freshLookup: "zero_allowance",
      },
    };
    let writes = 0;
    await page.route("**/api/homeowner-reports**", async (route) => {
      if (route.request().method() !== "GET") {
        writes++;
        await route.abort();
        return;
      }
      await route.fulfill({
        json: route.request().url().includes("/reports/") ? { delivery: null } : workspace,
      });
    });
    for (const theme of ["Light", "Dark"] as const) {
      await page.goto(`/homeowners/${property.id}`, { waitUntil: "networkidle" });
      await chooseThemeFromTheHeader(page, theme === "Light" ? "light" : "dark");
      await expect(page.getByText("New valuations need a lookup allowance")).toBeVisible();
      await expect(page.getByRole("button", { name: "Refresh value", exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Share report", exact: true })).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Update loan details", exact: true }),
      ).toBeEnabled();
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PDF", exact: true }).click();
      await expect((await download).suggestedFilename()).toMatch(/^homeowner-report-.+\.pdf$/u);
      await expectAxeClean(page);
      await expectNoHorizontalOverflow(page);
      await expectReadableMobileNotice(page, "New valuations need a lookup allowance", width);
      await settleForScreenshot(page);
      await warmFullPageCapture(page);
      await page.screenshot({
        path: join(evidenceDirectory, `readiness-${width}-${theme}.png`),
        fullPage: true,
      });
    }
    workspace = {
      ...workspace,
      valuationConnected: false,
      readiness: {
        ...workspace.readiness,
        valuation: "setup_unavailable",
        freshLookup: "setup_unavailable",
      },
    };
    await page.getByRole("button", { name: "Check report availability", exact: true }).click();
    await expect(page.getByText("Valuations are unavailable for your account")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PDF", exact: true })).toBeEnabled();
    await expect(page.locator('a[href="/settings/connections"]')).toHaveCount(0);
    await expectAxeClean(page);
    await expectNoHorizontalOverflow(page);
    await expectReadableMobileNotice(page, "Valuations are unavailable for your account", width);
    await settleForScreenshot(page);
    await warmFullPageCapture(page);
    await page.screenshot({
      path: join(evidenceDirectory, `setup-unavailable-${width}.png`),
      fullPage: true,
    });
    expect(writes).toBe(0);
    expectNoExternalRequests(guard);
  });
}
