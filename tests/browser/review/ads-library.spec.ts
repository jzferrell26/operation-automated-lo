import { expect, test } from "@playwright/test";

import {
  LIBRARY_PATH,
  activeSampleAds,
  expectChipsScrollSideways,
  expectEveryArtLoaded,
  expectGridColumns,
  sampleTopicCounts,
} from "../helpers/ads-library.js";
import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  expectThemeResolved,
  settleForScreenshot,
  useStoredTheme,
} from "../helpers/design-quality.js";
import {
  expectNoExternalRequests,
  guardLocalOrigin,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-009c part 2, the review halves of 009C-AC-010, 009C-AC-011, and 009C-AC-013, signed in as the
 * seeded creator against a real database.
 *
 * The review test run starts its server with the sample guard's two raw values set
 * (`tooling/scripts/database/review-browser-run.mjs`, 009C-AC-004), so the tab shows the labelled
 * sample ads here. What the browser measures is the same as in the synthetic suite
 * (`tests/browser/ads-library.spec.ts`), through the shared helpers, so the two cannot drift apart.
 *
 * The tab needs a session, because every ad carries the signed-in person's own brand: the first
 * test shows that a visitor with none is sent to sign in.
 */

test("sends a visitor with no session to sign in, never to a library with a band that is nobody's", async ({
  page,
}) => {
  await page.goto(LIBRARY_PATH);
  await page.waitForURL(/\/sign-in/u);
});

test("lays the library out at the four frames, filters in place, and is axe-clean in Light and Dark", async ({
  page,
}) => {
  test.setTimeout(420_000);
  const guard = await guardLocalOrigin(page);
  const { creatorEmail, password } = seededCredentials();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, creatorEmail, password);

  const total = activeSampleAds().length;
  for (const theme of ["light", "dark"] as const) {
    await useStoredTheme(page, theme);
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await page.goto(LIBRARY_PATH);
      await expectThemeResolved(page, theme);
      await expect(page.locator("[data-ad-card]")).toHaveCount(total);
      await settleForScreenshot(page);
      await expectEveryArtLoaded(page);
      await expectGridColumns(page, frame.name);
      await expectNoHorizontalOverflow(page);
      // The band is the signed-in person's own: every card carries one, as text.
      await expect(page.locator("[data-ad-card] [data-brand-band]")).toHaveCount(total);
      await expectAxeClean(page);
      if (frame.name === "390") await expectChipsScrollSideways(page);
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(LIBRARY_PATH);
  const counts = sampleTopicCounts();
  const first = [...counts.keys()][0] ?? "";
  const label = page.getByRole("list", { name: "Show ads about" }).getByRole("button").nth(1);
  await label.click();
  await expect(page).toHaveURL(new RegExp(`\\?topic=${first}$`, "u"));
  await expect(page.locator("[data-ad-card]")).toHaveCount(counts.get(first) ?? -1);

  expectNoExternalRequests(guard);
});

test("opens step 2 of Launch an ad with the chosen ad when a person uses it (009C-AC-011)", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const guard = await guardLocalOrigin(page);
  const { creatorEmail, password } = seededCredentials();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, creatorEmail, password);
  await page.goto(LIBRARY_PATH);

  const entry = activeSampleAds().find((item) => item.id === "sample-first-home");
  const card = page.getByRole("article", { name: entry?.name ?? "", exact: true });
  await card.getByRole("link", { name: /^Use this ad/u }).click();
  await page.waitForURL(/\/marketing\/campaigns\/new\?step=2&ad=sample-first-home&from=library$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
  expectNoExternalRequests(guard);
});
