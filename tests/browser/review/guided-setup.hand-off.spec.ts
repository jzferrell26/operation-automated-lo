import { expect, test } from "@playwright/test";

import {
  continueToPanel,
  expectNoExternalRequests,
  guardLocalOrigin,
  restartGuidedSetup,
  saveTheCampaign,
  seededCredentials,
  signInExisting,
  typeIntoLabel,
  walkToTheCreateStep,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-006c 006C-AC-016. The two-person path.
 *
 * The seeded creator cannot approve, so their step 6 is the hand-off branch: the copy-link control
 * on the campaign screen, with a link that works. The seeded approver then walks their own
 * walkthrough, and it takes them to the campaign their colleague is waiting on. Between them they
 * prove the branch the timed run never takes, which is the branch most real workspaces are in.
 *
 * PRD-006c D5: "the approver's journey at step 6 approves the creator's campaign if one exists".
 * Until 2026-09-20 the approver put the walkthrough aside and approved beside it, so the row this
 * spec was named for was never exercised. Their step 3 now hands them straight to the result,
 * because step 4 is "Create the Open House Boost" and their colleague has already done it.
 *
 * Both people walk the guided setup rather than navigating around it, because the walkthrough
 * takes a signed-in user to the step they are on: a spec that went straight to a screen would be
 * sent back, and would be testing a product nobody uses.
 */

test("a creator hands the campaign to an approver, and the approver approves it", async ({
  browser,
}) => {
  // Read inside the test, not at import time: a module-level read would fail the synthetic-mode
  // collection pass, which loads every spec file before deciding which project runs it.
  const { approverEmail, creatorEmail, password } = seededCredentials();

  const creatorContext = await browser.newContext();
  // The clipboard is the hand-off control's whole job, so the run grants it rather than asserting
  // around it.
  await creatorContext.grantPermissions(["clipboard-read", "clipboard-write"]);
  const creatorPage = await creatorContext.newPage();
  const creatorGuard = await guardLocalOrigin(creatorPage);

  await signInExisting(creatorPage, creatorEmail, password);
  await restartGuidedSetup(creatorPage);
  await walkToTheCreateStep(creatorPage);
  const campaignUrl = await saveTheCampaign(creatorPage, "12 Willow Lane, Austin");

  // Step 5, then step 6's hand-off branch.
  await expect(creatorPage.getByRole("dialog", { name: "Read the result" })).toBeVisible();
  await creatorPage.getByRole("button", { name: "Continue" }).click();
  const handOffPanel = creatorPage.getByRole("dialog", {
    name: "Approve, or hand it to an approver",
  });
  await expect(handOffPanel).toBeVisible();
  await expect(handOffPanel).toContainText("Only an approver or your workspace owner can approve.");
  await expect(creatorPage.getByRole("button", { name: "Approve this version" })).toBeDisabled();

  await creatorPage.getByRole("button", { name: "Copy link" }).click();
  await expect(creatorPage.getByText("Link copied.")).toBeVisible();
  const copied = await creatorPage.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(new URL(campaignUrl).pathname);

  expectNoExternalRequests(creatorGuard);
  await creatorContext.close();

  const approverContext = await browser.newContext();
  const approverPage = await approverContext.newPage();
  const approverGuard = await guardLocalOrigin(approverPage);
  await signInExisting(approverPage, approverEmail, password);

  // The walkthrough is restarted first so that this spec starts from the same place on every run.
  // The seeded approver is the same person each time and their progress is stored, so without the
  // restart the second run would find their walkthrough wherever the first one left it.
  await restartGuidedSetup(approverPage);
  await approverPage.getByRole("button", { name: "Let's go" }).click();
  await expect(approverPage.getByRole("dialog", { name: "Your details" })).toBeVisible();
  await continueToPanel(approverPage, "Your Realtor partner");
  // Emptied first: the seeded approver's profile already holds a name from an earlier run of this
  // gate, and typing into a prefilled field appends.
  await approverPage.getByLabel("Realtor's name").fill("");
  await typeIntoLabel(approverPage, "Realtor's name", "Priya Nadeem");

  // D5. Step 4 asks for a campaign that already exists, so the walkthrough hands the approver to
  // the one waiting for them instead of asking them to create a second.
  await continueToPanel(approverPage, "Read the result");
  await approverPage.waitForURL(/\/marketing\/campaigns\/(?!new$)[^/]+$/u);
  expect(new URL(approverPage.url()).pathname).toBe(new URL(campaignUrl).pathname);

  await continueToPanel(approverPage, "Approve, or hand it to an approver");
  const approveStep = approverPage.getByRole("dialog", {
    name: "Approve, or hand it to an approver",
  });
  await expect(approveStep).toContainText("Choose Approve this version.");

  await approverPage.getByRole("button", { name: "Approve this version" }).click();
  await approverPage.getByRole("button", { name: "Yes, approve" }).click();
  // The decision the approval command recorded, said back in the product's own words.
  await expect(
    approverPage.getByText("Approved. This campaign won't run as an ad", { exact: false }).first(),
  ).toBeVisible();

  expectNoExternalRequests(approverGuard);
  await approverContext.close();
});
