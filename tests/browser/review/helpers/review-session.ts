import { expect, type Page } from "@playwright/test";

import { expectThemeResolved, type ReviewTheme } from "../../helpers/design-quality.js";
import { restartGuidedSetup } from "./guided-setup-journey.js";

/** The two themes the rubric scores every screen in. */
export const REVIEW_THEMES = ["light", "dark"] as const satisfies readonly ReviewTheme[];

/**
 * Leaves the walkthrough closed, wherever the run left this person.
 *
 * The guided setup auto-starts on an authenticated render and routes the page to the step it is
 * on, so a spec that wants a particular screen has to put it aside first or it will be carried
 * somewhere else. Which control does that depends on where the previous spec left them: a panel
 * that opened itself carries "Not now", and a setup already dismissed has no panel at all, so it
 * is reopened from the help menu and dismissed from a known step. Measured on 2026-09-20: without
 * this, the change-password spec spent its whole timeout on step 5 of somebody else's walkthrough.
 */
export async function putTheWalkthroughAside(page: Page): Promise<void> {
  const notNow = page.getByRole("button", { name: "Not now" });
  await notNow.waitFor({ state: "visible", timeout: 15_000 }).catch(async () => {
    await restartGuidedSetup(page);
  });
  /**
   * Dismissing is a write, and the next page load reads it back.
   *
   * "Not now" closes the panel in the browser and posts the new progress; a navigation that
   * overtakes that post reads the old progress and opens the walkthrough again, on the step it was
   * on, and carries the page away from wherever the spec was going. Measured on 2026-09-20: the
   * change-password spec spent its whole timeout on somebody else's step 5 because of exactly this
   * race, and passed on the runs where the post happened to land first. Waiting for the answer is
   * what makes it land first every time.
   *
   * The race itself is closed in the product as of PRD-006d's named-state review, F-23: the panel
   * now stays open until its own write has landed. This wait stays anyway. It costs nothing, it is
   * what makes this helper's promise ("the walkthrough is aside and stored") true rather than
   * likely, and a test that stopped asserting the thing the product now guarantees would stop
   * noticing if the guarantee were ever taken back.
   */
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/setup/progress") && response.request().method() === "POST",
    { timeout: 15_000 },
  );
  await notNow.click();
  await saved;
  await expect(page.getByRole("dialog")).toBeHidden();
}

/** The result block the create screen renders once the checks have run. */
const SAVED_RESULT_SELECTOR = 'section[aria-labelledby="campaign-check-title"]';

/**
 * How long the result block may still be moving before this helper gives up waiting on it.
 *
 * Giving up is not failing. The control the spec is about to act on is what decides whether the
 * screen is usable, and its own actionability check reports that better than a wait here could.
 * This bound exists so that a screen which never settles is reported by the click rather than by a
 * helper that sat in `page.evaluate` until the test's whole timeout was gone.
 */
const SETTLE_DEADLINE_MS = 10_000;

/**
 * Waits for the screen a save produced to stop moving before a spec presses anything on it.
 *
 * "Ready for approval" appearing says the checks have run. It does not say the page has finished
 * rendering, and for a while it did not even say the page was staying: the walkthrough used to
 * reopen itself on a save and route the browser to the campaign, which took the result block and
 * its "Open campaign" link away about 200 ms after they appeared (`guided-setup-provider.tsx`,
 * `reportCampaignSaved`). Playwright resolved the link, began its visible-enabled-stable check,
 * and the element was detached underneath it; on the `ubuntu-24.04` runner that cost
 * `review-campaign-decision.spec.ts` three 15-minute timeouts on 2026-09-20 while every local run
 * won the same race.
 *
 * The product no longer does that. This wait stays anyway, for the reason the dismissal wait above
 * stays: it costs a frame or two, it makes "the result is on screen and still" true rather than
 * likely, and a person reading a result before pressing a link on it is exactly what it models.
 */
export async function waitForTheSavedResultToSettle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    async ([selector, deadlineText]) =>
      await new Promise<void>((resolve) => {
        const block = document.querySelector(String(selector));
        if (block === null) {
          resolve();
          return;
        }
        const giveUpAt = Date.now() + Number(deadlineText);
        let moved = false;
        const observer = new MutationObserver(() => {
          moved = true;
        });
        observer.observe(block, { attributes: true, childList: true, subtree: true });
        // Two frames with nothing recorded between them is the same stillness Playwright's own
        // actionability check looks for, asked for before the click rather than during it.
        const settledOrNot = () => {
          if (moved && Date.now() < giveUpAt) {
            moved = false;
            requestAnimationFrame(() => requestAnimationFrame(settledOrNot));
            return;
          }
          observer.disconnect();
          resolve();
        };
        requestAnimationFrame(() => requestAnimationFrame(settledOrNot));
      }),
    [SAVED_RESULT_SELECTOR, String(SETTLE_DEADLINE_MS)] as const,
  );
}

/**
 * Inside a session the theme is chosen the way a person chooses it, from the control in the header,
 * because that is the only way to change it without reloading the page and losing the state the
 * spec just reached.
 */
export async function chooseThemeFromTheHeader(page: Page, theme: ReviewTheme): Promise<void> {
  await page.getByRole("radio", { name: theme === "light" ? "Light" : "Dark" }).click();
  await expectThemeResolved(page, theme);
  // The segmented control moves its fill over `--motion-base`; sampling before it settles reads a
  // blended pair that exists for a moment and is not a token.
  await page.waitForTimeout(400);
}
