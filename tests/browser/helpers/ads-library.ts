import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page } from "@playwright/test";

import { settleForScreenshot } from "./design-quality.js";

/**
 * PRD-009c part 2. What a browser sees on the "Ads library" tab, shared by the synthetic suite
 * (`tests/browser/ads-library.spec.ts`) and the review suite (`tests/browser/review/ads-library.spec.ts`)
 * so both measure the same thing the same way.
 *
 * The library is the labelled sample ads both servers show behind the sample flag (009c D3). The
 * catalog is read from the repository, so what a card must show comes from the data and not from a
 * copy of it.
 */

export const LIBRARY_PATH = "/marketing/campaigns/library";

/** 009C-AC-010: four cards a row at 1440, three at 1180, two at 768, and one at 390. */
export const CARDS_PER_ROW: Readonly<Record<string, number>> = Object.freeze({
  "1440": 4,
  "1180": 3,
  "768": 2,
  "390": 1,
});

interface SampleEntry {
  readonly id: string;
  readonly version: number;
  readonly status: string;
  readonly topic: string;
  readonly name: string;
  readonly images: { readonly alt: string };
}

const SAMPLE_CATALOG = join(
  import.meta.dirname,
  "../../../apps/web/src/fixtures/ads-library/sample-catalog.json",
);

/** The sample ads a person can choose: the active ones (a replaced version has an active newer one). */
export function activeSampleAds(): readonly SampleEntry[] {
  const entries = JSON.parse(readFileSync(SAMPLE_CATALOG, "utf8")) as SampleEntry[];
  return entries.filter((entry) => entry.status === "active");
}

/** The five topics, in the order the chips list them (009c D1). */
const TOPIC_ORDER = [
  "first-time-buyers",
  "refinance",
  "va-loans",
  "pre-approval",
  "down-payment-help",
] as const;

/** Counts of active sample ads by topic, in the order the chips list them, topics with none left out. */
export function sampleTopicCounts(): ReadonlyMap<string, number> {
  const ads = activeSampleAds();
  const counts = new Map<string, number>();
  for (const topic of TOPIC_ORDER) {
    const count = ads.filter((entry) => entry.topic === topic).length;
    if (count > 0) counts.set(topic, count);
  }
  return counts;
}

/** Aborts, and records, any request that leaves the application's own origin (009C-AC-013). */
export async function blockAnythingOffOrigin(page: Page, origin: string): Promise<string[]> {
  const external: string[] = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (new URL(url).origin !== origin) {
      external.push(url);
      await route.abort();
      return;
    }
    await route.continue();
  });
  return external;
}

/** How many cards share the first card's row. */
export async function cardsInTheFirstRow(page: Page): Promise<number> {
  return page.locator("[data-ad-card]").evaluateAll((cards) => {
    const tops = cards.map((card) => Math.round(card.getBoundingClientRect().top));
    return tops.filter((top) => Math.abs(top - (tops[0] ?? 0)) <= 1).length;
  });
}

export async function expectGridColumns(page: Page, frameName: string): Promise<void> {
  const expected = CARDS_PER_ROW[frameName];
  expect(expected, `a column count is defined for ${frameName}`).toBeDefined();
  expect(await cardsInTheFirstRow(page), `cards in the first row at ${frameName}`).toBe(expected);
}

/** 009C-AC-010: the chip row scrolls sideways on a phone, and the page itself does not. */
export async function expectChipsScrollSideways(page: Page): Promise<void> {
  const chips = page.getByRole("list", { name: "Show ads about" });
  const facts = await chips.evaluate((list) => ({
    overflowX: getComputedStyle(list).overflowX,
    scrolls: list.scrollWidth > list.clientWidth + 1,
    wraps: getComputedStyle(list).flexWrap !== "nowrap",
    page: document.documentElement.scrollWidth - window.innerWidth,
  }));
  expect(facts.overflowX).toBe("auto");
  expect(facts.wraps, "chips do not wrap into a tall block").toBe(false);
  expect(facts.scrolls, "chips are wider than the row, so they scroll").toBe(true);
  expect(facts.page, "the page does not scroll sideways").toBeLessThanOrEqual(0);
}

/** Every `img` in the cards has loaded, so a broken art route or a blocked request shows up. */
export async function expectEveryArtLoaded(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page
          .locator("[data-ad-card] img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      { message: "every card's art loaded" },
    )
    .toBe(true);
}

/**
 * Settles the library for a measurement without waiting for the network to go idle.
 *
 * `settleForScreenshot` ends with `waitForLoadState("networkidle")`, which has no limit of its own
 * but the test's. CI's full synthetic run of `ads-library.spec.ts` (run 36989783019) lost a whole
 * 240 second attempt to it once, and the retry passed in 90 seconds. Idle network proves nothing a
 * measurement here needs: what matters is that the styles applied, the fonts are ready, and every
 * card's picture has loaded, and each of those is waited for by name.
 */
export async function settleTheLibrary(page: Page): Promise<void> {
  await settleForScreenshot(page, { idleNetwork: false });
  if ((await page.locator("[data-ad-card]").count()) > 0) await expectEveryArtLoaded(page);
}

/**
 * The longest the page may hold the browser's main thread in one task while it loads, in
 * milliseconds. The library once held it for about 2,500 ms, three times in a row, because three
 * nested grids sized their tracks from the cards (see `ads-library.module.css`): the page took 8
 * seconds to fire `load`, and CI's full synthetic run lost a 240 second attempt to it waiting for
 * the network to go idle. Working loads measure about 175 ms here, so a slower runner has room.
 */
export const MAIN_THREAD_TASK_BUDGET_MS = 1000;

/** Starts recording long tasks (50 ms or more) on every page this one opens. Call before `goto`. */
export async function watchLongTasks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const longTasks: number[] = [];
    (window as unknown as { __longTasks: number[] }).__longTasks = longTasks;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: true });
  });
}

export async function expectNoLongTask(page: Page): Promise<void> {
  const longest = await page.evaluate(() =>
    Math.max(0, ...((window as unknown as { __longTasks?: number[] }).__longTasks ?? [])),
  );
  expect(
    longest,
    `the longest main-thread task while the library loaded, against ${String(MAIN_THREAD_TASK_BUDGET_MS)} ms`,
  ).toBeLessThan(MAIN_THREAD_TASK_BUDGET_MS);
}
