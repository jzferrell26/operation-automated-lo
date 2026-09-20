import { expect, test, type Browser } from "@playwright/test";

import { FINISHED_OPEN_HOUSE } from "../helpers/open-house-draft.js";
import {
  NEW_ACCOUNT_NAME,
  NEW_ACCOUNT_PASSWORD,
  STEP_ARRIVES_TIMEOUT_MS,
  continueToPanel,
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  restartGuidedSetup,
  saveTheCampaign,
  seededCredentials,
  signInExisting,
  signUpFreshAccount,
  typeIntoLabel,
  walkToTheCreateStep,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-006c 006C-AC-007, 006C-AC-008, and 006C-AC-009. What the walkthrough does when the user
 * leaves it.
 *
 * Each case uses browser contexts of its own, because the point of storing progress on the server
 * is that it survives the browser. A test that reused one context would pass on in-memory state
 * and prove nothing about the row.
 */

async function freshPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const guard = await guardLocalOrigin(page);
  return { context, guard, page };
}

test("progress survives a closed browser, a dismissal, and a restart", async ({ browser }) => {
  const email = freshEmail();

  // Reach step 3, then close the browser without pressing anything else.
  const first = await freshPage(browser);
  await signUpFreshAccount(first.page, email);
  await first.page.getByRole("button", { name: "Let's go" }).click();
  await expect(first.page.getByRole("dialog", { name: "Your details" })).toBeVisible();
  await continueToPanel(first.page, "Your Realtor partner");
  expectNoExternalRequests(first.guard);
  await first.context.close();

  // A new context and a new sign-in: the walkthrough resumes where it was, and the details the
  // second step saved are still there.
  const second = await freshPage(browser);
  await signInExisting(second.page, email, NEW_ACCOUNT_PASSWORD);
  await expect(second.page.getByRole("dialog", { name: "Your Realtor partner" })).toBeVisible();

  // "Not now" dismisses without losing what was typed, and the chip appears in the shell.
  await typeIntoLabel(second.page, "Realtor's name", "Priya Nadeem");
  await second.page.getByRole("button", { name: "Not now" }).click();
  await expect(second.page.getByRole("dialog")).toBeHidden();
  const chip = second.page.getByRole("button", { name: "Finish setup" });
  await expect(chip).toBeVisible();

  // The chip reopens the same step, and the typing is still there.
  await chip.click();
  await expect(second.page.getByRole("dialog", { name: "Your Realtor partner" })).toBeVisible();
  await expect(second.page.getByLabel("Realtor's name")).toHaveValue("Priya Nadeem");
  expectNoExternalRequests(second.guard);
  await second.context.close();

  // A third context: still at step 3, because a dismissal keeps the position. "Show me around
  // again" then restarts at step 1 with the details already saved.
  const third = await freshPage(browser);
  await signInExisting(third.page, email, NEW_ACCOUNT_PASSWORD);
  await expect(third.page.getByRole("dialog", { name: "Your Realtor partner" })).toBeVisible();
  await third.page.getByRole("button", { name: "Not now" }).click();
  // The panel goes away before the help menu is opened, which is both what a person sees and what
  // makes the two presses separate acts. Pressing Help while the dismissal was still travelling
  // used to end with the panel the restart opened being closed by the dismissal settling behind
  // it, and the "Let's go" below timing out on an element that had been detached. That race is
  // closed in the provider now; waiting here is what a person does either way.
  await expect(third.page.getByRole("dialog")).toBeHidden();
  await third.page.getByRole("button", { name: "Help" }).click();
  await third.page.getByRole("button", { name: "Show me around again" }).click();
  await expect(
    third.page.getByRole("dialog", { name: "Let's set up your first Open House Boost" }),
  ).toBeVisible();
  await third.page.getByRole("button", { name: "Let's go" }).click();
  await expect(third.page.getByLabel("Your name")).toHaveValue(NEW_ACCOUNT_NAME);
  expectNoExternalRequests(third.guard);
  await third.context.close();
});

/**
 * PRD-006c D3 step 5, and the user-facing defect the PRD-006c verifier found on 2026-09-20.
 *
 * Step 5 used to read its result out of the browser session that pressed "Save and run the
 * checks". A person who closed the tab and signed in again had no result in memory, so the panel
 * had no findings and chose the ready sentence: a campaign the checks had blocked was described
 * as saved and ready for approval, on the page that was saying the opposite underneath it.
 *
 * The second context is the whole assertion. Nothing of the save survives it, so whatever step 5
 * says on the other side of it can only have come from the server.
 *
 * It uses the seeded creator rather than a fresh account because the product allows ten sign-ups
 * an hour per address (`apps/web/src/server/password-authentication-handler.ts:118`) and this run
 * already spends six of them; the two people the gate seeds exist for exactly this.
 */
test("a resumed result step says a campaign the checks refused needs changes", async ({
  browser,
}) => {
  const { creatorEmail, password } = seededCredentials();

  const first = await freshPage(browser);
  await signInExisting(first.page, creatorEmail, password);
  await restartGuidedSetup(first.page);
  await walkToTheCreateStep(first.page);
  // An open house that finished years ago is the product's own refusal, not an invented one.
  await saveTheCampaign(first.page, "3 Foxglove Way, Austin", FINISHED_OPEN_HOUSE);
  await expect(first.page.getByRole("dialog", { name: "Read the result" })).toContainText(
    "the checks found things to fix first",
  );
  expectNoExternalRequests(first.guard);
  await first.context.close();

  const second = await freshPage(browser);
  await signInExisting(second.page, creatorEmail, password);
  const resumed = second.page.getByRole("dialog", { name: "Read the result" });
  await expect(resumed).toBeVisible({ timeout: STEP_ARRIVES_TIMEOUT_MS });
  await expect(resumed).toContainText("the checks found things to fix first");
  await expect(resumed).toContainText("The open-house dates are expired or out of order.");
  await expect(resumed).not.toContainText("ready for approval");
  // The rule's own code belongs to the campaign page's collapsed support region, never the panel.
  await expect(resumed).not.toContainText("OPEN_HOUSE_DATES_INVALID");
  expectNoExternalRequests(second.guard);
  await second.context.close();
});

test("a completed setup never opens itself again", async ({ browser }) => {
  const email = freshEmail();
  const first = await freshPage(browser);
  await signUpFreshAccount(first.page, email);
  await walkToTheCreateStep(first.page);
  await saveTheCampaign(first.page, "9 Juniper Road, Austin");

  await expect(first.page.getByRole("dialog", { name: "Read the result" })).toBeVisible();
  await first.page.getByRole("button", { name: "Continue" }).click();
  await expect(
    first.page.getByRole("dialog", { name: "Approve, or hand it to an approver" }),
  ).toBeVisible();
  await first.page.getByRole("button", { name: "Continue" }).click();
  await expect(first.page.getByRole("dialog", { name: "What happens next" })).toBeVisible();
  await first.page.getByRole("button", { name: "Done" }).click();
  await expect(first.page.getByRole("dialog")).toBeHidden();
  expectNoExternalRequests(first.guard);
  await first.context.close();

  // A finished setup does not reopen, and offers no chip: the way back is the help menu.
  const second = await freshPage(browser);
  await signInExisting(second.page, email, NEW_ACCOUNT_PASSWORD);
  await expect(second.page.getByRole("dialog")).toBeHidden();
  await expect(second.page.getByRole("button", { name: "Finish setup" })).toBeHidden();
  await expect(second.page.getByRole("button", { name: "Help" })).toBeVisible();
  expectNoExternalRequests(second.guard);
  await second.context.close();
});
