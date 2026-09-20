import { expect, test, type Page } from "@playwright/test";

import { captureNamedState } from "../helpers/design-quality.js";
import {
  expectNoExternalRequests,
  guardLocalOrigin,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";
import {
  chooseThemeFromTheHeader,
  putTheWalkthroughAside,
  REVIEW_THEMES,
} from "./helpers/review-session.js";

/**
 * PRD-006d D3's saved change-password state, in the last file the review run executes.
 *
 * This is the only spec in the run that changes a seeded person's password, and a password is the
 * one piece of shared state a run cannot recover from on its own: every spec that signs in as the
 * seeded creator needs the gate's password to still be the gate's password. The change is made
 * once, the eight cells are captured from that one result, and the restore runs in a `finally`.
 *
 * A `finally` is not enough on its own, which is why this file also sorts last. Measured on
 * 2026-09-20: the review server went away mid-test when another run took its port, the test hit its
 * own timeout, and a timed-out test runs no `finally` at all. Sharing a file with the shell states
 * that would have left the seeded password changed for every spec after it. Running last means the
 * worst case costs this spec and nothing else.
 *
 * The restore is then proved rather than assumed: a fresh context signs in with the gate's
 * password, so a restore that silently failed is a failure here with a name, not a puzzle in
 * whatever runs next.
 */

const THROWAWAY_NEW_PASSWORD = "copper meadow signal verse";

async function saveANewPassword(page: Page, current: string, next: string): Promise<void> {
  await page.getByLabel("Current password", { exact: true }).fill(current);
  await page.getByLabel("New password", { exact: true }).fill(next);
  await page.getByLabel("Confirm new password", { exact: true }).fill(next);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("form").getByRole("status")).toContainText("password is updated");
}

test("the change-password screen's saved state meets the bar", async ({ browser }) => {
  test.setTimeout(300_000);
  const { creatorEmail, password } = seededCredentials();

  const context = await browser.newContext();
  const page = await context.newPage();
  const guard = await guardLocalOrigin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, creatorEmail, password);
  // The spec before this one leaves the creator's walkthrough open on step 5, and an open
  // walkthrough routes the page to its own step rather than to the account screen.
  await putTheWalkthroughAside(page);
  await page.goto("/settings/account");
  // Asserted rather than assumed: if the walkthrough took the page somewhere else, this says so in
  // a second instead of spending the timeout filling fields that are not on screen.
  await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();

  try {
    await saveANewPassword(page, password, THROWAWAY_NEW_PASSWORD);
    for (const theme of REVIEW_THEMES) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await chooseThemeFromTheHeader(page, theme);
      await captureNamedState(page, { screen: "change-password", state: "saved", theme });
    }
  } finally {
    await page.setViewportSize({ width: 1440, height: 900 });
    await saveANewPassword(page, THROWAWAY_NEW_PASSWORD, password);
  }

  expectNoExternalRequests(guard);
  await context.close();

  const proof = await browser.newContext();
  const proofPage = await proof.newPage();
  const proofGuard = await guardLocalOrigin(proofPage);
  await proofPage.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(proofPage, creatorEmail, password);
  expectNoExternalRequests(proofGuard);
  await proof.close();
});
