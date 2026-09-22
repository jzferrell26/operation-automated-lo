import { expect, test } from "@playwright/test";

import { captureNamedState } from "../helpers/design-quality.js";
import { READY_OPEN_HOUSE, fillTheOpenHouseDraft } from "../helpers/open-house-draft.js";
import {
  expectNoExternalRequests,
  guardLocalOrigin,
  restartGuidedSetup,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";
import {
  chooseThemeFromTheHeader,
  putTheWalkthroughAside,
  REVIEW_THEMES,
  waitForTheSavedResultToSettle,
} from "./helpers/review-session.js";

/**
 * PRD-006d D3's campaign-detail decision state, in a file of its own so that it runs last.
 *
 * Playwright orders a project's files by path, and this one sorts after every `guided-setup.*`
 * spec. That is the point. This is the one spec in the review run that leaves a campaign against
 * the seeded creator and a recorded decision against the seeded approver, and PRD-006c's specs walk
 * those same two people from the beginning of their setup. Measured on 2026-09-19: with this spec
 * sharing `design-quality.spec.ts`, which sorts first, `guided-setup.hand-off.spec.ts` failed
 * intermittently on a step that would not advance. Running last means nothing PRD-006c owns starts
 * after it.
 */

/**
 * PRD-006d D3's campaign-detail decision states, in the project that can actually reach them.
 *
 * They are not synthetic states. Synthetic mode's principal holds `campaign_creator`
 * (`apps/web/src/server/authenticated-principal.ts:210-224`), and `campaignMayBeApprovedBy`
 * (`packages/application/src/campaign-workspace-read.ts:110-119`) needs an approval role, so a
 * synthetic deployment can never render an approved campaign. The seeded approver can, so the
 * approved and already-decided pictures come from the review project and the permission-restricted
 * one, which is exactly what a creator sees, comes from the synthetic project.
 *
 * It takes two people, and that is the product rather than the test being awkward. The seeded
 * approver's own navigation reports Marketing Suite as "No access", so they cannot write a
 * campaign; the seeded creator can write one and cannot approve it. Measured on 2026-09-19, when a
 * one-session version of this spec sat on step 4 of the walkthrough with a preflight the approver
 * was refused. So the creator writes it and the approver decides on it, which is also the shape
 * PRD-006c's hand-off spec proves.
 *
 * Neither person signs up. Two sign-ins against a limit of twenty in fifteen minutes is affordable;
 * a sign-up is not, for the reason recorded above the public states.
 */
test("the campaign detail's already-decided state meets the bar", async ({ browser }) => {
  // Three named states, two themes, four frames each, with axe at every cell. F-18 added two of
  // the three, so the budget moved with them.
  /**
   * Wave 7m. A budget, not a place to hang.
   *
   * 900 seconds was three times what the whole review suite takes, so this test's detached click
   * sat there until the retries were spent: 45 minutes of a 57.7-minute run on 2026-09-20. The
   * budget is now the measured duration with room on top. Measured on 2026-09-20 against the
   * review composition with the processor throttled 4x, which is slower than the `ubuntu-24.04`
   * runner: 84 s.
   */
  test.setTimeout(300_000);
  const { approverEmail, creatorEmail, password } = seededCredentials();

  const creatorContext = await browser.newContext();
  const creatorPage = await creatorContext.newPage();
  const creatorGuard = await guardLocalOrigin(creatorPage);
  await creatorPage.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(creatorPage, creatorEmail, password);
  /**
   * The walkthrough goes aside rather than being walked, and that is the whole reason this spec
   * leaves PRD-006c's specs alone.
   *
   * An earlier version walked the seeded creator to step 4 and saved from inside the panel. It
   * worked, and then `guided-setup.hand-off.spec.ts`, which walks the same person from step 1,
   * failed on 2026-09-19 at a Continue that did not advance. This spec needs one campaign, not a
   * journey; the journey belongs to the specs written to measure it. Restarting and dismissing is
   * what the change-password test above already does, and the run has proven it safe.
   */
  await restartGuidedSetup(creatorPage);
  await putTheWalkthroughAside(creatorPage);
  await creatorPage.goto("/marketing/campaigns/new");
  await fillTheOpenHouseDraft(creatorPage, READY_OPEN_HOUSE);
  await creatorPage.getByRole("button", { name: "Save and run the checks" }).click();
  await expect(creatorPage.getByRole("heading", { name: "Ready for approval" })).toBeVisible();
  // The heading says the checks have run; this says the result has finished arriving. A person
  // reads what came back before pressing the link on it, and a click that starts while the block
  // is still settling is a click that can be overtaken by the next render.
  await waitForTheSavedResultToSettle(creatorPage);
  await creatorPage.getByRole("link", { name: "Open campaign" }).click();
  await creatorPage.waitForURL(/\/marketing\/campaigns\/(?!new$)[^/]+$/u);
  const campaignUrl = creatorPage.url();
  expectNoExternalRequests(creatorGuard);
  await creatorContext.close();

  const approverContext = await browser.newContext();
  const page = await approverContext.newPage();
  const guard = await guardLocalOrigin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, approverEmail, password);
  // The approver's own walkthrough is in the way of the link they were sent, so they put it aside
  // first, exactly as a person would.
  await restartGuidedSetup(page);
  await putTheWalkthroughAside(page);
  await page.goto(campaignUrl);

  /**
   * PRD-006d D3's two remaining campaign-detail states, which F-18 unblocked.
   *
   * Until 2026-09-20 neither could be photographed. While the page still holds the version it
   * arrived with, the screen carries "Send back for changes", and that control was a raw
   * `<button>` wearing `.hint` from `open-house-draft-builder.module.css` instead of the `Button`
   * primitive: 152 by 21, measured by `expectTargetsAreLargeEnough` on 2026-09-19, against the 44
   * by 44 design brief section 14 and WCAG 2.2 SC 2.5.8 ask for. Capturing either state would have
   * meant a red gate or a weakened target-size check. The control is now the primitive, so both
   * states are taken here with every check at full strength.
   *
   * `ready` is what an approver sees before they decide, so it is taken first, in both themes,
   * while the decision is still ahead of them.
   */
  for (const theme of REVIEW_THEMES) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(campaignUrl);
    await chooseThemeFromTheHeader(page, theme);
    await expect(page.getByRole("button", { name: "Approve this version" })).toBeEnabled();
    await captureNamedState(page, { screen: "campaign-detail", state: "ready", theme });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Approve this version" }).click();
  await page.getByRole("button", { name: "Yes, approve" }).click();
  await expect(page.getByText("Approved.", { exact: false }).first()).toBeVisible();

  /**
   * `approved` is the moment after the decision and before the next load: the page still holds the
   * version it arrived with, and the only thing that has changed is what the screen says back. The
   * theme is chosen from the header rather than by reloading, because a reload is exactly the
   * thing this state is defined as being before.
   */
  for (const theme of REVIEW_THEMES) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await chooseThemeFromTheHeader(page, theme);
    await captureNamedState(page, { screen: "campaign-detail", state: "approved", theme });
  }

  for (const theme of REVIEW_THEMES) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(campaignUrl);
    await chooseThemeFromTheHeader(page, theme);
    // The decision is now the server's, so the screen carries the "Who signed off" region and the
    // control is blocked against a version somebody has already decided on.
    const signedOff = page.getByRole("region", { name: "Who signed off" });
    await expect(signedOff).toBeVisible();
    await captureNamedState(page, {
      screen: "campaign-detail",
      state: "already-decided",
      theme,
      // The moment the decision was recorded is a fact about this run, not about the design. It is
      // the last paragraph in the region; the first is the "Approval" eyebrow, which is copy.
      mask: [signedOff.locator("p").last()],
    });
  }

  expectNoExternalRequests(guard);
  await approverContext.close();
});
