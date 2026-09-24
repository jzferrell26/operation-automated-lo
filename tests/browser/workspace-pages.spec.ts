import { readFile } from "node:fs/promises";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  initialPreviewState,
  PREVIEW_STORAGE_KEY,
  type PreviewState,
} from "../../apps/web/src/features/dashboard-preview/model.js";

test.beforeEach(({ page }, info) => {
  test.skip(
    info.project.name !== "dashboard-preview",
    "Requires the explicitly enabled dashboard preview",
  );
  expect(page.isClosed()).toBe(false);
});

async function open(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
}

async function select(page: Page, name: string, value: string) {
  await page.getByRole("combobox", { name, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}

async function seed(page: Page, state: PreviewState) {
  await open(page, "/overview");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: PREVIEW_STORAGE_KEY,
    value: state,
  });
}

test("message drafts save by channel, preserve edits on cancel, and report clipboard failure", async ({
  page,
}) => {
  await open(page, "/marketing/messaging");
  await page.getByLabel("Email subject").fill("Our next open house");
  await page.getByLabel("Email message").fill("A saved invitation for the open house.");
  await page.getByRole("button", { name: "SMS", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Email message")).toHaveValue(
    "A saved invitation for the open house.",
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved on this device.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Email subject")).toHaveValue("Our next open house");
  await expect(page.getByLabel("Email message")).toHaveValue(
    "A saved invitation for the open house.",
  );
  await page.getByRole("button", { name: "SMS", exact: true }).click();
  await page.getByLabel("SMS message").fill("A separate SMS draft.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("button", { name: "Email", exact: true }).click();
  await expect(page.getByLabel("Email message")).toHaveValue(
    "A saved invitation for the open house.",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("Permission denied")) },
    }),
  );
  await page.getByRole("button", { name: "Copy message", exact: true }).click();
  await expect(
    page.getByText(
      "Clipboard access is unavailable. Select the message text to copy it manually.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Message copied.", { exact: false })).toHaveCount(0);
});

test("failed draft persistence does not claim success", async ({ page }) => {
  await open(page, "/marketing/messaging");
  await page.getByLabel("Email message").fill("Draft that cannot be saved.");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage disabled", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("This change was not saved.", { exact: false })).toBeVisible();
  await expect(page.getByText("Draft saved on this device.", { exact: true })).toHaveCount(0);
});

test("reports export the chosen records and neutralize spreadsheet formulas", async ({ page }) => {
  const state = initialPreviewState();
  state.partners.push({
    id: "preview-partner-export",
    name: "=1+1",
    company: "Export QA Realty",
    email: "export@example.test",
  });
  state.campaigns.push({
    campaignRef: `campaign_${"a".repeat(32)}`,
    campaignVersionRef: "version-1",
    detailHref: `/marketing/campaigns/campaign_${"a".repeat(32)}`,
    manifestHash: "manifest",
    preflightResultHash: "preflight",
    state: "approved",
    blocking: false,
    headline: "Export QA campaign",
    propertyAddress: "214 Cedar Street",
    realtorDisplayName: "Jordan Avery",
    dailyBudgetMinor: 1500,
    totalBudgetMinor: 7500,
    specialAdCategory: "HOUSING",
    persistenceKind: "browser",
    providerPublicationAuthorized: false,
    createdAt: "2026-09-23T12:00:00.000Z",
    findings: [],
  });
  await seed(page, state);
  await open(page, "/reports");
  for (const view of ["Pipeline", "Campaigns", "Partners"] as const) {
    await page
      .getByRole("group", { name: "Report view" })
      .getByRole("button", { name: view, exact: true })
      .click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download report" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`automatedlo-demo-${view.toLowerCase()}.csv`);
    const path = await download.path();
    if (!path) throw new Error("The selected report was not downloaded");
    const csv = await readFile(path, "utf8");
    if (view === "Campaigns") {
      expect(csv).toContain("Export QA campaign");
      expect(csv).not.toContain("Morgan Ellis");
    }
    if (view === "Pipeline") {
      expect(csv).toContain("Morgan Ellis");
      expect(csv).not.toContain("Export QA campaign");
    }
    if (view === "Partners") {
      expect(csv).toContain('"\'=1+1"');
      expect(csv).toContain("Export QA Realty");
    }
  }
  await open(page, "/marketing/ads");
  await expect(page.getByRole("link", { name: /Export QA campaign/u })).toBeVisible();
  await select(page, "Ad campaign status", "Needs changes");
  await expect(page.getByText("No campaigns match these filters", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("link", { name: /Export QA campaign/u }).click();
  await expect(
    page.getByRole("heading", { name: "Export QA campaign", exact: true }),
  ).toBeVisible();
});

test("handoff preview uses saved routing without moving the sample lead", async ({ page }) => {
  const state = initialPreviewState();
  state.routing = { stage: "Contacted", owner: "Unassigned" };
  await seed(page, state);
  await open(page, "/automations");
  await select(page, "Sample lead", "Jamie Parker");
  await page.getByRole("button", { name: "Preview handoff" }).click();
  const result = page.getByRole("status").filter({ hasText: "Simulation complete" });
  await expect(result).toContainText("Jamie Parker");
  await expect(result).toContainText("Starting stage: Contacted");
  await expect(result).toContainText("Assigned owner: Unassigned");
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    PREVIEW_STORAGE_KEY,
  );
  expect(stored.leadStages).toEqual({});
});

test("creative filters, asset preview, template details and lead filters work", async ({
  page,
}) => {
  await open(page, "/marketing/creative");
  const creativeSize = await page
    .getByRole("img", { name: "Feed creative for the Cedar Street example campaign", exact: true })
    .boundingBox();
  expect(creativeSize?.height).toBeGreaterThan(180);
  expect(creativeSize?.width).toBeGreaterThan(180);
  await select(page, "Creative format", "Story");
  await expect(page.getByRole("heading", { name: "Feed creative", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Preview story creative", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Story creative", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Story creative full preview" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Search creative").fill("No matching property");
  await expect(page.getByText("No creative matches your filters", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("heading", { name: "Feed creative", exact: true })).toBeVisible();
  await open(page, "/marketing/blueprints");
  await page
    .getByRole("group", { name: "Template package" })
    .getByRole("button", { name: "Social creative" })
    .click();
  await expect(page.getByRole("link", { name: "Explore creative", exact: true })).toHaveAttribute(
    "href",
    "/marketing/creative",
  );
  await open(page, "/leads");
  await select(page, "Filter by source", "Partner referral");
  await expect(page.getByRole("button", { name: "Morgan Ellis", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Jamie Parker", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("button", { name: "Morgan Ellis", exact: true })).toBeVisible();
});

test("completed pages fit supported widths and meet accessibility checks in both themes", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const routes = [
    "/marketing/ads",
    "/marketing/messaging",
    "/automations",
    "/marketing/blueprints",
    "/marketplace",
    "/marketing/creative",
    "/marketing/property-sites",
    "/leads",
    "/reports",
  ];
  for (const theme of ["Light", "Dark"] as const) {
    await open(page, "/overview");
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    await page.keyboard.press("Escape");
    for (const route of routes) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await open(page, route);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => ({
            target: node.target,
            failure: node.failureSummary,
          })),
        })),
        `${theme} ${route}`,
      ).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`${theme.toLowerCase()}-${route.replaceAll("/", "-")}-desktop.png`),
        fullPage: true,
      });
      for (const width of [1180, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${theme} ${width} ${route}`,
        ).toBe(true);
        const clippedTabs = await page
          .getByRole("navigation", { name: "Marketing sections", exact: true })
          .getByRole("link")
          .evaluateAll((links) =>
            links
              .filter((link) => link.scrollWidth > link.clientWidth + 1)
              .map((link) => link.textContent),
          );
        expect(clippedTabs, `${theme} ${width} ${route} marketing tab labels`).toEqual([]);
      }
      await page.screenshot({
        path: info.outputPath(`${theme.toLowerCase()}-${route.replaceAll("/", "-")}-mobile.png`),
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
});
