import { expect, test, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const routes = [
  "/overview",
  "/marketing",
  "/marketing/campaigns",
  "/marketing/campaigns/new",
  "/marketing/property-sites",
  "/marketing/creative",
  "/marketing/ads",
  "/marketing/messaging",
  "/marketing/blueprints",
  "/partners",
  "/leads",
  "/leads/pipeline",
  "/brand",
  "/reports",
  "/onboarding",
  "/settings",
  "/settings/connections",
  "/settings/routing",
  "/settings/account",
  "/settings/team",
  "/settings/billing",
  "/automations",
  "/marketplace",
];
test.beforeEach(async ({ baseURL }, info) => {
  test.skip(
    info.project.name !== "dashboard-preview",
    "Requires the explicitly enabled preview runtime",
  );
  expect(baseURL).toBeDefined();
});

async function open(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response?.status(), path).toBe(200);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
}
async function createCampaign(page: Page, headline: string) {
  await open(page, "/marketing/campaigns/new");
  await page.getByRole("button", { name: "Use example property" }).click();
  await page.getByLabel("Headline", { exact: true }).fill(headline);
  const response = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/preview/campaigns/check") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save & review campaign" }).click();
  expect((await response).status()).toBe(200);
  await page.getByRole("link", { name: "Open campaign", exact: true }).click();
  await expect(page.getByRole("heading", { name: headline, exact: true })).toBeVisible();
}

async function chooseOption(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("all dashboard routes, assets, and entry links work", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveURL(/\/overview$/u);
  for (const route of routes) {
    await open(page, route);
    await expect(page.getByRole("button", { name: "Demo workspace", exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${route} does not overflow`,
    ).toBe(true);
  }
  for (const route of [
    "/public/synthetic-open-house-v3",
    "/marketing/campaigns/synthetic-open-house-001",
    "/synthetic-assets/open-house-feed-v3.svg",
    "/synthetic-assets/open-house-story-v3.svg",
  ])
    expect((await request.get(route)).status(), route).toBe(200);
  // Next's streamed notFound response can carry HTTP 200 after headers flush.
  // Verify the actual not-found UI and noindex boundary instead of a soft fallback.
  await page.goto("/this-page-does-not-exist");
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  expect(errors).toEqual([]);
});

test("campaign checks, test approval, reload, and browser isolation", async ({ page, browser }) => {
  await createCampaign(page, "Dashboard QA open house");
  await expect(page.getByRole("button", { name: "Publish campaign", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Approve campaign", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approval recorded" })).toBeDisabled();
  const campaignURL = page.url();
  await page.reload();
  await expect(page.getByRole("button", { name: "Approval recorded" })).toBeVisible();
  await open(page, "/marketing/campaigns");
  await page.getByLabel("Search campaigns").fill("Dashboard QA");
  await expect(page.getByRole("cell", { name: /^Dashboard QA open house/u })).toBeVisible();
  const other = await browser.newContext();
  try {
    const isolated = await other.newPage();
    await isolated.goto(campaignURL);
    await expect(
      isolated.getByRole("heading", { name: "We couldn't find this campaign." }),
    ).toBeVisible();
  } finally {
    await other.close();
  }
  await createCampaign(page, "Guaranteed approval");
  await expect(page.getByRole("button", { name: "Approve campaign", exact: true })).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "A few details need your attention." }),
  ).toBeVisible();
});

test("partners, pipeline, brand, routing, and reset persist accurately", async ({ page }) => {
  await open(page, "/partners");
  await page.getByRole("button", { name: "Add partner" }).click();
  await page.getByLabel("Partner name").fill("Preview QA Partner");
  await page.getByLabel("Brokerage").fill("Fictional Test Realty");
  await page.getByLabel("Email address", { exact: true }).fill("preview@example.test");
  await page.getByRole("button", { name: "Save partner" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Preview QA Partner" })).toBeVisible();
  await open(page, "/leads/pipeline");
  await chooseOption(page, "Stage for Morgan Ellis", "Application");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Stage for Morgan Ellis", exact: true }),
  ).toHaveText("Application");
  await open(page, "/reports");
  await expect(page.getByRole("img", { name: /Pipeline:.*2 application/u })).toBeVisible();
  await open(page, "/brand");
  await page.getByLabel("Company name").fill("Preview QA Lending");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(page.getByLabel("Company name")).toHaveValue("Preview QA Lending");
  await open(page, "/settings/routing");
  await chooseOption(page, "Starting stage", "Contacted");
  await page.getByRole("button", { name: "Save routing" }).click();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Starting stage" })).toHaveText("Contacted");
  await open(page, "/settings");
  await page.getByText("Demo workspace options", { exact: true }).click();
  await page.getByRole("button", { name: "Reset demo data", exact: true }).click();
  await page.getByRole("button", { name: "Keep my changes" }).click();
  await page.getByRole("button", { name: "Reset demo data", exact: true }).click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(page.getByLabel("Company name")).toHaveValue("Prairie Home Lending");
  await open(page, "/partners");
  await expect(page.getByRole("heading", { name: "Preview QA Partner" })).toHaveCount(0);
  await open(page, "/brand");
  await expect(page.getByLabel("Company name")).toHaveValue("Prairie Home Lending");
});

test("storage failure never displays a saved result", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage disabled", "QuotaExceededError");
    };
  });
  await open(page, "/marketing/campaigns/new");
  await page.getByRole("button", { name: "Use example property" }).click();
  await page.getByRole("button", { name: "Save & review campaign" }).click();
  await expect(
    page.getByText(
      "This draft was not saved. Check browser storage or reset the preview in Settings, then try again.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open campaign", exact: true })).toHaveCount(0);
});

test("desktop, embedded, tablet, mobile, themes, and accessibility", async ({ page }, info) => {
  for (const width of [1440, 1180, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/overview",
      "/settings",
      "/leads/pipeline",
      "/marketing/campaigns/new",
      "/reports",
    ]) {
      await open(page, route);
      const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (documentWidth > width) {
        console.log(
          "Layout overflow",
          width,
          route,
          await page.evaluate(() =>
            Array.from(document.querySelectorAll("body *"))
              .map((node) => ({
                tag: node.tagName,
                class: node.className,
                right: node.getBoundingClientRect().right,
                width: node.getBoundingClientRect().width,
                overflow: getComputedStyle(node).overflowX,
              }))
              .filter((node) => node.right > innerWidth + 1 && node.width > 0)
              .slice(0, 25),
          ),
        );
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${width} ${route}`,
      ).toBe(true);
    }
  }
  await open(page, "/overview");
  await page.screenshot({
    path: info.outputPath("overview-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  const menu = page.getByRole("button", {
    name: /Open navigation|Open menu|Open workspace navigation/u,
  });
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, "/overview");
  await page.screenshot({
    path: info.outputPath("overview-desktop-light.png"),
    fullPage: true,
    animations: "disabled",
  });
  const light = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(light.violations).toEqual([]);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: info.outputPath("overview-desktop-dark.png"),
    fullPage: true,
    animations: "disabled",
  });
  const dark = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(dark.violations).toEqual([]);
});

test("workspace search, partner editing, campaign views, and report downloads work", async ({
  page,
}) => {
  await open(page, "/overview");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "Search your workspace" })).toBeVisible();
  await page.getByLabel("Search pages and campaigns").fill("zzzz no match");
  await expect(page.getByText("No results. Try a page name or property address.")).toBeVisible();
  await page.getByLabel("Search pages and campaigns").fill("partners");
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /Partners/u })
    .click();
  await expect(page).toHaveURL(/\/partners$/u);
  await page.getByRole("button", { name: "Edit Jordan Avery", exact: true }).click();
  await page.getByLabel("Brokerage").fill("Updated Demo Realty");
  await page.getByRole("button", { name: "Save partner", exact: true }).click();
  await page.reload();
  await expect(page.getByText("Updated Demo Realty", { exact: true })).toBeVisible();
  await open(page, "/settings");
  await page.getByLabel("Company name").fill("Instant Brand Preview");
  await expect(
    page.getByRole("heading", { name: "Instant Brand Preview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(page.getByLabel("Company name")).toHaveValue("Instant Brand Preview");
  await open(page, "/marketing/campaigns");
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cedar Street Open House Boost" })).toBeVisible();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await open(page, "/reports");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("automatedlo-demo-pipeline.csv");
  expect(await download.failure()).toBeNull();
  await page.getByRole("button", { name: "Campaigns", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Campaign performance" })).toBeVisible();
  await open(page, "/settings/connections");
  await page.getByRole("button", { name: "View setup" }).first().click();
  await expect(page.getByRole("dialog", { name: "HighLevel connection" })).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await open(page, "/marketing/campaigns/synthetic-open-house-001");
  await page.getByRole("button", { name: "Creative & assets", exact: true }).click();
  await expect(page.getByRole("img", { name: "Feed creative for Cedar Street" })).toBeVisible();
  await page.getByRole("button", { name: "Leads", exact: true }).click();
  await expect(page.getByText("Morgan Ellis", { exact: true })).toBeVisible();
});

test("redesigned screens and interactive states remain accessible in both themes", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  for (const theme of ["Light", "Dark"] as const) {
    await open(page, "/overview");
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    await page.keyboard.press("Escape");
    for (const route of [
      "/overview",
      "/settings",
      "/partners",
      "/reports",
      "/marketing/campaigns/new",
      "/settings/connections",
    ]) {
      await open(page, route);
      const issues = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        issues.violations.map((issue) => ({
          id: issue.id,
          nodes: issue.nodes.map((node) => ({
            target: node.target,
            failureSummary: node.failureSummary,
          })),
        })),
        `${theme} ${route}`,
      ).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`${theme.toLowerCase()}${route.replaceAll("/", "-")}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    await open(page, "/settings");
    await page.getByRole("button", { name: "Save changes" }).hover();
    const hover = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
    expect(hover.violations).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "/settings");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`${theme.toLowerCase()}-settings-mobile.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const drawer = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      drawer.violations.map((issue) => ({
        id: issue.id,
        targets: issue.nodes.map((node) => node.target),
      })),
      `${theme} mobile drawer`,
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
});
