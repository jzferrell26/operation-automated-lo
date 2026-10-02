import { expect, test } from "@playwright/test";

import { EMPTY_LIBRARY } from "../../apps/web/src/copy/launch-messages.js";

import {
  LIBRARY_PATH,
  activeSampleAds,
  blockAnythingOffOrigin,
  expectChipsScrollSideways,
  expectEveryArtLoaded,
  expectGridColumns,
  sampleTopicCounts,
} from "./helpers/ads-library.js";
import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  expectThemeResolved,
  settleForScreenshot,
  useStoredTheme,
} from "./helpers/design-quality.js";

/**
 * PRD-009c part 2, the "Ads library" tab in a real browser against the synthetic server, which shows
 * the labelled sample ads (`playwright.config.ts` sets the sample guard's two raw values).
 *
 * - 009C-AC-005: every sample card shows a visible "Sample ad" label that a screen reader reaches.
 * - 009C-AC-010: four, three, two, and one cards a row; chips that scroll sideways at 390 and filter
 *   in place and through `?topic=`; no search box and no sort control.
 * - 009C-AC-011: "Use this ad" opens step 2 of "Launch an ad" with that ad.
 * - 009C-AC-013: art from the application's own origin, alternative text from the catalog, and axe
 *   clean at four frames in both themes.
 *
 * The review project runs the same checks signed in (`review/ads-library.spec.ts`).
 *
 * The last block is the empty library (009C-AC-012). It needs a server started without the sample
 * flag, which neither project's server is, so it runs only when `OALO_EXPECT_EMPTY_LIBRARY` is
 * `true`: 009G-AC-001's sample-less review server sets it, and so can anyone checking by hand.
 */

test.describe("The Ads library tab in a browser", () => {
  test("lays its ads out four, three, two, and one a row, with no sideways scroll (009C-AC-010)", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const external = await blockAnythingOffOrigin(page, new URL(baseURL ?? "").origin);
    await useStoredTheme(page, "light");
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await page.goto(LIBRARY_PATH);
      await expect(page.locator("[data-ad-card]")).toHaveCount(activeSampleAds().length);
      await settleForScreenshot(page);
      await expectGridColumns(page, frame.name);
      await expectNoHorizontalOverflow(page);
    }
    expect(external).toEqual([]);
  });

  test("scrolls the topic chips sideways at 390 and wraps them at the wider frames (009C-AC-010)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(LIBRARY_PATH);
    await settleForScreenshot(page);
    await expectChipsScrollSideways(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await settleForScreenshot(page);
    const chips = page.getByRole("list", { name: "Show ads about" });
    expect(await chips.evaluate((list) => list.scrollWidth <= list.clientWidth + 1)).toBe(true);
  });

  test("has chips with counts that filter in place and through ?topic=, and no search or sort (009C-AC-010)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(LIBRARY_PATH);

    const counts = sampleTopicCounts();
    const total = activeSampleAds().length;
    const chips = page.getByRole("list", { name: "Show ads about" }).getByRole("button");
    await expect(chips).toHaveCount(counts.size + 1);
    await expect(chips.first()).toHaveText(`All ${String(total)}`);
    await expect(chips.first()).toHaveAttribute("aria-pressed", "true");

    // Marking the document proves the page is not reloaded by a chip.
    await page.evaluate(() => {
      (window as unknown as { __kept: boolean }).__kept = true;
    });
    const refinance = page.getByRole("button", { name: /^Refinance\s+\d+$/u });
    await refinance.click();
    await expect(page).toHaveURL(/\/marketing\/campaigns\/library\?topic=refinance$/u);
    await expect(page.locator("[data-ad-card]")).toHaveCount(counts.get("refinance") ?? -1);
    await expect(refinance).toHaveAttribute("aria-pressed", "true");
    expect(
      await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept),
      "the page was not reloaded",
    ).toBe(true);
    await expect(page.getByRole("status")).toHaveText(/Showing \d+ ads? about Refinance\./u);

    // The same address, opened fresh, shows the same ads: the filter is in the address.
    await page.reload();
    await expect(page.locator("[data-ad-card]")).toHaveCount(counts.get("refinance") ?? -1);
    await expect(page.getByRole("button", { name: /^Refinance\s+\d+$/u })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: /^All\s+\d+$/u }).click();
    await expect(page).toHaveURL(/\/marketing\/campaigns\/library$/u);
    await expect(page.locator("[data-ad-card]")).toHaveCount(total);

    await page.goto(`${LIBRARY_PATH}?topic=not-a-topic`);
    await expect(page.locator("[data-ad-card]")).toHaveCount(total);

    // No search box, no sort control, and no form control of any kind on the tab.
    await expect(page.locator("main input, main select, main textarea")).toHaveCount(0);
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
  });

  test("labels every sample card with a visible Sample ad that a screen reader reaches (009C-AC-005)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(LIBRARY_PATH);
    const cards = page.locator("[data-ad-card]");
    const count = await cards.count();
    expect(count).toBeGreaterThan(1);
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      await expect(card.getByText("Sample ad", { exact: true })).toBeVisible();
      // In the accessibility tree too, not only on screen.
      expect(await card.ariaSnapshot(), `card ${String(index + 1)}`).toContain("Sample ad");
    }
  });

  test("shows the viewer's own brand on each card, and a way into step 2 with that ad (009C-AC-011)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(LIBRARY_PATH);
    const first = activeSampleAds().find((entry) => entry.id === "sample-first-home");
    expect(first, "the sample catalog has the first home ad").toBeDefined();
    const card = page.getByRole("article", { name: first?.name ?? "", exact: true });
    await expect(card.getByText("Alex Morgan")).toBeVisible();
    await expect(card.getByText("Loan officer, NMLS 0000000")).toBeVisible();
    await expect(card.getByText(/^Version 2\. Reviewed /u)).toBeVisible();

    await card.getByRole("link", { name: /^Use this ad/u }).click();
    await page.waitForURL(
      /\/marketing\/campaigns\/new\?step=2&ad=sample-first-home&from=library$/u,
    );
    await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
    // Cancel on step 1 returns to the library, because that is where the person started.
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", LIBRARY_PATH);
  });

  test("serves art from its own origin with the catalog's alternative text (009C-AC-013)", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const external = await blockAnythingOffOrigin(page, new URL(baseURL ?? "").origin);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(LIBRARY_PATH);
    await expectEveryArtLoaded(page);

    for (const entry of activeSampleAds()) {
      const card = page.getByRole("article", { name: entry.name, exact: true });
      const art = card.getByRole("img", { name: entry.images.alt, exact: true });
      await expect(art, entry.id).toHaveCount(1);
      expect(await art.getAttribute("src")).toMatch(/^\/api\/ads-library\/samples\//u);
    }
    expect(external).toEqual([]);
  });

  test("is axe-clean at the four frames in Light and Dark (009C-AC-013)", async ({ page }) => {
    test.setTimeout(240_000);
    for (const theme of ["light", "dark"] as const) {
      await useStoredTheme(page, theme);
      for (const frame of REVIEW_FRAMES) {
        await page.setViewportSize({ width: frame.width, height: frame.height });
        await page.goto(LIBRARY_PATH);
        await expectThemeResolved(page, theme);
        await expect(page.locator("[data-ad-card]").first()).toBeVisible();
        await settleForScreenshot(page);
        await expectAxeClean(page);
      }
    }
  });
});

test.describe("The Ads library tab with no ad in the library (009C-AC-012)", () => {
  test.skip(
    process.env["OALO_EXPECT_EMPTY_LIBRARY"] !== "true",
    "Needs a server started without the sample flag; set OALO_EXPECT_EMPTY_LIBRARY=true for that run",
  );

  test("says so in one sentence, with no chips and no grid, at the four frames in Light and Dark", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    for (const theme of ["light", "dark"] as const) {
      await useStoredTheme(page, theme);
      for (const frame of REVIEW_FRAMES) {
        await page.setViewportSize({ width: frame.width, height: frame.height });
        await page.goto(LIBRARY_PATH);
        await expectThemeResolved(page, theme);
        await expect(page.getByText(EMPTY_LIBRARY)).toBeVisible();
        await settleForScreenshot(page);
        await expect(page.getByRole("list", { name: "Show ads about" })).toHaveCount(0);
        await expect(page.locator("[data-ad-card-grid], [data-ad-card]")).toHaveCount(0);
        await expect(page.getByRole("link", { name: /^Use this ad/u })).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
        await expectAxeClean(page);
      }
    }
  });

  test("answers the sample art route with not found, because no sample is served here", async ({
    request,
  }) => {
    const response = await request.get("/api/ads-library/samples/sample-first-home/2/tall");
    expect(response.status()).toBe(404);
  });
});
