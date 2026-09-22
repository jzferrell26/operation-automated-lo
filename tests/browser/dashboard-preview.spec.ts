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
  await page.getByRole("button", { name: "Fill with a sample property" }).click();
  await page.getByLabel("Headline", { exact: true }).fill(headline);
  const response = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/preview/campaigns/check") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save and run the checks" }).click();
  expect((await response).status()).toBe(200);
  await page.getByRole("link", { name: "Open campaign", exact: true }).click();
  await expect(page.getByRole("heading", { name: headline, exact: true })).toBeVisible();
}

test("all dashboard routes, assets, and entry links work", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveURL(/\/overview$/u);
  for (const route of routes) {
    await open(page, route);
    await expect(
      page.getByText("Product preview · Sample data · Test edits stay in this browser.", {
        exact: true,
      }),
    ).toBeVisible();
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
  await page.getByRole("button", { name: "Approve test campaign", exact: true }).click();
  await page.getByRole("button", { name: "Confirm test approval", exact: true }).click();
  await expect(page.getByRole("button", { name: "Test approval recorded" })).toBeDisabled();
  const campaignURL = page.url();
  await page.reload();
  await expect(page.getByRole("button", { name: "Test approval recorded" })).toBeVisible();
  await open(page, "/marketing/campaigns");
  await page.getByLabel("Search campaigns").fill("Dashboard QA");
  await expect(page.getByRole("cell", { name: /Dashboard QA open house/u })).toBeVisible();
  const other = await browser.newContext();
  try {
    const isolated = await other.newPage();
    await isolated.goto(campaignURL);
    await expect(
      isolated.getByRole("heading", { name: "This test campaign is not in this browser" }),
    ).toBeVisible();
  } finally {
    await other.close();
  }
  await createCampaign(page, "Guaranteed approval");
  await expect(
    page.getByRole("button", { name: "Approve test campaign", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Changes are needed before approval" }),
  ).toBeVisible();
});

test("partners, pipeline, brand, routing, and reset persist accurately", async ({ page }) => {
  await open(page, "/partners");
  await page.getByRole("button", { name: "Add a test partner" }).click();
  await page.getByLabel("Partner name").fill("Preview QA Partner");
  await page.getByLabel("Brokerage").fill("Fictional Test Realty");
  await page.getByLabel("Sample email", { exact: true }).fill("preview@example.test");
  await page.getByRole("button", { name: "Save test partner" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Preview QA Partner" })).toBeVisible();
  await open(page, "/leads/pipeline");
  await page.getByLabel("Stage for Morgan Ellis", { exact: true }).selectOption("Application");
  await page.reload();
  await expect(page.getByLabel("Stage for Morgan Ellis", { exact: true })).toHaveValue(
    "Application",
  );
  await open(page, "/reports");
  await expect(page.getByRole("progressbar", { name: "Application sample leads" })).toHaveAttribute(
    "value",
    "2",
  );
  await open(page, "/brand");
  await page.getByLabel("Company name").fill("Preview QA Lending");
  await page.getByRole("button", { name: "Save preview profile" }).click();
  await page.reload();
  await expect(page.getByLabel("Company name")).toHaveValue("Preview QA Lending");
  await open(page, "/settings/routing");
  await page.getByLabel("Starting stage").selectOption("Contacted");
  await page.getByRole("button", { name: "Save preview routing" }).click();
  await page.reload();
  await expect(page.getByLabel("Starting stage")).toHaveValue("Contacted");
  await open(page, "/settings");
  await page.getByRole("button", { name: "Reset preview data", exact: true }).click();
  await page.getByRole("button", { name: "Keep my test data" }).click();
  await page.getByRole("button", { name: "Reset preview data", exact: true }).click();
  await page.getByRole("button", { name: "Reset preview", exact: true }).click();
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
  await page.getByRole("button", { name: "Fill with a sample property" }).click();
  await page.getByRole("button", { name: "Save and run the checks" }).click();
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
    for (const route of ["/overview", "/leads/pipeline", "/marketing/campaigns/new", "/reports"]) {
      await open(page, route);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${width} ${route}`,
      ).toBe(true);
    }
  }
  await open(page, "/overview");
  await page.screenshot({ path: info.outputPath("overview-mobile.png"), fullPage: true });
  const menu = page.getByRole("button", {
    name: /Open navigation|Open menu|Open workspace navigation/u,
  });
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, "/overview");
  await page.screenshot({ path: info.outputPath("overview-desktop-light.png"), fullPage: true });
  const light = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(light.violations).toEqual([]);
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  await page.screenshot({ path: info.outputPath("overview-desktop-dark.png"), fullPage: true });
  const dark = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(dark.violations).toEqual([]);
});
