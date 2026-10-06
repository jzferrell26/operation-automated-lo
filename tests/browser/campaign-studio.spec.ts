import { expect, test } from "@playwright/test";

import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  expectTargetsAreLargeEnough,
  expectTypographyOnBrief,
  useStoredTheme,
} from "./helpers/design-quality.js";

/** UX-001 through UX-006. Real UI, no substituted page or mock save response. */
for (const theme of ["light", "dark"] as const) {
  for (const frame of REVIEW_FRAMES) {
    test(`campaign studio and local summary at ${frame.name} in ${theme}`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      const writes: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (
          request.method() === "POST" &&
          new URL(request.url()).pathname.startsWith("/api/campaigns")
        ) {
          writes.push(request.url());
        }
      });
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await useStoredTheme(page, theme);
      await page.goto("/overview");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "One property. One partner. A stronger first impression.",
      );
      await expect(page.locator("main [data-home-primary]")).toHaveCount(1);
      await expect(page.locator("main [data-home-primary]")).toHaveAttribute(
        "href",
        "/marketing/campaigns/property",
      );
      await expect(page.getByRole("link", { name: "Choose an ad", exact: true })).toBeVisible();
      await expectAxeClean(page);
      await expectTypographyOnBrief(page);
      await expectNoHorizontalOverflow(page);
      await expectTargetsAreLargeEnough(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath(`studio-${frame.name}-${theme}.png`),
        fullPage: true,
      });

      await page.getByRole("link", { name: "Create a property campaign", exact: true }).click();
      await expect(page).toHaveURL(/\/marketing\/campaigns\/property$/u);
      const summary = page.getByRole("complementary", { name: "Your campaign at a glance" });
      await expect(summary.getByText("Unsaved summary", { exact: true })).toBeVisible();
      await page.getByLabel("Property address", { exact: true }).fill("123 Example Street, Dallas");
      await page
        .getByLabel("Property description", { exact: true })
        .fill("A synthetic listing description used to verify the responsive campaign summary.");
      await page.getByRole("combobox", { name: "Realtor partner", exact: true }).click();
      await page
        .getByRole("option", { name: "Jordan Sample, Example Realty", exact: true })
        .click();
      await expect(summary.locator("[data-summary-address]")).toHaveText(
        "123 Example Street, Dallas",
      );
      await expect(summary.locator("[data-summary-partner]")).toHaveText(
        "Jordan Sample, Example Realty",
      );
      await expect(summary.getByText("Alex Morgan", { exact: true })).toBeVisible();
      expect(writes).toEqual([]);
      await expectAxeClean(page);
      await expectTypographyOnBrief(page);
      await expectNoHorizontalOverflow(page);
      await expectTargetsAreLargeEnough(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath(`composer-${frame.name}-${theme}.png`),
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });
  }
}

test("studio keyboard order follows the new primary action with reduced motion and 200-percent-equivalent reflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/overview");
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Create a property campaign", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "View your campaigns", exact: true })).toBeFocused();
  // Desktop zoom halves the CSS layout viewport. CSS style.zoom would not exercise media queries.
  // This checks the equivalent reflow width, not browser-chrome zoom control behavior.
  await page.setViewportSize({ width: 640, height: 450 });
  await expectNoHorizontalOverflow(page);
  await expect(page.locator("main [data-home-primary]")).toBeVisible();
});
