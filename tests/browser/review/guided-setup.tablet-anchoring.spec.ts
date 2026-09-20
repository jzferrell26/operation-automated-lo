import { expect, test, type Page } from "@playwright/test";

import {
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  restartGuidedSetup,
  signUpFreshAccount,
  walkToTheCreateStep,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-006c 006C-AC-013 and D7. Where the panel sits at each frame.
 *
 * Three claims, one per frame:
 *
 * - At 390 the panel is a bottom sheet, capped at 40 percent of the viewport, and the field being
 *   edited is above it rather than under it.
 * - At 768 and above the panel anchors beside the element it points at when there is room, and
 *   below it when there is not.
 * - At every frame the panel stays clear of the shell's sticky header.
 *
 * A panel that covers the field is the single failure that makes a walkthrough useless, and it is
 * a failure that only appears at one width, which is why it gets a spec of its own.
 *
 * **One account, three frames.** PRD-006d's named-state review, F-22: this file used to create a
 * fresh account per frame, three of the product's ten sign-ups an hour
 * (`apps/web/src/server/password-authentication-handler.ts:118`), and between this file and the
 * other three the review run spent the whole budget on itself. What the spec is about is where the
 * panel lands at three widths, not three people. The account is created once, and "Show me around
 * again" walks the same person back to step 4 for each frame. Every assertion below is the one it
 * was, asserted at the same three widths, and each carries its frame in the failure message so a
 * failure still says which width broke.
 */

const MOBILE = { width: 390, height: 844 } as const;
const TABLET = { width: 768, height: 1024 } as const;
const DESKTOP = { width: 1180, height: 900 } as const;

/**
 * The panel, and the first control inside the element it is pointing at. The control rather than
 * the whole group, because a group can be taller than the space above a bottom sheet and what has
 * to stay visible is the thing the user is about to type into.
 */
async function boxes(page: Page) {
  const highlighted = page.locator("[data-guided-setup-highlight='true']").first();
  // Assert first, so a step that points at nothing fails with a name rather than hanging in
  // `boundingBox` until the whole test times out.
  await expect(highlighted).toBeVisible({ timeout: 15_000 });
  const control = highlighted.locator("input, select, textarea, button, a[href]").first();
  const panel = await page.getByRole("dialog").boundingBox();
  const field = await ((await control.count()) > 0 ? control : highlighted).boundingBox();
  expect(panel).not.toBeNull();
  expect(field).not.toBeNull();
  return {
    field: field as NonNullable<typeof field>,
    panel: panel as NonNullable<typeof panel>,
  };
}

/** The claim that holds at 768 and above: beside the element, or below it, never over it. */
async function expectAnchoredBesideOrBelow(page: Page, width: number): Promise<void> {
  const { field, panel } = await boxes(page);
  const beside = panel.x >= field.x + field.width - 1;
  const below = panel.y >= field.y + field.height - 1;
  expect(beside || below, `at ${String(width)} the panel is beside the element or below it`).toBe(
    true,
  );

  // The sticky header is the one surface a panel must never sit under, because the brief's focus
  // ring has to stay visible and the header scrolls with the page.
  const header = await page.getByRole("banner").boundingBox();
  if (header !== null) {
    expect(
      panel.y,
      `at ${String(width)} the panel clears the sticky header`,
    ).toBeGreaterThanOrEqual(header.y + header.height - 1);
  }
}

test("the panel anchors correctly at the mobile, tablet, and embedded frames", async ({ page }) => {
  // Three walks to step 4 with deliberate typing, in one test rather than three.
  /**
   * Wave 7m. A budget, not a place to hang.
   *
   * 900 seconds was three times what the whole review suite takes, so a test that stopped
   * making progress sat there until the retries were spent: on 2026-09-20 one detached click
   * in `review-campaign-decision.spec.ts` cost 45 minutes of a 57.7-minute run. Every budget
   * here is now the measured duration with room on top. Measured on 2026-09-20 against the
   * review composition with the processor throttled 4x, which is slower than the `ubuntu-24.04`
   * runner's own numbers for the same tests: 36.2 s here, 28.6 s on the runner.
   */
  test.setTimeout(240_000);
  const guard = await guardLocalOrigin(page);

  await page.setViewportSize(MOBILE);
  await signUpFreshAccount(page, freshEmail());
  await walkToTheCreateStep(page);

  const { field, panel } = await boxes(page);
  expect(
    panel.height,
    "the bottom sheet is capped at 40 percent of the viewport",
  ).toBeLessThanOrEqual(MOBILE.height * 0.4 + 1);
  expect(
    Math.round(panel.y + panel.height),
    "the sheet sits on the bottom edge",
  ).toBeGreaterThanOrEqual(MOBILE.height - 2);
  expect(field.y + field.height, "the field is above the sheet").toBeLessThanOrEqual(panel.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  for (const frame of [TABLET, DESKTOP] as const) {
    await page.setViewportSize(frame);
    await restartGuidedSetup(page);
    await walkToTheCreateStep(page);

    await expectAnchoredBesideOrBelow(page, frame.width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `at ${String(frame.width)} the document does not scroll sideways`,
    ).toBe(true);
  }

  expectNoExternalRequests(guard);
});
