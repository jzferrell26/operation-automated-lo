import { expect, type Page } from "@playwright/test";

/**
 * PRD-009g, 009G-AC-010. No focused control is hidden under the sticky top bar, and the page
 * reserves the bar's height as scroll padding.
 *
 * `expectKeyboardReachesEveryControl` walks forward, and walking forward only ever scrolls a control
 * in from below, where the bar is nowhere near it. The bar can only hide a control when the page
 * scrolls a control into view from above, which is what Shift+Tab does from the end of a page and
 * what a Tab that wraps does. So this starts at the bottom of the page and walks backwards, and at
 * each stop asks where the control landed.
 *
 * Three claims, all measured in the page so the bar's real height at this frame is the number used:
 *
 * 1. `scroll-padding-block-start` is at least the bar's height. The bar is not one height: it is a
 *    row at 1440 and 1180, two rows at 768, and the demo build adds a line of sample-data text to
 *    it. A reservation sized for one row leaves a control under the second.
 * 2. Every focused control outside the bar starts at or below the bar's lower edge, so none is
 *    covered by it.
 * 3. It ends inside the viewport, so the page scrolled to show it and did not leave it off screen.
 *
 * Two kinds of control are not measured against the bar, each for a reason argued once here. A
 * control inside the bar is where the bar keeps it. And the skip link is drawn over the bar on
 * purpose: `app-shell.module.css` gives it a `z-index` above the bar's and shows it at the top of
 * the frame when it takes focus, so it is the one control that is meant to be on top of it.
 */

/** Everything the browser's own sequential navigation can land on, as the focus walk lists it. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** The shell marks its pinned element, so nothing here reads a class name. */
const BAR_SELECTOR = "[data-shell-sticky-header]";

export type StickyBarFacts = Readonly<{
  barHeight: number;
  barPosition: string;
  scrollPadding: number;
}>;

/** What the bar is and what the page reserves for it, at the frame the page is in now. */
export async function readStickyBar(page: Page): Promise<StickyBarFacts> {
  return page.evaluate((barSelector) => {
    const bar = document.querySelector(barSelector);
    if (bar === null) throw new Error("The page has no top bar");
    const probe = document.createElement("div");
    probe.style.blockSize = getComputedStyle(document.documentElement).scrollPaddingBlockStart;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.append(probe);
    const scrollPadding = probe.getBoundingClientRect().height;
    probe.remove();
    return {
      barHeight: bar.getBoundingClientRect().height,
      barPosition: getComputedStyle(bar).position,
      scrollPadding,
    };
  }, BAR_SELECTOR);
}

/** Where each control the walk reached landed, against the bar's lower edge and the viewport. */
export type ReverseWalk = Readonly<{ hidden: readonly string[]; offScreen: readonly string[] }>;

/**
 * Scrolls to the bottom of the page and walks Shift+Tab to the top, reporting every control that
 * landed under the bar or off screen. Split from the assertion so a spec can run it on a page whose
 * reservation it has taken away, and see it fail, which is how the check is held to what it claims.
 */
export async function walkBackwardsFromTheBottom(page: Page): Promise<ReverseWalk> {
  const stops = await page.evaluate(
    (selector) => document.querySelectorAll(selector).length,
    FOCUSABLE,
  );
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, document.documentElement.scrollHeight);
  });

  const hidden: string[] = [];
  const offScreen: string[] = [];
  for (let stop = 0; stop < stops + 2; stop += 1) {
    await page.keyboard.press("Shift+Tab");
    const landed = await page.evaluate(
      ({ barSelector }) => {
        const element = document.activeElement;
        if (element === null || element === document.body) return undefined;
        const bar = document.querySelector(barSelector);
        const rect = element.getBoundingClientRect();
        return {
          name: `${element.tagName.toLowerCase()} "${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40)}"`,
          inBar:
            (bar?.contains(element) ?? false) || element.getAttribute("href") === "#main-content",
          top: rect.top,
          bottom: rect.bottom,
          barBottom: bar?.getBoundingClientRect().bottom ?? 0,
          viewport: window.innerHeight,
          visible: rect.width > 0 && rect.height > 0,
        };
      },
      { barSelector: BAR_SELECTOR },
    );
    // Focus left the document (the walk went past the first control) or is on nothing: the next
    // Shift+Tab comes back in at the end, so there is nothing to measure at this stop.
    if (landed === undefined) continue;
    if (landed.inBar || !landed.visible) continue;
    if (landed.top < landed.barBottom - 0.5) {
      hidden.push(
        `${landed.name} starts at ${String(Math.round(landed.top))}px under a bar that ends at ${String(Math.round(landed.barBottom))}px`,
      );
    }
    if (landed.bottom > landed.viewport + 0.5) {
      offScreen.push(
        `${landed.name} ends at ${String(Math.round(landed.bottom))}px of ${String(landed.viewport)}px`,
      );
    }
  }
  return { hidden, offScreen };
}

export async function expectFocusClearsTheStickyBar(page: Page, where: string): Promise<void> {
  const facts = await readStickyBar(page);
  expect(facts.barPosition, `${where}: the top bar is sticky`).toBe("sticky");
  expect(
    facts.scrollPadding,
    `${where}: the page reserves ${String(facts.scrollPadding)}px and the bar is ${String(facts.barHeight)}px`,
  ).toBeGreaterThanOrEqual(facts.barHeight);

  const walked = await walkBackwardsFromTheBottom(page);
  expect(walked.hidden, `${where}: a focused control is under the sticky top bar`).toEqual([]);
  expect(walked.offScreen, `${where}: a focused control is off screen`).toEqual([]);
}
