import { expect, test, type Browser } from "@playwright/test";

import {
  NEW_ACCOUNT_NAME,
  NEW_ACCOUNT_PASSWORD,
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  saveTheCampaign,
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
  await first.page.getByRole("button", { name: "Continue" }).click();
  await expect(first.page.getByRole("dialog", { name: "Your Realtor partner" })).toBeVisible();
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
