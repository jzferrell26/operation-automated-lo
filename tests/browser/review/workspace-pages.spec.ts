import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import {
  guardLocalOrigin,
  expectNoExternalRequests,
  freshEmail,
} from "./helpers/guided-setup-journey.js";
import { putTheWalkthroughAside, chooseThemeFromTheHeader } from "./helpers/review-session.js";

let context: BrowserContext, page: Page;
let guard: Awaited<ReturnType<typeof guardLocalOrigin>>;
const faults: string[] = [];
const password = "cedar harbour lantern phrase";
const routes = [
  "/marketing",
  "/marketing/property-sites",
  "/marketing/creative",
  "/marketing/ads",
  "/marketing/messaging",
  "/marketing/blueprints",
  "/partners",
  "/leads",
  "/leads/pipeline",
  "/automations",
  "/marketplace",
  "/settings",
  "/settings/profile",
  "/settings/routing",
  "/settings/team",
  "/settings/billing",
];
async function open(path: string) {
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response?.status(), path).toBe(200);
  await expect(page.locator("[data-authenticated-workspace-page]")).toBeVisible();
}
async function select(label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function saved(button: string) {
  const response = page.waitForResponse(
    (result) =>
      result.url().endsWith("/api/workspace/preferences") && result.request().method() === "POST",
  );
  await page.getByRole("button", { name: button, exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByText("Your changes are saved.", { exact: true })).toBeVisible();
}

test.describe.serial("signed-in workspace pages", () => {
  test.describe.configure({ timeout: 60000 });
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60000);
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    guard = await guardLocalOrigin(page);
    page.on("pageerror", (error) => faults.push(error.message));
    await page.goto("/sign-up");
    await page.getByLabel("Your name", { exact: true }).fill("Workspace Example");
    await page.getByLabel("Email", { exact: true }).fill(freshEmail());
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Company", { exact: false }).fill("Workspace Example Lending");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.waitForURL("**/overview");
    await putTheWalkthroughAside(page);
  });
  test.afterAll(async () => {
    expectNoExternalRequests(guard);
    expect(faults).toEqual([]);
    await context?.close();
  });

  test("every known destination opens for the signed-in account and unknown destinations stay missing", async () => {
    test.setTimeout(120000);
    for (const path of routes) {
      await open(path);
      await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("main")).not.toContainText("Jordan Avery");
    }
    const missing = await page.goto("/settings/not-a-real-page");
    // Next.js may already have streamed the parent loading boundary with status
    // 200. The not-found document must still replace the page and forbid indexing.
    expect([200, 404]).toContain(missing?.status());
    await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
    await expect(page.locator("[data-authenticated-workspace-page]")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/u,
    );
    const anonymous = await context.browser()!.newContext({ ignoreHTTPSErrors: true });
    try {
      const visitor = await anonymous.newPage();
      await visitor.goto(new URL("/settings/profile", page.url()).href);
      await expect(visitor).toHaveURL(/\/sign-in$/u);
    } finally {
      await anonymous.close();
    }
  });
  test("report identity saves, survives reload and rejects an outdated tab without losing its draft", async () => {
    await open("/settings/profile");
    await page.getByLabel("Loan officer name", { exact: true }).fill("Casey Example");
    await page.getByLabel("Company name", { exact: true }).fill("Evergreen Example Lending");
    await page.getByLabel("Loan officer email", { exact: true }).fill("casey@example.test");
    await page.getByLabel("Loan officer NMLS", { exact: true }).fill("123456");
    await page.getByLabel("Brand tagline", { exact: true }).fill("A saved report identity.");
    await saved("Save report branding");
    await page.reload();
    await expect(page.getByLabel("Company name", { exact: true })).toHaveValue(
      "Evergreen Example Lending",
    );
    const otherTab = await context.newPage();
    try {
      await otherTab.goto(page.url(), { waitUntil: "networkidle" });
      await page.getByLabel("Brand tagline", { exact: true }).fill("Latest saved tagline.");
      await saved("Save report branding");
      await otherTab
        .getByLabel("Brand tagline", { exact: true })
        .fill("My unsaved older-tab edit.");
      const response = otherTab.waitForResponse(
        (result) =>
          result.url().endsWith("/api/workspace/preferences") &&
          result.request().method() === "POST",
      );
      await otherTab.getByRole("button", { name: "Save report branding", exact: true }).click();
      expect((await response).status()).toBe(409);
      await expect(otherTab.getByLabel("Brand tagline", { exact: true })).toHaveValue(
        "My unsaved older-tab edit.",
      );
      await expect(otherTab.getByRole("main").getByRole("alert")).toContainText(
        "Another tab saved newer changes",
      );
      await otherTab
        .getByRole("button", { name: "Load latest saved details", exact: true })
        .click();
      await expect(otherTab.getByLabel("Brand tagline", { exact: true })).toHaveValue(
        "Latest saved tagline.",
      );
    } finally {
      await otherTab.close();
    }
    if (process.env.OALO_HOMEOWNER_REPORTS === "enabled") {
      await page.goto("/homeowners/new", { waitUntil: "networkidle" });
      await expect(
        page.getByRole("heading", { name: "Create a homeowner report", exact: true }),
      ).toBeVisible();
      await page.getByLabel("Property street address", { exact: true }).fill("214 Cedar Street");
      await page.getByLabel("City", { exact: true }).fill("Dallas");
      await page.getByLabel("State", { exact: true }).fill("TX");
      await page.getByLabel("ZIP code", { exact: true }).fill("75201");
      await page
        .getByLabel("I have confirmed the property address and authorize this valuation lookup.", {
          exact: true,
        })
        .check();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(page.getByLabel("Company name", { exact: true })).toHaveValue(
        "Evergreen Example Lending",
      );
      await expect(page.getByLabel("Brand tagline", { exact: true })).toHaveValue(
        "Latest saved tagline.",
      );
      await expect(page.getByRole("button", { name: "Create report", exact: true })).toBeDisabled();
      await page.getByRole("button", { name: "Expand Marketing", exact: true }).click();
      await expect(
        page
          .getByRole("navigation", { name: "Product navigation" })
          .getByRole("link", { name: "Message drafts", exact: true }),
      ).toHaveAttribute("href", "/marketing/messaging");
      await expect(
        page
          .getByRole("navigation", { name: "Product navigation" })
          .getByRole("link", { name: "Workspace tools", exact: true }),
      ).toHaveAttribute("href", "/marketplace");
      await open("/settings/profile");
    }
  });
  test("partner edits persist and choosing a saved partner does not grant material permission", async () => {
    await open("/partners");
    await page.getByRole("button", { name: "Add Realtor partner", exact: true }).click();
    await page.getByLabel("Partner name", { exact: true }).fill("Avery Example");
    await page.getByLabel("Brokerage or company", { exact: true }).fill("Example Realty");
    await page.getByLabel("Partner email", { exact: true }).fill("avery@example.test");
    await saved("Save partner");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Avery Example", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit Avery Example", exact: true }).click();
    await page.getByLabel("Brokerage or company", { exact: true }).fill("Updated Example Realty");
    await saved("Save partner");
    await page.goto("/marketing/campaigns/new", { waitUntil: "networkidle" });
    await page
      .getByLabel("I have permission to use the Realtor's materials.", { exact: true })
      .check();
    await select("Saved Realtor partner", "Avery Example Updated Example Realty");
    await expect(page.getByLabel("Realtor name", { exact: true })).toHaveValue("Avery Example");
    await expect(
      page.getByLabel("I have permission to use the Realtor's materials.", { exact: true }),
    ).not.toBeChecked();
    await open("/partners");
    await expect(page.getByText("Updated Example Realty", { exact: true })).toBeVisible();
  });
  test("email and SMS drafts persist independently and unsaved edits require a choice before switching", async () => {
    await open("/marketing/messaging");
    await page.getByLabel("Email subject", { exact: true }).fill("Saved invitation");
    await page.getByLabel("Message text", { exact: true }).fill("My saved email invitation.");
    await saved("Save message draft");
    await select("Message draft", "Open house invitation · SMS");
    await page.getByLabel("Message text", { exact: true }).fill("My saved SMS invitation.");
    await saved("Save message draft");
    await page.getByLabel("Message text", { exact: true }).fill("Unsaved SMS changes.");
    await select("Message draft", "Buyer follow-up · Email");
    await expect(
      page.getByRole("dialog", { name: "Discard unsaved draft changes?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Keep editing", exact: true }).click();
    await expect(page.getByLabel("Message text", { exact: true })).toHaveValue(
      "Unsaved SMS changes.",
    );
    await select("Message draft", "Buyer follow-up · Email");
    await page.getByRole("button", { name: "Discard edits and switch", exact: true }).click();
    await select("Message draft", "Open house invitation · SMS");
    await expect(page.getByLabel("Message text", { exact: true })).toHaveValue(
      "My saved SMS invitation.",
    );
    await page.reload();
    await expect(page.getByLabel("Email subject", { exact: true })).toHaveValue("Saved invitation");
    await expect(page.getByLabel("Message text", { exact: true })).toHaveValue(
      "My saved email invitation.",
    );
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }),
    );
    await page.getByRole("button", { name: "Copy draft", exact: true }).click();
    await expect(
      page.getByText("Clipboard access is unavailable. Select the message text to copy it.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByLabel("Message text", { exact: true }).fill("A newly edited invitation.");
    await expect(page.getByText("Your changes are saved.", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("Clipboard access is unavailable. Select the message text to copy it.", {
        exact: true,
      }),
    ).toHaveCount(0);
  });
  test("a conflicting partner edit can reload the latest roster without discarding the open form", async () => {
    await open("/partners");
    const otherTab = await context.newPage();
    try {
      await otherTab.goto(page.url(), { waitUntil: "networkidle" });
      await otherTab.getByRole("button", { name: "Edit Avery Example", exact: true }).click();
      await otherTab.getByLabel("Partner phone", { exact: true }).fill("555-0175");
      await page.getByRole("button", { name: "Edit Avery Example", exact: true }).click();
      await page.getByLabel("Brokerage or company", { exact: true }).fill("Newer Saved Realty");
      await saved("Save partner");
      await otherTab.getByRole("button", { name: "Save partner", exact: true }).click();
      await expect(otherTab.getByRole("dialog").getByRole("alert")).toContainText(
        "Another tab saved newer changes",
      );
      await otherTab
        .getByRole("button", { name: "Load latest partner list and keep these edits", exact: true })
        .click();
      await expect(otherTab.getByLabel("Partner phone", { exact: true })).toHaveValue("555-0175");
      await expect(otherTab.getByRole("dialog").getByRole("alert")).toHaveCount(0);
      await otherTab.getByRole("button", { name: "Save partner", exact: true }).click();
      await expect(otherTab.getByRole("dialog")).toHaveCount(0);
      await otherTab.reload();
      await expect(otherTab.getByText("555-0175", { exact: false })).toBeVisible();
    } finally {
      await otherTab.close();
    }
  });
  test("a failed save preserves the typed text and does not display a saved confirmation", async () => {
    await open("/marketing/messaging");
    await page.route("**/api/workspace/preferences", async (route) => {
      if (route.request().method() === "POST")
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            message: "The save was not confirmed. Your edits are still here.",
          }),
        });
      else await route.continue();
    });
    try {
      await page
        .getByLabel("Message text", { exact: true })
        .fill("Keep my unsaved draft after failure.");
      await page.getByRole("button", { name: "Save message draft", exact: true }).click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "The save was not confirmed",
      );
      await expect(page.getByLabel("Message text", { exact: true })).toHaveValue(
        "Keep my unsaved draft after failure.",
      );
      await expect(page.getByText("Your changes are saved.", { exact: true })).toHaveCount(0);
    } finally {
      await page.unroute("**/api/workspace/preferences");
    }
  });
  test("new pages and editors are accessible in both themes without horizontal overflow", async ({
    browserName,
  }, info) => {
    expect(browserName).toBe("chromium");
    test.setTimeout(180000);
    for (const theme of ["light", "dark"] as const) {
      await open("/settings");
      await chooseThemeFromTheHeader(page, theme);
      for (const path of [
        "/marketing",
        "/settings",
        "/settings/profile",
        "/partners",
        "/marketing/messaging",
        "/marketing/creative",
        "/settings/routing",
        "/settings/team",
        "/settings/billing",
      ]) {
        await open(path);
        await page.setViewportSize({ width: 1440, height: 1000 });
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          results.violations.map((violation) => ({
            id: violation.id,
            nodes: violation.nodes.map((node) => ({
              target: node.target,
              failure: node.failureSummary,
            })),
          })),
          `${theme} ${path}`,
        ).toEqual([]);
        for (const width of [1180, 768, 390]) {
          await page.setViewportSize({ width, height: 900 });
          const overflow = await page.evaluate(() => {
            if (document.documentElement.scrollWidth <= innerWidth) return [];
            return [...document.querySelectorAll("main *")]
              .filter((element) => {
                const box = element.getBoundingClientRect();
                return box.width > 0 && box.right > innerWidth + 1;
              })
              .slice(0, 12)
              .map((element) => ({
                tag: element.tagName,
                className: element.className,
                right: element.getBoundingClientRect().right,
                width: element.getBoundingClientRect().width,
                minWidth: getComputedStyle(element).minWidth,
                text: element.textContent?.trim().slice(0, 90),
              }));
          });
          if (overflow.length)
            await page.screenshot({ path: info.outputPath("overflow.png"), fullPage: true });
          expect(overflow, `${theme} ${path} ${width}`).toEqual([]);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            `${theme} ${path} ${width} document bounds`,
          ).toBe(true);
        }
        if (["/settings/profile", "/marketing"].includes(path))
          await page.screenshot({
            path: info.outputPath(`${theme}-${path.replaceAll("/", "-")}-mobile.png`),
            fullPage: true,
          });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await open("/partners");
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await page.getByRole("button", { name: "Confirm removal", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Add your first Realtor partner", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Add your first Realtor partner", exact: true }),
    ).toBeVisible();
  });
});
