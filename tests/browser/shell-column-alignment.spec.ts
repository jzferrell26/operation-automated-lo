import { expect, test, type Page } from "@playwright/test";

import { REVIEW_FRAMES, settleForScreenshot } from "./helpers/design-quality.js";

/**
 * PRD-009 Wave 1 verifier findings, assigned to 009b in Wave 2, measured in a real browser.
 *
 * 1. **The page column starts at the wordmark.** At 1440 the page began at x=120 while the wordmark
 *    sat at x=152, because the page column was the bar's measure plus 64px. The mockups draw the
 *    two sharing an edge (`design/mockups/previews/home-first-run--1440.png`: both at x=152). The
 *    check runs at 1440 and 1180 and 768, and at 390 too, where the bar and the page both take the
 *    narrow `--space-4` gutter.
 * 2. **The account control is the 44px target.** It measured 50px against the mockup's roughly 44px.
 *    It is exactly 44px tall, and no smaller, at every frame.
 *
 * `apps/web/src/features/shell/components/app-shell-alignment.unit.test.ts` pins the two rules
 * without a browser; this is what says the rendered boxes agree, because a rule can be right and a
 * cascade still wrong. It runs against the synthetic server, which draws the same shell.
 */

const FRAMES = REVIEW_FRAMES.filter((frame) => ["1440", "1180", "768", "390"].includes(frame.name));

async function leftEdges(page: Page) {
  return page.evaluate(() => {
    const wordmark = document.querySelector<HTMLElement>("header a[href='/overview']");
    const main = document.querySelector<HTMLElement>("main");
    const firstContent = main?.firstElementChild as HTMLElement | null | undefined;
    if (!wordmark || !main || !firstContent) return undefined;
    const tile = wordmark.querySelector<HTMLElement>("span") ?? wordmark;
    const style = getComputedStyle(main);
    return {
      wordmarkLeft: wordmark.getBoundingClientRect().left,
      tileLeft: tile.getBoundingClientRect().left,
      mainContentLeft: main.getBoundingClientRect().left + Number.parseFloat(style.paddingLeft),
      firstContentLeft: firstContent.getBoundingClientRect().left,
    };
  });
}

for (const frame of FRAMES) {
  test(`at ${frame.name} the page column starts at the wordmark's left edge`, async ({ page }) => {
    await page.setViewportSize({ width: frame.width, height: frame.height });
    await page.goto("/overview");
    await settleForScreenshot(page);

    const edges = await leftEdges(page);
    expect(edges, "the shell and the page are on screen").toBeDefined();
    if (edges === undefined) return;
    // At 390 the wordmark's tile is hidden and the Menu button leads the bar, so the wordmark's own
    // box is the text; the bar's first box is the Menu button, which shares the page's gutter.
    const barLeft =
      frame.width < 720
        ? await page
            .getByRole("banner")
            .getByRole("button", { name: "Menu" })
            .evaluate((button) => button.getBoundingClientRect().left)
        : edges.wordmarkLeft;
    expect(
      Math.abs(edges.mainContentLeft - barLeft),
      `the page column starts at ${String(edges.mainContentLeft)} and the bar's first box at ${String(barLeft)}`,
    ).toBeLessThan(1);
    expect(
      Math.abs(edges.firstContentLeft - edges.mainContentLeft),
      "the page's first element sits on the column's edge",
    ).toBeLessThan(1);
  });

  test(`at ${frame.name} the account control is 44px tall`, async ({ page }) => {
    await page.setViewportSize({ width: frame.width, height: frame.height });
    await page.goto("/overview");
    await settleForScreenshot(page);

    const box = await page
      .getByRole("banner")
      .getByRole("button", { name: /^Your account: / })
      .boundingBox();
    expect(box, "the account control is on screen").not.toBeNull();
    expect(box?.height ?? 0, "never smaller than the 44px target").toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0, "and not the 50px it was").toBeLessThan(44.5);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  });
}

test("the page column is the same width as the bar's box at 1440", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/overview");
  await settleForScreenshot(page);

  const widths = await page.evaluate(() => {
    const bar = document.querySelector("header > div");
    const main = document.querySelector("main");
    return {
      bar: bar?.getBoundingClientRect().width ?? 0,
      main: main?.getBoundingClientRect().width ?? 0,
      barLeft: bar?.getBoundingClientRect().left ?? 0,
      mainLeft: main?.getBoundingClientRect().left ?? 0,
    };
  });
  expect(Math.abs(widths.bar - widths.main)).toBeLessThan(1);
  expect(Math.abs(widths.barLeft - widths.mainLeft)).toBeLessThan(1);
});
