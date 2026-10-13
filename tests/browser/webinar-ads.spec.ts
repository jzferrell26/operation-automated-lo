import { expect, test } from "@playwright/test";
import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  expectStylesHaveApplied,
  expectThemeResolved,
  useStoredTheme,
} from "./helpers/design-quality.js";

// Existing synthetic server. No fixture deployment, approval or publication is enabled.
for (const frame of REVIEW_FRAMES) {
  for (const theme of ["light", "dark"] as const) {
    test(`webinar preparation at ${frame.name} in ${theme}`, async ({
      page,
      context,
    }, testInfo) => {
      test.setTimeout(90_000);
      const errors: string[] = [],
        mutations: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (request.method() !== "GET" && /\/api\/campaigns\//u.test(request.url()))
          mutations.push(request.url());
      });
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await useStoredTheme(page, theme);
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await page.goto("/marketing/campaigns/library");
      const pack = page.locator("[data-webinar-pack]");
      await expect(pack.locator("[data-webinar-creative]")).toHaveCount(15);
      await expectStylesHaveApplied(page);
      await expectThemeResolved(page, theme);
      await expect
        .poll(async () =>
          pack
            .locator("img")
            .evaluateAll((images) =>
              images.every(
                (image) =>
                  image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
              ),
            ),
        )
        .toBe(true);
      await expectNoHorizontalOverflow(page);
      await expectAxeClean(page);
      await page.screenshot({
        path: testInfo.outputPath(`webinar-gallery-${frame.name}-${theme}.png`),
        fullPage: true,
      });
      await pack.getByRole("button", { name: "Understand the housing budget" }).click();
      await expect(pack.locator("[data-webinar-creative]")).toHaveCount(3);
      await pack.getByRole("button", { name: "All fifteen" }).click();
      await pack
        .locator('[data-webinar-creative="webinar-first-home-plan"]')
        .getByRole("button", { name: /^Prepare this creative/u })
        .click();
      await expect(
        pack.getByRole("heading", { name: "Fifteen webinar ad creatives" }),
      ).toBeFocused();
      const headline = pack.getByLabel("Webinar ad headline"),
        text = pack.getByLabel("Webinar ad text");
      await headline.fill("");
      await text.fill("");
      await expect(pack.getByRole("button", { name: "Review this draft" })).toBeDisabled();
      await expect(pack.locator("#webinar-draft-minimum")).toContainText(
        "at least 3 visible characters",
      );
      await headline.fill("H".repeat(60));
      await text.fill("B".repeat(300));
      for (const selector of ["[data-webinar-preview-headline]", "[data-webinar-preview-text]"]) {
        const edited = pack.locator(selector);
        await expect(edited).toBeVisible();
        expect(
          await edited.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        ).toBe(true);
        expect(await edited.evaluate((element) => getComputedStyle(element).overflowWrap)).toBe(
          "anywhere",
        );
      }
      await expectNoHorizontalOverflow(page);
      await text.fill("First line.\nSecond line.");
      await expect(pack.locator("[data-webinar-preview-text]")).toHaveText(
        "First line.\nSecond line.",
      );
      expect(
        await pack
          .locator("[data-webinar-preview-text]")
          .evaluate((element) => getComputedStyle(element).whiteSpace),
      ).toBe("pre-wrap");
      await headline.fill("A plan for your next chapter.");
      await text.fill("Explore the homebuying process in an educational webinar.");
      await pack.getByRole("button", { name: "On-demand webinar", exact: true }).click();
      await pack.getByRole("button", { name: "Square", exact: true }).click();
      await expect(pack.locator("[data-ad-creative]")).toHaveAttribute("data-shape", "square");
      await expectNoHorizontalOverflow(page);
      await expectAxeClean(page);
      await pack.getByRole("button", { name: "Review this draft" }).click();
      await expect(pack.getByRole("status", { name: "Webinar preparation step" })).toContainText(
        "Step 3 of 3",
      );
      await expect(
        pack.getByRole("heading", { name: "A plan for your next chapter." }),
      ).toBeVisible();
      await expect(pack.getByRole("link", { name: "Open your on-demand webinar" })).toHaveAttribute(
        "href",
        "/marketing/campaigns/funnels/on-demand",
      );
      for (const shape of ["tall", "square"]) {
        const download = pack.getByRole("link", { name: `Download ${shape} artwork` });
        await expect(download).toHaveAttribute(
          "href",
          `/webinar-ads/webinar-first-home-plan/v1/${shape}.png`,
        );
        await expect(download).toHaveAttribute(
          "download",
          `webinar-first-home-plan-${shape}-art.png`,
        );
      }
      await pack.getByRole("button", { name: "Copy draft words" }).click();
      await expect(pack.getByRole("status", { name: "Draft clipboard status" })).toContainText(
        "Draft words copied",
      );
      expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
        "Headline: A plan for your next chapter.",
      );
      await expect(pack.getByRole("button", { name: /approve|launch/i })).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await expectAxeClean(page);
      await page.screenshot({
        path: testInfo.outputPath(`webinar-review-${frame.name}-${theme}.png`),
        fullPage: true,
      });
      expect(errors).toEqual([]);
      expect(mutations).toEqual([]);
    });
  }
}
