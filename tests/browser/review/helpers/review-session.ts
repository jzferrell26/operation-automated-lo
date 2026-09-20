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
