import { expect, test } from "@playwright/test";

import { captureNamedState, expectAxeClean } from "../helpers/design-quality.js";
import { SAMPLE_ADS, saveACampaign, verdictOnStepThree } from "../helpers/launch-an-ad.js";
import {
  expectNoExternalRequests,
  guardLocalOrigin,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";
import { chooseThemeFromTheHeader, REVIEW_THEMES } from "./helpers/review-session.js";
import { saveBrandDetails } from "./helpers/saved-brand.js";

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
 *
 * PRD-009d. The creator saves through "Launch an ad" and lands on step 3, where the hand-off card
 * stands in for the controls they cannot use. They save two campaigns: the approver decides the
 * first on its campaign page, which is where PRD-006d's three pictures come from, and the second on
 * step 3 itself (009D-AC-015). The walkthrough is retired (PRD-009b), so neither person restarts
 * or dismisses it any more.
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
  // The seed saves no Brand, and a library ad carries the creator's own saved NMLS number, so a
  // creator who saved none would read "Needs changes" on step 3 and be shown no hand-off. A real
  // loan officer saves the Brand first (see `saveBrandDetails`).
  await saveBrandDetails(creatorPage);
  const decidedOnItsPage = await saveACampaign(creatorPage, {
    ad: SAMPLE_ADS.firstHome,
    place: "Austin, TX",
  });
  await expect(verdictOnStepThree(creatorPage)).toContainText("Checks passed");
  // A creator cannot approve: step 3 offers the hand-off instead of the controls (009D-AC-015).
  const stepThree = creatorPage.locator("[data-launch-step='3']");
  await expect(stepThree.locator("[data-hand-off]")).toBeVisible();
  await expect(stepThree.getByRole("button", { name: "Copy the link" })).toBeVisible();
  await expect(stepThree.getByRole("button", { name: "Approve this version" })).toHaveCount(0);
  await expect(stepThree.getByRole("button", { name: "Launch on Facebook" })).toBeDisabled();
  const decidedOnStepThree = await saveACampaign(creatorPage, {
    ad: SAMPLE_ADS.preApproval,
    place: "Austin, TX",
  });
  const stepThreeUrl = new URL(creatorPage.url()).pathname + new URL(creatorPage.url()).search;
  const campaignUrl = `/marketing/campaigns/${decidedOnItsPage}`;
  expect(decidedOnStepThree).not.toBe(decidedOnItsPage);
  expectNoExternalRequests(creatorGuard);
  await creatorContext.close();

  const approverContext = await browser.newContext();
  const page = await approverContext.newPage();
  const guard = await guardLocalOrigin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, approverEmail, password);
  await page.goto(campaignUrl);

  /**
   * PRD-006d D3's two remaining campaign-detail states, which F-18 unblocked.
   *
   * Until 2026-09-20 neither could be photographed. While the page still holds the version it
   * arrived with, the screen carries "Send back for changes", and that control was a raw
   * `<button>` wearing `.hint` from the campaign page's stylesheet instead of the `Button`
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
   * PRD-008b 008B-AC-006. The decision replaces the controls with what was recorded and refreshes
   * the page, so this waits for the refreshed page rather than for the card alone.
   *
   * PRD-009e's campaign page: the "Approval" region names who decided and when, the date in a
   * `time` element, and a decided version carries no approve card at all. So once the refresh has
   * landed, the control's own outcome sentence (writing review W-2 and W-28: "Approved. This
   * campaign won't run as an ad yet. Launching isn't turned on, and HighLevel and Meta aren't
   * connected.") is gone with the card, and the region
   * is what says the version was approved. The assertions are scoped to the page's main region.
   */
  const main = page.getByRole("main");
  const decidedNow = page.getByRole("region", { name: "Approval" });
  await expect(decidedNow).toContainText("Approved by", { timeout: 30_000 });
  await expect(decidedNow.locator("time")).toHaveCount(1);
  await expect(decidedNow.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T/u);
  await expect(decidedNow).toContainText("The approval covers this version only.");
  await expect(main.getByText("Ready for approval", { exact: false })).toHaveCount(0);
  await expect(main.getByText("An approver can sign off on it now.", { exact: false })).toHaveCount(
    0,
  );
  await expect(main.getByRole("button", { name: "Approve this version" })).toHaveCount(0);
  await expect(main.getByRole("button", { name: "Send back for changes" })).toHaveCount(0);
  await expect(main.locator("[data-approval-card]")).toHaveCount(0);
  await expect(
    main.getByText(
      "Approved. This campaign won't run as an ad yet. Launching isn't turned on, and HighLevel and Meta aren't connected.",
    ),
  ).toHaveCount(0);

  /**
   * `approved` is the page after the decision landed and the refresh re-read the stored state: the
   * card says what was recorded, and every region around it agrees. The theme is chosen from the
   * header rather than by reloading, because a reload would replace the card with the control a
   * later visitor sees, which is the `already-decided` state below. The moment the decision was
   * recorded is a fact about this run, not about the design, so it is masked as it is there.
   */
  for (const theme of REVIEW_THEMES) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await chooseThemeFromTheHeader(page, theme);
    await captureNamedState(page, {
      screen: "campaign-detail",
      state: "approved",
      theme,
      mask: [decidedNow.locator("time")],
    });
  }

  for (const theme of REVIEW_THEMES) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(campaignUrl);
    await chooseThemeFromTheHeader(page, theme);
    // The decision is now the server's, so the screen carries the "Approval" region with who
    // decided, and no control is offered on a version somebody has already decided on.
    const decided = page.getByRole("region", { name: "Approval" });
    await expect(decided).toContainText("Approved by");
    await expect(
      page.getByRole("main").getByRole("button", { name: "Approve this version" }),
    ).toHaveCount(0);
    await captureNamedState(page, {
      screen: "campaign-detail",
      state: "already-decided",
      theme,
      // The moment the decision was recorded is a fact about this run, not about the design. It is
      // the region's `time` element.
      mask: [decided.locator("time")],
    });
  }

  /**
   * PRD-009d 009D-AC-015 and 016. The second campaign is decided on step 3 itself: the line says
   * what an approval covers, "Approve this version" asks once more, and "Launch on Facebook" is a
   * separate button that stays disabled before and after. A reload re-reads the decision (D8).
   */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(stepThreeUrl);
  const review = page.locator("[data-launch-step='3']");
  await expect(review).toHaveAttribute("data-review-state", "ready");
  await expect(
    review.getByText(
      "Approving applies to this exact version, with your words. Nothing is published or sent.",
    ),
  ).toBeVisible();
  await expect(review.getByRole("button", { name: "Send back for changes" })).toBeVisible();
  const launch = review.getByRole("button", { name: "Launch on Facebook" });
  await expect(launch).toBeDisabled();
  await expectAxeClean(page);
  await review.getByRole("button", { name: "Approve this version" }).click();
  await page.getByRole("button", { name: "Yes, approve" }).click();
  await expect(review.getByText("Approved by", { exact: false })).toBeVisible({ timeout: 30_000 });
  await expect(launch).toBeDisabled();
  await page.reload();
  await expect(page.locator("[data-launch-step='3']")).toHaveAttribute(
    "data-review-state",
    "approved",
  );
  await expect(page.getByRole("button", { name: "Approve this version" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Launch on Facebook" })).toBeDisabled();
  await expectAxeClean(page);

  expectNoExternalRequests(guard);
  await approverContext.close();
});

/**
 * PRD-008b 008B-AC-007 and 008B-AC-008, in the project that can reach them.
 *
 * Both are about what a signed-in person is shown, so they are checked as one, signed in as the
 * seeded creator, who can edit branding. `/brand` has to be the person's own saved branding editor
 * whether or not the homeowner reports flag is set on the server under test, so the assertions
 * read the same in either state and the run does not need to know which one it is in. The demo
 * campaign address has no page in a signed-in workspace.
 *
 * It sits in this file for the reason the file gives: it signs the seeded creator in once more, and
 * running last means nothing PRD-006c owns starts after it.
 */
test("the brand page is the person's own saved branding, and the demo campaign address does not exist", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const { creatorEmail, password } = seededCredentials();
  const context = await browser.newContext();
  const page = await context.newPage();
  const guard = await guardLocalOrigin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, creatorEmail, password);

  await page.goto("/brand", { waitUntil: "networkidle" });
  const main = page.getByRole("main");
  // PRD-009d D3: the page holds the ad brand as well as the report brand, so it is named for both.
  await expect(main.getByRole("heading", { level: 1, name: "Brand" })).toBeVisible();
  await expect(main.getByLabel("Company name", { exact: true })).toBeVisible();
  // What the workspace's demo brand carries, which a signed-in person must never read as their own.
  await expect(main).not.toContainText("Alex Morgan");
  await expect(main).not.toContainText("Prairie Home Lending");

  // A save persists for the same person, and survives a reload.
  const tagline = "Saved from the brand page.";
  await main.getByLabel("Brand tagline", { exact: true }).fill(tagline);
  const response = page.waitForResponse(
    (result) =>
      result.url().endsWith("/api/workspace/preferences") && result.request().method() === "POST",
  );
  await main.getByRole("button", { name: "Save your details", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByText("Your changes are saved.", { exact: true })).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("main").getByLabel("Brand tagline", { exact: true })).toHaveValue(
    tagline,
  );

  // The demo campaign address is not a page here. Next.js may already have streamed a parent
  // loading boundary with a 200, so the document is checked rather than only the status.
  const demo = await page.goto("/marketing/campaigns/synthetic-open-house-001");
  expect([200, 404]).toContain(demo?.status());
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  await expect(page.getByText("This campaign isn't connected yet")).toHaveCount(0);

  expectNoExternalRequests(guard);
  await context.close();
});
