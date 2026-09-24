import { expect, test, type Page } from "@playwright/test";

import {
  captureNamedState,
  REVIEW_FRAMES,
  settleForScreenshot,
} from "../helpers/design-quality.js";
import { READY_OPEN_HOUSE, fillTheOpenHouseDraft } from "../helpers/open-house-draft.js";
import {
  continueToPanel,
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  pointThePanelAtTheSubmitControl,
  restartGuidedSetup,
  saveTheCampaign,
  seededCredentials,
  signInExisting,
  signUpFreshAccount,
  walkToTheCreateStep,
} from "./helpers/guided-setup-journey.js";
import {
  chooseThemeFromTheHeader,
  putTheWalkthroughAside,
  REVIEW_THEMES,
} from "./helpers/review-session.js";

/**
 * PRD-006d D3 and D8, for the five guided-setup steps nothing photographed.
 *
 * `design-quality.spec.ts` takes steps 1 and 2 at 1440 and 768. Steps 3 through 7 were scored by
 * eye and never captured, because reaching them needs the whole journey: a saved campaign, a
 * person who can approve it, and a person who cannot. They are taken here, at all four frames in
 * both themes, with the same four checks every other named state gets.
 *
 * **Nothing writes progress into the database.** Every state below is reached by walking the
 * walkthrough with the controls a person uses. A spec that inserted a `guided_setup.v1` row to
 * land on step 6 would photograph a screen the product can never reach, which is the opposite of
 * a review.
 *
 * **Why this file runs where it does.** Playwright orders a project's files by path, and
 * `guided-setup.walkthrough-captures` sorts after every other `guided-setup.*` spec and before
 * both `review-*` files. It saves a campaign against the seeded creator, and PRD-006c's specs walk
 * that same person from the start of their setup: running after them is what keeps this file out
 * of their way, the same rule `review-campaign-decision.spec.ts` already follows.
 *
 * **Why the theme is chosen and not reloaded.** Every state here is state the panel holds in the
 * browser. A reload would lose it and the journey would have to be walked twice. The header's own
 * Light and Dark control changes the theme without a navigation, so one journey gives both themes.
 *
 * **One sign-up.** Step 6 has two branches and they belong to two different people: a workspace
 * owner is offered the approve control, and everybody else is offered the hand-off link. The
 * seeded creator cannot approve, so they give the hand-off branch with no sign-up at all; the
 * approve branch needs an owner, and the only owner this composition can make is a self-serve
 * account, so the spec creates exactly one. With F-22's reductions a run now spends six of the
 * product's ten sign-ups an hour
 * (`apps/web/src/server/password-authentication-handler.ts:118`) on accounts and two more on the
 * sign-up refusal state, which leaves two in hand.
 */

/** The panel's own dialog, whatever step it is on. */
function panel(page: Page) {
  return page.getByRole("dialog");
}

/**
 * The step has finished scrolling for this frame.
 *
 * The walkthrough scrolls the page when a step attaches and again whenever the frame or the
 * layout around the element changes. Measured on 2026-09-21: the runner's comparison of step 6
 * at 1440 caught the picture between the attach and that later scroll, with the approve card
 * still under the panel, and a wait on the element's geometry proved wrong at step 5, whose
 * element is taller than the space beside the panel by design (the model keeps its top). So the
 * capture asks the step to settle for the frame it is in (a resize is a placement change) and
 * then waits for the scroll position to hold still for six frames, which is what the picture
 * needs: the same scroll every time, taken after the last movement.
 */
async function expectStepHasSettled(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        // From a canonical start: the element at the top of the frame, under the header, so the
        // step's own scroll decides the final position from the same place every time. Without
        // this the model answers zero for an element that is already clear, and where it is clear
        // depends on what the layout did between the attach and the picture (measured on
        // 2026-09-21: the runner's step 6 at 1440 differed from its baseline by the height the
        // header gained when its font arrived).
        const highlighted = document.querySelector("[data-guided-setup-highlight='true']");
        if (highlighted === null) {
          // A step that points at nothing on the page (step 7 is anchored to its own panel)
          // scrolls nothing itself, so the frame would hold whatever the previous step left and
          // whatever the browser's clamp did to it when the page's length changed: the room the
          // panel reserves below the content follows the panel's measured size, which arrives
          // after the step opens. Measured on 2026-09-21: the runner's step 7 at 1440 sat 426
          // pixels below its baseline, at the very end of the page. The top of the page is the
          // one start that does not depend on the page's length.
          window.scrollTo({ behavior: "instant", top: 0 });
        } else {
          highlighted.scrollIntoView({ behavior: "instant", block: "start" });
        }
        window.dispatchEvent(new Event("resize"));
        const started = performance.now();
        let last = window.scrollY;
        let still = 0;
        const tick = (): void => {
          if (window.scrollY === last) {
            still += 1;
          } else {
            still = 0;
            last = window.scrollY;
          }
          if (still >= 6) {
            resolve();
            return;
          }
          if (performance.now() - started > 10_000) {
            reject(new Error("the walkthrough kept scrolling for ten seconds"));
            return;
          }
          window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      }),
  );
}

/**
 * One step, at all four frames, in both themes.
 *
 * The capture is of the viewport rather than the whole page. The panel is a fixed layer placed
 * from measurements against the element it is pointing at, so what a person sees is the frame with
 * the panel in it; a full-page picture of a tall create screen would put the panel somewhere in
 * the middle of an image mostly made of form. Steps 1 and 2 are captured the same way.
 */
async function captureStep(page: Page, state: string): Promise<void> {
  for (const theme of REVIEW_THEMES) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await chooseThemeFromTheHeader(page, theme);
    await expect(panel(page)).toBeVisible();
    await expectStepHasSettled(page);
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await settleForScreenshot(page, { keepScroll: true });
      // Switching to the docked mobile sheet changes both the rail and the header.
      // A valid scroll position from the tablet frame is not a canonical mobile
      // capture position. Reset only this boundary, then let the product place its
      // highlighted element; all the existing screenshots and assertions remain.
      if (frame.width < 768) await expectStepHasSettled(page);
      await captureNamedState(page, {
        screen: "guided-setup",
        state,
        theme,
        frames: [frame],
        fullPage: false,
        keepScroll: true,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

test("the guided setup's steps 3 through 7 meet the bar on the approver's path", async ({
  page,
}) => {
  // One journey of seven steps with deliberate typing, forty screenshots, and two themes.
  /**
   * Wave 7m. A budget, not a place to hang.
   *
   * 900 seconds was three times what the whole review suite takes, so a test that stopped
   * making progress sat there until the retries were spent: on 2026-09-20 one detached click
   * in `review-campaign-decision.spec.ts` cost 45 minutes of a 57.7-minute run. Every budget
   * here is now the measured duration with room on top. Measured on 2026-09-20 against the
   * review composition with the processor throttled 4x, which is slower than the `ubuntu-24.04`
   * runner's own numbers for the same tests: 132 s here, 90 s on the runner.
   */
  test.setTimeout(300_000);
  const guard = await guardLocalOrigin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUpFreshAccount(page, freshEmail());

  // Steps 1 and 2 are already captured by `design-quality.spec.ts`; they are walked, not
  // photographed again.
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(page.getByRole("dialog", { name: "Your details" })).toBeVisible();
  await continueToPanel(page, "Your Realtor partner");

  await captureStep(page, "step-3-your-realtor-partner");

  await page.getByLabel("Realtor's name").fill("Priya Nadeem");
  await continueToPanel(page, "Create the Open House Boost");
  await page.waitForURL("**/marketing/campaigns/new");

  /**
   * PRD-006c D3's step 4 points at one field at a time, so it has two pictures rather than one:
   * the first field it asks for and the last. The panel moves along
   * `steps/step-model.ts`'s `CAMPAIGN_FIELD_SEQUENCE`, and the last entry is the submit control,
   * where Continue stops moving.
   */
  await captureStep(page, "step-4-create-the-campaign-first-field");

  // The draft is filled while the panel is still pointing at the first field, which is both the
  // order a person works in and the order the other review specs have already proven safe: the
  // panel sits beside the top of the form, not over the controls further down it.
  await fillTheOpenHouseDraft(page, READY_OPEN_HOUSE);

  // The last entry in the sequence is the submit control itself, and the highlight attribute goes
  // on the anchored element, so the helper's assertion is the picture's own claim: the panel is
  // pointing at "Save and run the checks" rather than at a field somewhere behind it.
  await pointThePanelAtTheSubmitControl(page);
  await captureStep(page, "step-4-create-the-campaign-last-field");

  await page.getByRole("button", { name: "Save and run the checks" }).click();
  // The walkthrough moving to step 5 is the signal that the checks have run and the campaign has
  // its own page; a URL glob is not, because `**/marketing/campaigns/**` also matches the create
  // screen this click started on.
  await expect(page.getByRole("dialog", { name: "Read the result" })).toBeVisible();
  await page.waitForURL(/\/marketing\/campaigns\/(?!new$)[^/]+$/u);
  await captureStep(page, "step-5-read-the-result");

  await continueToPanel(page, "Approve, or hand it to an approver");
  const approveStep = page.getByRole("dialog", { name: "Approve, or hand it to an approver" });
  // A self-serve account is its own workspace owner, so this is the approve branch of D3's step 6.
  await expect(approveStep).toContainText("Choose Approve this version.");
  await captureStep(page, "step-6-approve");

  await continueToPanel(page, "What happens next");
  await captureStep(page, "step-7-what-happens-next");

  // Finishing is what the step is for, and it leaves this account's setup completed rather than
  // half-walked.
  await page.getByRole("button", { name: "Done" }).click();
  await expect(panel(page)).toBeHidden();

  expectNoExternalRequests(guard);
});

test("the guided setup's step 6 meets the bar on the hand-off path", async ({ page }) => {
  /**
   * Wave 7m. A budget, not a place to hang.
   *
   * 900 seconds was three times what the whole review suite takes, so a test that stopped
   * making progress sat there until the retries were spent: on 2026-09-20 one detached click
   * in `review-campaign-decision.spec.ts` cost 45 minutes of a 57.7-minute run. Every budget
   * here is now the measured duration with room on top. Measured on 2026-09-20 against the
   * review composition with the processor throttled 4x, which is slower than the `ubuntu-24.04`
   * runner's own numbers for the same tests: 53.7 s here, 41.4 s on the runner.
   */
  test.setTimeout(240_000);
  const guard = await guardLocalOrigin(page);
  const { creatorEmail, password } = seededCredentials();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, creatorEmail, password);

  // The seeded creator's progress survives the run, so they are put back to step 1 with the
  // control a person would use, exactly as every other spec about them does.
  await restartGuidedSetup(page);
  await walkToTheCreateStep(page);
  await saveTheCampaign(page, "7 Marigold Court, Austin");

  await expect(page.getByRole("dialog", { name: "Read the result" })).toBeVisible();
  await continueToPanel(page, "Approve, or hand it to an approver");
  const handOffStep = page.getByRole("dialog", { name: "Approve, or hand it to an approver" });
  await expect(handOffStep).toContainText("Only an approver or your workspace owner can approve.");
  await captureStep(page, "step-6-hand-off");

  await putTheWalkthroughAside(page);
  expectNoExternalRequests(guard);
});
