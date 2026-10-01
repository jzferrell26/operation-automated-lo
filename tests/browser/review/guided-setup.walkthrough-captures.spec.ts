import { expect, test, type Page } from "@playwright/test";

import {
  captureNamedState,
  expectNothingShowsBelowThePanelFooter,
  REVIEW_FRAMES,
  settleForScreenshot,
} from "../helpers/design-quality.js";
import {
  FINISHED_OPEN_HOUSE,
  READY_OPEN_HOUSE,
  fillTheOpenHouseDraft,
} from "../helpers/open-house-draft.js";
import {
  continueToPanel,
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  letTheStepPlaceItself,
  pointThePanelAtTheSubmitControl,
  restartGuidedSetup,
  runTheChecksFromTheWalkthrough,
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
 * `design-quality.spec.ts` takes steps 1 and 2 at all four frames. Steps 3 through 7 were scored by
 * eye and never captured, because reaching them needs the whole journey: a saved campaign, a
 * person who can approve it, and a person who cannot. They are taken here, at all four frames in
 * both themes, with the same four checks every other named state gets. So is step 5's second
 * answer, the one a campaign the checks refuse gets (PRD-008d, S-3).
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
    await letTheStepPlaceItself(page);
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await settleForScreenshot(page, { keepScroll: true });
      // Switching to the docked mobile sheet changes both the rail and the header.
      // A valid scroll position from the tablet frame is not a canonical mobile
      // capture position. Reset only this boundary, then let the product place its
      // highlighted element; all the existing screenshots and assertions remain.
      if (frame.width < 768) await letTheStepPlaceItself(page);
      await expectNothingShowsBelowThePanelFooter(page, frame);
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

test("the guided setup's steps 3 through 7, and step 5's refusal, meet the bar on the approver's path", async ({
  page,
}) => {
  // One journey of seven steps with deliberate typing, forty screenshots, and two themes, then a
  // second walk to step 5 for eight more.
  /**
   * Wave 7m. A budget, not a place to hang.
   *
   * 900 seconds was three times what the whole review suite takes, so a test that stopped
   * making progress sat there until the retries were spent: on 2026-09-20 one detached click
   * in `review-campaign-decision.spec.ts` cost 45 minutes of a 57.7-minute run. Every budget
   * here is now the measured duration with room on top. Measured on 2026-09-20 against the
   * review composition with the processor throttled 4x, which is slower than the `ubuntu-24.04`
   * runner's own numbers for the same tests: 132 s here, 90 s on the runner.
   *
   * PRD-008d added the second walk. Measured on 2026-10-01 in the review composition on a Windows
   * workstation: the first journey alone took 66 s and the second walk about 25 s, so the budget
   * grows by the same proportion.
   */
  test.setTimeout(420_000);
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

  /**
   * PRD-008d 008D-AC-007, S-3: step 5's needs-changes answer, the sign-off's "Guided setup step 5,
   * read the result, needs changes" row.
   *
   * The journey above saves a campaign the checks accept, because that is the journey PRD-006c
   * D3's budget is written against, so it photographs step 5's ready answer only. The other answer
   * needs a draft the checks refuse, and the refusal is the product's own: an open house that
   * finished years ago is the blocking finding `OPEN_HOUSE_DATES_INVALID`
   * (`tests/browser/helpers/open-house-draft.ts`), the one rule this draft fails. Everything else in
   * it is the draft the ready picture saved.
   *
   * It is the same person, walked again from step 1 with the control a person uses to start over,
   * and saved from inside the walkthrough. That is deliberate twice over. The two step-5 pictures
   * then differ by the answer and not by the workspace or the page behind it. And it costs the run
   * no sign-in: a separate case for it signed the seeded creator in once more, and on 2026-10-01
   * that was the twenty-first sign-in from this address inside fifteen minutes
   * (`AUTH_RATE_LIMITS.sign_in_ip`), so the last spec in the run was refused "Too many attempts".
   *
   * The answer is asserted in words before anything is photographed, because the picture is only
   * compared on the runner that drew it: the needs-changes sentence, the finding's own description,
   * and no ready sentence anywhere in the panel.
   */
  await restartGuidedSetup(page);
  await walkToTheCreateStep(page);
  await fillTheOpenHouseDraft(page, FINISHED_OPEN_HOUSE);
  await runTheChecksFromTheWalkthrough(page);

  const refusedResult = page.getByRole("dialog", { name: "Read the result" });
  await expect(refusedResult).toContainText("the checks found things to fix first");
  await expect(refusedResult).toContainText("The open-house dates are expired or out of order.");
  await expect(refusedResult).not.toContainText("ready for approval");
  await captureStep(page, "step-5-read-the-result-needs-changes");

  await putTheWalkthroughAside(page);
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
