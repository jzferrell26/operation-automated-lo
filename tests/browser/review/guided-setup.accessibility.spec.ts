import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  continueToPanel,
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  restartGuidedSetup,
  signUpFreshAccount,
  typeIntoLabel,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-006c 006C-AC-011 and 006C-AC-012. Every step, both themes, both frames.
 *
 * The matrix is the existing browser gate's, applied to the walkthrough: axe with zero violations,
 * zero animations and zero non-zero transitions under `prefers-reduced-motion: reduce`, and every
 * control at least 44 by 44. The steps are walked once per cell rather than screenshotted from one
 * pass, because a panel that is fine at 1180 and broken at 390 is exactly the defect this catches.
 *
 * **One account, four cells.** PRD-006d's named-state review, F-22: this file used to create a
 * fresh account per cell, which is four of the product's ten sign-ups an hour
 * (`apps/web/src/server/password-authentication-handler.ts:118`) spent by one spec, and the four
 * specs together spent the whole budget, so nothing else in the run could reach a sign-up state at
 * all. The matrix is about the panel at four sizes, not about four people: the account is created
 * once and "Show me around again" puts the same person back at step 1 between cells, which is the
 * control a real person uses and the one `restartGuidedSetup` already exercises elsewhere. Every
 * assertion is the one it was, run the same number of times.
 */

const FRAMES = [
  { width: 1180, height: 900 },
  { width: 390, height: 844 },
] as const;

const THEMES = ["Light", "Dark"] as const;

async function chooseTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
  await page.getByRole("radio", { name: theme }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme.toLowerCase());
}

async function assertAxeClean(page: Page, where: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    `${where}\n${results.violations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`)
      .join("\n")}`,
  ).toEqual([]);
}

/** The gate's own reduced-motion assertion, pointed at the walkthrough's layer. */
async function assertNoMotion(page: Page, where: string): Promise<void> {
  const animated = await page
    .locator("[data-guided-setup-layer='true'] *, [data-guided-setup-highlight='true']")
    .evaluateAll((elements) =>
      elements
        .map((element) => ({
          animation: getComputedStyle(element).animationName,
          transition: getComputedStyle(element).transitionDuration,
        }))
        .filter(
          ({ animation, transition }) =>
            animation !== "none" || !/^0(?:s|ms)(?:, 0(?:s|ms))*$/u.test(transition),
        ),
    );
  expect(animated, where).toEqual([]);
}

async function assertTargetSizes(page: Page, where: string): Promise<void> {
  const undersized = await page
    .locator("[data-guided-setup-layer='true'] :is(button, a[href], [role='button']):visible")
    .evaluateAll((elements) =>
      elements
        .map((element) => ({
          name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "unnamed",
          rect: element.getBoundingClientRect().toJSON(),
        }))
        .filter(({ rect }) => rect.width < 44 || rect.height < 44),
    );
  expect(undersized, where).toEqual([]);
}

/**
 * D7's real promise: the panel never covers the field the user is being asked to fill in. The
 * check is against the first control inside the anchored element rather than the whole group,
 * because a group can be taller than the space above a bottom sheet and the part that has to stay
 * visible is the control, not the legend above it.
 */
async function assertPanelClearOfTheField(page: Page, where: string): Promise<void> {
  const highlighted = page.locator("[data-guided-setup-highlight='true']").first();
  // Every step that names a page element must end up pointing at it. The allowance is generous
  // because the element can arrive with a later render on a cold server; what is not allowed is
  // the step never finding it.
  //
  // Wave 7m named the cell in the failure. Four cells run the same assertions, so "the ring is
  // missing" without a theme and a frame beside it costs a run to find out which one; on
  // 2026-09-20 it took a rerun to learn that a failure of this line was "Light 390x844" at step 4.
  await expect(highlighted, where).toBeVisible({ timeout: 15_000 });
  const control = highlighted.locator("input, select, textarea, button, a[href]").first();
  const target = (await control.count()) > 0 ? control : highlighted;
  const panelBox = await page.getByRole("dialog").boundingBox();
  const targetBox = await target.boundingBox();
  if (panelBox === null || targetBox === null) return;
  const overlaps =
    panelBox.x < targetBox.x + targetBox.width &&
    panelBox.x + panelBox.width > targetBox.x &&
    panelBox.y < targetBox.y + targetBox.height &&
    panelBox.y + panelBox.height > targetBox.y;
  expect(overlaps, `${where}: the panel covers the field it is pointing at`).toBe(false);
}

/**
 * Walks the steps and checks the whole contract at each one. The walk stops at the create screen,
 * because steps 5 through 7 need a saved campaign and the timed run already proves those; the
 * contract asserted here is about the panel, which is the same component at every step.
 */
type Checkpoint = Readonly<{
  step: string;
  /**
   * Whether the step points at something on the page. Steps 2 and 3 collect their fields inside
   * the panel, so there is nothing on the page to highlight and nothing for the panel to cover.
   */
  pointsAtPage: boolean;
  advance: () => Promise<void>;
}>;

async function walkAndAssert(page: Page, where: string): Promise<void> {
  const checkpoints: readonly Checkpoint[] = [
    {
      step: "1. Welcome",
      pointsAtPage: true,
      advance: async () => {
        await page.getByRole("button", { name: "Let's go" }).click();
      },
    },
    {
      step: "2. Your details",
      pointsAtPage: false,
      advance: async () => {
        await continueToPanel(page, "Your Realtor partner");
      },
    },
    {
      step: "3. Your Realtor partner",
      pointsAtPage: false,
      advance: async () => {
        // Emptied first: on the second cell this account's profile already holds the name, and
        // typing into a prefilled field appends.
        await page.getByLabel("Realtor's name").fill("");
        await typeIntoLabel(page, "Realtor's name", "Priya Nadeem");
        await continueToPanel(page, "Create the Open House Boost");
        await page.waitForURL("**/marketing/campaigns/new");
      },
    },
    { step: "4. Create the Open House Boost", pointsAtPage: true, advance: async () => undefined },
  ];

  for (const checkpoint of checkpoints) {
    const label = `${where} ${checkpoint.step}`;
    await expect(page.getByRole("dialog")).toBeVisible();
    /**
     * A step that changes route hands axe a document the new route has not finished describing
     * yet, and axe reports "Documents must have a `title` element" against a transition rather
     * than against a screen. Measured on 2026-09-20 at step 4, which is the step that moves the
     * user to the create screen. The route sets the title, so waiting for one is waiting for the
     * screen this checkpoint is about.
     */
    await expect(page, label).toHaveTitle(/\S/u);
    await assertAxeClean(page, label);
    await assertNoMotion(page, label);
    await assertTargetSizes(page, label);
    if (checkpoint.pointsAtPage) await assertPanelClearOfTheField(page, label);
    await checkpoint.advance();
  }
}

test("every step is accessible in both themes at the mobile and embedded frames", async ({
  page,
}) => {
  // Four walks of the first four steps, with deliberate typing, in one test rather than four. The
  // work is the same work; only the three sign-ups it used to spend are gone.
  /**
   * Wave 7m. A budget, not a place to hang.
   *
   * 900 seconds was three times what the whole review suite takes, so a test that stopped
   * making progress sat there until the retries were spent: on 2026-09-20 one detached click
   * in `review-campaign-decision.spec.ts` cost 45 minutes of a 57.7-minute run. Every budget
   * here is now the measured duration with room on top. Measured on 2026-09-20 against the
   * review composition with the processor throttled 4x, which is slower than the `ubuntu-24.04`
   * runner's own numbers for the same tests: 90 s here, 54.8 s on the runner.
   */
  test.setTimeout(300_000);
  const guard = await guardLocalOrigin(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(FRAMES[0]);
  await signUpFreshAccount(page, freshEmail());

  let first = true;
  for (const frame of FRAMES) {
    for (const theme of THEMES) {
      await page.setViewportSize(frame);
      // The account arrives at step 1 already. Every cell after the first finds the walkthrough
      // wherever the previous cell left it, so the same person starts it again the way a person
      // would.
      if (!first) await restartGuidedSetup(page);
      first = false;
      await chooseTheme(page, theme);
      await walkAndAssert(page, `${theme} ${String(frame.width)}x${String(frame.height)}`);
    }
  }

  expectNoExternalRequests(guard);
});
