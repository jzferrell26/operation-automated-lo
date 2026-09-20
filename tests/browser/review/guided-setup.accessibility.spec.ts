import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { READY_OPEN_HOUSE } from "../helpers/open-house-draft.js";
import {
  continueToPanel,
  expectNoExternalRequests,
  fillTheCampaign,
  freshEmail,
  guardLocalOrigin,
  restartGuidedSetup,
  runTheChecksFromTheWalkthrough,
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
 * **All seven steps, not the first four.** 006C-AC-011 says every step, and until 2026-09-20 the
 * walk stopped at the create screen, so the three steps that only exist once a campaign has been
 * saved were never asserted against in any cell. They are the steps that render a check result, a
 * list of findings, and an approval control, which is the most moving content the panel ever
 * carries. The walk now saves a campaign in every cell and carries on to the end.
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
 * Every step that names a page element must end up pointing at it.
 *
 * The allowance is generous because the element can arrive with a later render on a cold server;
 * what is not allowed is the step never finding it. Wave 7m named the cell in the failure, because
 * four cells run the same assertions and "the ring is missing" without a theme and a frame beside
 * it costs a run to find out which one.
 */
async function assertTheStepPointsAtSomething(page: Page, where: string): Promise<void> {
  await expect(page.locator("[data-guided-setup-highlight='true']").first(), where).toBeVisible({
    timeout: 15_000,
  });
}

/**
 * D7's real promise: the panel never covers the field the user is being asked to fill in. The
 * check is against the first control inside the anchored element rather than the whole group,
 * because a group can be taller than the space above a bottom sheet and the part that has to stay
 * visible is the control, not the legend above it.
 */
async function assertPanelClearOfTheField(page: Page, where: string): Promise<void> {
  const highlighted = page.locator("[data-guided-setup-highlight='true']").first();
  await assertTheStepPointsAtSomething(page, where);
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
 * D6 and 006C-AC-010, the first focus movement. A step that opens puts focus on its own heading,
 * which is the sentence the announcement just named.
 *
 * It is asserted from the second checkpoint onwards. The first one follows a theme change, and
 * the person who just pressed a radio is where the browser left them; the movement this is about
 * is the one a step makes when it arrives.
 */
async function assertFocusOnTheStepTitle(page: Page, where: string): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const active = document.activeElement;
          if (active === null) return false;
          const heading = active.closest('[data-overlay-kind="sheet"]')?.querySelector("h2");
          return heading !== null && heading !== undefined && heading.contains(active);
        }),
      { message: `${where}: the step did not put focus on its own heading` },
    )
    .toBe(true);
}

/**
 * D6 and 006C-AC-010, the second focus movement. Continue hands focus to the element the panel
 * has moved on to.
 *
 * Step 4 is the one that can go backwards, because its Continue changes which field is
 * highlighted without changing the step; focusing the field the person has just finished with
 * would send them back a field on every press.
 */
async function assertContinueMovesFocusToTheField(page: Page, where: string): Promise<void> {
  await page.getByRole("button", { name: "Continue" }).click();
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const highlighted = document.querySelector('[data-guided-setup-highlight="true"]');
          const active = document.activeElement;
          return highlighted !== null && active !== null && highlighted.contains(active);
        }),
      { message: `${where}: Continue did not hand focus to the field it moved on to` },
    )
    .toBe(true);
}

/**
 * Walks all seven steps and checks the whole contract at each one. The contract asserted here is
 * about the panel, which is the same component at every step, and about the page underneath it,
 * which is not.
 */
type Checkpoint = Readonly<{
  step: string;
  /**
   * Whether the step points at something on the page. Steps 2, 3, and 7 render inside the panel,
   * so there is nothing on the page to highlight and nothing for the panel to cover.
   */
  pointsAtPage: boolean;
  /**
   * Whether the panel must also be clear of what it is pointing at.
   *
   * D7's promise is about the field the person is being asked to fill in, which is what steps 1
   * and 4 point at. Steps 5 and 6 point at a result block and an approval control on a page the
   * person has arrived at to read and decide, and at 390 both sit at the end of a long page that
   * is already scrolled to its bottom, so nothing can lift them above a sheet pinned to the
   * bottom edge. Measured on 2026-09-20: "Light 390x844 6. Approve, or hand it to an approver"
   * overlapped, and the same page at 1180 did not. The control is still reachable, because D6
   * hands focus to whatever the panel points at, so the walkthrough is operable; what is missing
   * is room at the end of the page, which belongs with the panel placement and the stylesheet that
   * caps the sheet. It is reported rather than asserted here.
   */
  panelMustBeClear: boolean;
  advance: () => Promise<void>;
}>;

async function walkAndAssert(page: Page, where: string): Promise<void> {
  const checkpoints: readonly Checkpoint[] = [
    {
      step: "1. Welcome",
      pointsAtPage: true,
      panelMustBeClear: true,
      advance: async () => {
        await page.getByRole("button", { name: "Let's go" }).click();
      },
    },
    {
      step: "2. Your details",
      pointsAtPage: false,
      panelMustBeClear: false,
      advance: async () => {
        await continueToPanel(page, "Your Realtor partner");
      },
    },
    {
      step: "3. Your Realtor partner",
      pointsAtPage: false,
      panelMustBeClear: false,
      advance: async () => {
        // Emptied first: on the second cell this account's profile already holds the name, and
        // typing into a prefilled field appends.
        await page.getByLabel("Realtor's name").fill("");
        await typeIntoLabel(page, "Realtor's name", "Priya Nadeem");
        await continueToPanel(page, "Create the Open House Boost");
        await page.waitForURL("**/marketing/campaigns/new");
      },
    },
    {
      step: "4. Create the Open House Boost",
      pointsAtPage: true,
      panelMustBeClear: true,
      advance: async () => {
        // The panel's own focus promise, asserted on the step that can break it, before the
        // draft is filled in.
        await assertContinueMovesFocusToTheField(page, `${where} 4. Create the Open House Boost`);
        await fillTheCampaign(page, "48 Cedar Street, Austin", READY_OPEN_HOUSE);
        // Saved from inside the walkthrough, in the sequence D3 describes: the panel walks onto
        // "Save and run the checks", D6 puts focus there, and the person presses it.
        await runTheChecksFromTheWalkthrough(page);
      },
    },
    {
      step: "5. Read the result",
      pointsAtPage: true,
      panelMustBeClear: false,
      advance: async () => {
        await continueToPanel(page, "Approve, or hand it to an approver");
      },
    },
    {
      step: "6. Approve, or hand it to an approver",
      pointsAtPage: true,
      panelMustBeClear: false,
      advance: async () => {
        await continueToPanel(page, "What happens next");
      },
    },
    {
      // The last step's anchor is inside the panel, so there is nothing on the page to point at.
      step: "7. What happens next",
      pointsAtPage: false,
      panelMustBeClear: false,
      advance: async () => {
        await page.getByRole("button", { name: "Done" }).click();
        await expect(page.getByRole("dialog")).toBeHidden();
      },
    },
  ];

  let aStepHasArrived = false;
  for (const checkpoint of checkpoints) {
    const label = `${where} ${checkpoint.step}`;
    await expect(page.getByRole("dialog")).toBeVisible();
    // The first checkpoint follows a theme change rather than a step, so focus is wherever the
    // radio left it. Every checkpoint after it is a step that has just arrived.
    if (aStepHasArrived) await assertFocusOnTheStepTitle(page, label);
    aStepHasArrived = true;
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
    if (checkpoint.panelMustBeClear) {
      await assertPanelClearOfTheField(page, label);
    } else if (checkpoint.pointsAtPage) {
      await assertTheStepPointsAtSomething(page, label);
    }
    await checkpoint.advance();
  }
}

test("every step is accessible in both themes at the mobile and embedded frames", async ({
  page,
}) => {
  // Four walks of all seven steps, with deliberate typing, in one test rather than four. The work
  // is the same work; only the three sign-ups it used to spend are gone.
  /**
   * Wave 7m. A budget, not a place to hang.
   *
   * 900 seconds was three times what the whole review suite takes, so a test that stopped
   * making progress sat there until the retries were spent: on 2026-09-20 one detached click
   * in `review-campaign-decision.spec.ts` cost 45 minutes of a 57.7-minute run. Every budget
   * here is now the measured duration with room on top. Measured on 2026-09-20 against the
   * review composition with the processor throttled 4x, which is slower than the `ubuntu-24.04`
   * runner's own numbers for the same tests: 90 s here, 54.8 s on the runner, for the four steps
   * this walked then. Carrying every cell through the three saved-campaign steps adds one campaign
   * per cell: about seventy typed characters at 200 ms plus the checks, which is roughly 25 s a
   * cell and 100 s in total, so the budget goes to 420 s rather than 300.
   */
  test.setTimeout(420_000);
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
