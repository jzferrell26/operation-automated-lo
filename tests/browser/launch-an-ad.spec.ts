import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  settleForScreenshot,
  useStoredTheme,
} from "./helpers/design-quality.js";
import { countActivations, readActivations, resetActivations } from "./helpers/activation-count.js";
import { withAnEmptyCampaignWorkspace } from "./helpers/empty-campaign-workspace.js";
import {
  LAUNCH_PATH,
  RATE_CLAIM_HEADLINE,
  SAMPLE_ADS,
  adCard,
  addPlace,
  campaignRefOf,
  saveACampaign,
  saveAndCheck,
  stepTwoPath,
  useThisAd,
  verdictOnStepThree,
} from "./helpers/launch-an-ad.js";

/**
 * PRD-009d "Launch an ad", measured in a real browser against the synthetic server.
 *
 * Synthetic mode's principal holds `campaign_creator`, so everything up to "Save and check" and
 * every step 3 state a creator sees is reachable here; approving needs an approver and lives in
 * the review project (`review/review-campaign-decision.spec.ts` and
 * `review/launch-an-ad.click-count.spec.ts`). Each test runs in a workspace that starts empty and
 * is put back afterwards, so no other picture in the suite sees these campaigns.
 *
 * - 009D-AC-001: the address states, Back keeping the words, and a reload on step 3.
 * - 009D-AC-004: the band never overflows at any frame.
 * - 009D-AC-009: the live preview beside the form at 1440 and 1180, below it at 768 and 390.
 * - 009D-AC-013: the measured shape of the ad on step 3, tall by default and square on request.
 * - 009D-AC-019 and 020: "Fix it" opens step 2 at the words, and the save appends to the campaign.
 * - 009D-AC-022, the creator's part: from step 1 to step 3 the first campaign takes three
 *   activations and one typed field, and the second takes two and none. The review project counts
 *   the whole path from Home through approval.
 */

const applicationOrigin = "http://127.0.0.1:3100";

/** The four ratios the criterion names, width over height, and the tolerance it allows. */
const TALL = 4 / 5;
const SQUARE = 1;
const SHAPE_TOLERANCE = 0.005;

async function blockAnythingOffOrigin(page: Page): Promise<readonly string[]> {
  const external: string[] = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (new URL(url).origin !== applicationOrigin) {
      external.push(url);
      await route.abort();
      return;
    }
    await route.continue();
  });
  return external;
}

async function box(locator: Locator) {
  const measured = await locator.boundingBox();
  if (measured === null) throw new Error("The element has no box on screen");
  return measured;
}

/** Every band on the page keeps its text inside itself, and the name never drops below 14px. */
async function expectBandsInsideThemselves(page: Page, where: string): Promise<void> {
  const bands = page.locator("[data-brand-band]");
  expect(await bands.count(), `${where}: a band is on screen`).toBeGreaterThan(0);
  const problems = await bands.evaluateAll((elements) =>
    elements.flatMap((band, index) => {
      const outer = band.getBoundingClientRect();
      const found: string[] = [];
      if (band.scrollWidth > band.clientWidth + 1) found.push(`band ${String(index)} scrolls`);
      for (const child of band.querySelectorAll("*")) {
        const inner = child.getBoundingClientRect();
        if (inner.width === 0) continue;
        if (inner.right > outer.right + 1 || inner.left < outer.left - 1) {
          found.push(`band ${String(index)}: ${child.tagName} leaves the band`);
        }
      }
      const name = band.querySelector("[data-name-size]");
      if (name !== null && Number.parseFloat(getComputedStyle(name).fontSize) < 14) {
        found.push(`band ${String(index)}: the name is under 14px`);
      }
      return found;
    }),
  );
  expect(problems, where).toEqual([]);
}

test.describe("Launch an ad in a browser", () => {
  test("the address only ever selects a known state and never leaves the application (009D-AC-001)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const external = await blockAnythingOffOrigin(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(LAUNCH_PATH);
    const everyCard = await page.locator("[data-ad-card]").count();
    expect(everyCard).toBeGreaterThan(1);

    for (const odd of ["?from=https://example.invalid", "?step=9", "?topic=x"]) {
      await page.goto(`${LAUNCH_PATH}${odd}`);
      await expect(
        page.getByRole("heading", { level: 1, name: "Choose an ad" }),
        odd,
      ).toBeVisible();
      await expect(page.locator("[data-ad-card]"), odd).toHaveCount(everyCard);
      await expect(page.getByRole("button", { name: /^All/u }), odd).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      const cancel = page.getByRole("link", { name: "Cancel" });
      await expect(cancel, odd).toHaveAttribute("href", "/marketing/campaigns");
    }
    await page.getByRole("link", { name: "Cancel" }).click();
    await page.waitForURL(`${applicationOrigin}/marketing/campaigns`);
    expect(external).toEqual([]);
  });

  test("Back keeps the typed words, and a reload on step 3 re-reads the saved version (009D-AC-001)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const external = await blockAnythingOffOrigin(page);
    await withAnEmptyCampaignWorkspace(async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(LAUNCH_PATH);
      await useThisAd(page, SAMPLE_ADS.firstHome);
      const headline = page.getByLabel("Headline", { exact: false });
      await headline.fill("Your first home starts with a plan");
      await page.getByRole("button", { name: "Back" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeVisible();
      await useThisAd(page, SAMPLE_ADS.firstHome);
      await expect(headline).toHaveValue("Your first home starts with a plan");

      // The browser's own Back and Forward move between the steps too.
      await page.goBack();
      await expect(page.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeVisible();
      await page.goForward();
      await expect(headline).toHaveValue("Your first home starts with a plan");

      await addPlace(page, "Austin, TX");
      const ref = await saveAndCheck(page);
      await expect(verdictOnStepThree(page)).toContainText("Checks passed");
      await page.reload();
      await expect(
        page.getByRole("heading", { level: 1, name: "Review and launch" }),
      ).toBeVisible();
      expect(campaignRefOf(page.url())).toBe(ref);
      await expect(page.locator("[data-launch-step='3']")).toContainText(
        "Your first home starts with a plan",
      );
      await expect(page.locator("[data-launch-step='3']")).toContainText(
        "Austin, TX and everything within 15 miles",
      );
    });
    expect(external).toEqual([]);
  });

  /**
   * The CI runs of 2026-10-02 found two "Headline" and two "Add a city or state" fields on step 2:
   * a page slow to render was rendered again on the client while the server's copy still arrived,
   * because the theme provider changed its value during hydration. Each field must exist once,
   * hidden copies included, and be the one the server rendered.
   */
  test("step 2 renders each field once, the server's copy, in either theme", async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await useStoredTheme(page, theme);
      await page.goto(stepTwoPath(SAMPLE_ADS.firstHome));
      await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
      for (const label of [
        "Headline",
        "Ad text",
        "Daily budget",
        "Total budget",
        "Ends",
        "Add a city or state",
      ]) {
        await expect(page.getByLabel(label, { exact: true }), `${theme}: ${label}`).toHaveCount(1);
      }
      const clientRendered = await page.evaluate(() =>
        [...document.querySelectorAll("[data-launch-step] [id$='-control']")]
          .map((control) => control.id)
          .filter((id) => id.startsWith("_r_")),
      );
      expect(clientRendered, `${theme}: fields rendered again on the client`).toEqual([]);
    }
  });

  test("the live preview sits beside the form at 1440 and 1180 and below it at 768 and 390 (009D-AC-009, 004)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const external = await blockAnythingOffOrigin(page);
    await useStoredTheme(page, "light");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(stepTwoPath(SAMPLE_ADS.firstHome));
    await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
    const preview = page.getByRole("complementary", { name: "Your ad so far" });
    await expect(preview).toBeVisible();

    await page.getByLabel("Headline", { exact: false }).fill("A plan for your first home");
    await expect(preview).toContainText("A plan for your first home");

    const words = page.locator("#words");
    const save = page.getByRole("button", { name: "Save and check" });
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await settleForScreenshot(page);
      const [formSide, previewSide, saveSide] = await Promise.all([
        box(words),
        box(preview),
        box(save),
      ]);
      if (frame.width >= 1180) {
        expect(
          previewSide.x,
          `${frame.name}: the preview is to the right of the form`,
        ).toBeGreaterThanOrEqual(formSide.x + formSide.width - 1);
        expect(previewSide.y, `${frame.name}: the preview starts beside the form`).toBeLessThan(
          saveSide.y,
        );
      } else {
        expect(
          previewSide.y,
          `${frame.name}: the preview is below the form`,
        ).toBeGreaterThanOrEqual(saveSide.y + saveSide.height - 1);
      }
      await expectNoHorizontalOverflow(page);
      await expectBandsInsideThemselves(page, `step 2 at ${frame.name}`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await expectAxeClean(page);
    expect(external).toEqual([]);
  });

  test("step 3 shows the ad at 4:5, or 1:1 on request, within half a percent at every frame (009D-AC-013, 004)", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const external = await blockAnythingOffOrigin(page);
    await withAnEmptyCampaignWorkspace(async () => {
      await useStoredTheme(page, "light");
      await page.setViewportSize({ width: 1440, height: 900 });
      await saveACampaign(page, { ad: SAMPLE_ADS.firstHome, place: "Austin, TX" });
      const stepThree = page.locator("[data-launch-step='3']");
      const creative = stepThree.locator("[data-ad-creative]");
      await expect(creative).toHaveCount(1);
      await expect(stepThree).toContainText("Your approval covers both shapes.");
      await expect(stepThree).toContainText("Shown as it might look in a Facebook feed.");
      // A generic frame: no Meta logo, no Meta mark, nothing drawn from Meta.
      await expect(stepThree.locator("img[alt*='Facebook' i], img[alt*='Meta' i]")).toHaveCount(0);
      await expect(stepThree.locator("svg[aria-label*='Facebook' i]")).toHaveCount(0);

      for (const [shape, ratio, label] of [
        ["tall", TALL, "Tall (4:5)"],
        ["square", SQUARE, "Square (1:1)"],
      ] as const) {
        await stepThree.getByRole("radio", { name: label }).check();
        await expect(creative).toHaveAttribute("data-shape", shape);
        for (const frame of REVIEW_FRAMES) {
          await page.setViewportSize({ width: frame.width, height: frame.height });
          await settleForScreenshot(page);
          const measured = await box(creative);
          const actual = measured.width / measured.height;
          expect(
            Math.abs(actual - ratio) / ratio,
            `${shape} at ${frame.name}: ${measured.width.toFixed(1)} by ${measured.height.toFixed(1)}`,
          ).toBeLessThanOrEqual(SHAPE_TOLERANCE);
          await expectNoHorizontalOverflow(page);
          await expectBandsInsideThemselves(page, `step 3 ${shape} at ${frame.name}`);
        }
        await page.setViewportSize({ width: 1440, height: 900 });
      }
      await expectAxeClean(page);
    });
    expect(external).toEqual([]);
  });

  test("Fix it opens step 2 at the words, and the next save is version 2 of the same campaign (009D-AC-019, 020)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const external = await blockAnythingOffOrigin(page);
    await withAnEmptyCampaignWorkspace(async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const ref = await saveACampaign(page, {
        ad: SAMPLE_ADS.firstHome,
        place: "Austin, TX",
        headline: RATE_CLAIM_HEADLINE,
      });
      await expect(verdictOnStepThree(page)).toContainText("Needs changes");
      await page.getByRole("link", { name: "Fix it" }).click();
      await page.waitForURL(/[?&]step=2(?:&|$)/u);
      expect(campaignRefOf(page.url())).toBe(ref);
      expect(new URL(page.url()).hash).toBe("#words");
      const headline = page.getByLabel("Headline", { exact: false });
      await expect(headline).toHaveValue(RATE_CLAIM_HEADLINE);
      await expect(page.getByRole("list", { name: "Places this ad shows" })).toContainText(
        "Austin, TX",
      );

      await headline.fill("Your first home starts with a plan");
      const again = await saveAndCheck(page);
      expect(again, "the new version belongs to the same campaign").toBe(ref);
      await expect(verdictOnStepThree(page)).toContainText("Checks passed");

      // The card on step 1 is untouched by any of it.
      await page.goto(LAUNCH_PATH);
      await expect(adCard(page, SAMPLE_ADS.firstHome)).toBeVisible();
    });
    expect(external).toEqual([]);
  });

  test("the creator's part of D9: 3 activations and 1 typed field, then 2 and none (009D-AC-022)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const external = await blockAnythingOffOrigin(page);
    await countActivations(page);
    await withAnEmptyCampaignWorkspace(async () => {
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.goto(LAUNCH_PATH);
      await resetActivations(page);
      await useThisAd(page, SAMPLE_ADS.firstHome);
      await page.getByLabel("Add a city or state", { exact: false }).fill("Austin, TX");
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await saveAndCheck(page);
      const first = await readActivations(page);
      expect(first.activations).toEqual(["Use this ad", "Add", "Save and check"]);
      expect(first.typedFields).toHaveLength(1);
      expect(first.typedFields[0]).toMatch(/^Add a city or state/u);
      expect(first.forbidden).toEqual([]);

      await page.goto(LAUNCH_PATH);
      await resetActivations(page);
      await useThisAd(page, SAMPLE_ADS.preApproval);
      await expect(page.getByRole("list", { name: "Places this ad shows" })).toContainText(
        "Austin, TX",
      );
      await saveAndCheck(page);
      const second = await readActivations(page);
      expect(second.activations).toEqual(["Use this ad", "Save and check"]);
      expect(second.typedFields).toEqual([]);
      expect(second.forbidden).toEqual([]);
    });
    expect(external).toEqual([]);
  });
});
