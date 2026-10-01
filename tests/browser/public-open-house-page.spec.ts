import { expect, test, type Page } from "@playwright/test";

import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  expectThemeResolved,
  settleForScreenshot,
  useStoredTheme,
  type ReviewTheme,
} from "./helpers/design-quality.js";

/**
 * The synthetic public open-house page, held to a measure, a centre, and a page padding.
 *
 * PRD-008d, the baseline review of 2026-10-01, "The two surfaces with no baseline". The page is one
 * `<section>` that never had a module of its own: it was held to 44rem by the bootstrap
 * `section { max-width: 44rem }` rule, by accident, and the D-010 fix deleted that rule on purpose
 * (`06-review-rubric.md` section 5, "The rulings of 2026-10-01"). From then on it spanned the whole
 * viewport at 1440 and had no padding at any width, so on a phone its text touched the glass.
 *
 * The page has no screenshot baseline, and this adds none: a picture would need a baseline redraw,
 * which is a different change. The page is measured instead, at every frame in both themes, so the
 * three things the module owns cannot quietly go away again:
 *
 *   1. The content is no wider than the measure, and it fills the measure whenever the frame has
 *      room for it, so a collapsed column fails as surely as a runaway one.
 *   2. The content is centred.
 *   3. The content is never closer to the viewport's edge than the smallest page padding.
 *
 * Every size here is a `rem` token or a multiple of one, and `html` stays at the browser's 16px
 * (`globals.css`, the D-009 ruling), so a `rem` is 16 CSS pixels in every frame.
 */

const PUBLIC_PAGE = "/public/synthetic-open-house-v3";

/** `synthetic-open-house.module.css`, `.column`: 30rem. */
const MEASURE_PX = 30 * 16;

/** Brief section 11 and `--space-4`: the page padding at the narrowest frame, and so the floor. */
const MIN_PAGE_PADDING_PX = 4 * 4;

/**
 * Where the page's content sits, read from the elements that carry it: the title, the sentences,
 * and the card. Next appends its own route announcer to the body; it is a one-pixel box, so a
 * width test drops it without naming it.
 */
async function measureTheContent(page: Page): Promise<
  Readonly<{
    left: number;
    right: number;
    width: number;
    viewport: number;
  }>
> {
  return await page.evaluate(() => {
    const boxes = [...document.querySelectorAll("body h1, body p, body article")]
      .map((element) => element.getBoundingClientRect())
      .filter((box) => box.width > 1 && box.height > 1);
    const left = Math.min(...boxes.map((box) => box.left));
    const right = Math.max(...boxes.map((box) => box.right));
    return {
      left,
      right,
      width: right - left,
      viewport: document.documentElement.clientWidth,
    };
  });
}

for (const theme of ["light", "dark"] as const satisfies readonly ReviewTheme[]) {
  for (const frame of REVIEW_FRAMES) {
    test(`the public open-house page at ${frame.name} in ${theme} keeps a measure, a centre, and a padding`, async ({
      page,
    }) => {
      await useStoredTheme(page, theme);
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await page.goto(PUBLIC_PAGE);
      await expectThemeResolved(page, theme);
      await settleForScreenshot(page);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const content = await measureTheContent(page);

      // The measure: never wider than it, and as wide as it whenever the frame has the room.
      expect(
        content.width,
        `the content is ${String(content.width)}px wide in a ${String(frame.width)}px frame`,
      ).toBeLessThanOrEqual(MEASURE_PX + 0.5);
      if (frame.width >= MEASURE_PX + 2 * MIN_PAGE_PADDING_PX) {
        expect(
          content.width,
          "the content fills the measure when the frame allows",
        ).toBeGreaterThan(MEASURE_PX - 1);
      }

      // Centred: the same room on both sides.
      const roomBefore = content.left;
      const roomAfter = content.viewport - content.right;
      expect(
        Math.abs(roomBefore - roomAfter),
        `${String(roomBefore)}px before the content and ${String(roomAfter)}px after it`,
      ).toBeLessThan(1);

      // A page padding: the text never touches the edge of the frame.
      expect(roomBefore, "room before the content").toBeGreaterThanOrEqual(MIN_PAGE_PADDING_PX);
      expect(roomAfter, "room after the content").toBeGreaterThanOrEqual(MIN_PAGE_PADDING_PX);

      await expectNoHorizontalOverflow(page);
      // Rubric axes 4 and 9, unfiltered, as on every other page.
      await expectAxeClean(page);
    });
  }
}
