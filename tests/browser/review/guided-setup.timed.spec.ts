import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

import {
  JourneyClock,
  NEW_ACCOUNT_COMPANY,
  NEW_ACCOUNT_NAME,
  NEW_ACCOUNT_PASSWORD,
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  readLikeAPerson,
  STEP_ARRIVES_TIMEOUT_MS,
  shouldWriteEvidence,
  typeIntoLabel,
  writeTimingEvidence,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-006c 006C-AC-015 and 006A-AC-033. The owner's five minutes, measured.
 *
 * One browser context, one fresh account, and the whole journey from the sign-up page's first
 * paint to the last step's Done. Every value is typed one character at a time and every screen
 * gets a reading pause, so what this asserts is a first-time loan officer's time and not a
 * machine's.
 *
 * A step over its D3 budget fails the run. That is deliberate: a budget that only produced a
 * number in a report would be a number somebody writes down and nobody fixes.
 */

const BUDGETS: Readonly<Record<string, number>> = Object.freeze({
  "0. Create your account": 30,
  "1. Welcome": 10,
  "2. Your details": 40,
  "3. Your Realtor partner": 30,
  "4. Create the Open House Boost": 90,
  "5. Read the result": 20,
  "6. Approve": 20,
  "7. What happens next": 10,
});

const CEILING_SECONDS = 300;

function headCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * The panel a step arrives on.
 *
 * The wait is `STEP_ARRIVES_TIMEOUT_MS`, not Playwright's five seconds, and it does not soften
 * what this spec measures: the clock is marked after the panel is on screen, so a step that really
 * took too long still fails its own budget below, which is the failure worth reading. What the
 * longer wait removes is the other failure, where a save that had not answered inside five seconds
 * was reported as a panel that did not exist. Measured on 2026-09-20: step 4's submit was still
 * reading "Running the checks" when this assertion gave up.
 */
async function panelTitled(page: Page, title: string) {
  const panel = page.getByRole("dialog", { name: title });
  await expect(panel).toBeVisible({ timeout: STEP_ARRIVES_TIMEOUT_MS });
  return panel;
}

test("a first-time loan officer reaches a saved, approved campaign inside five minutes", async ({
  page,
}) => {
  const guard = await guardLocalOrigin(page);
  const clock = new JourneyClock();
  const email = freshEmail();

  // Step 0, PRD-006a. The five minutes start at account creation, so the clock starts here.
  await page.goto("/sign-up");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  clock.restart();
  await readLikeAPerson(page);
  await typeIntoLabel(page, "Your name", NEW_ACCOUNT_NAME);
  await typeIntoLabel(page, "Email", email);
  await typeIntoLabel(page, "Password", NEW_ACCOUNT_PASSWORD);
  await typeIntoLabel(page, "Company", NEW_ACCOUNT_COMPANY);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/overview");
  const signUpSeconds = clock.mark("0. Create your account");

  // Step 1. 006C-AC-005: the welcome step is in the first render, with no click.
  const welcome = await panelTitled(page, "Let's set up your first Open House Boost");
  await expect(welcome).toContainText("It takes about three minutes.");
  await readLikeAPerson(page);
  await page.getByRole("button", { name: "Let's go" }).click();
  clock.mark("1. Welcome");

  // Step 2. The name is already there from sign-up, so only the rest is typed.
  await panelTitled(page, "Your details");
  await expect(page.getByLabel("Your name")).toHaveValue(NEW_ACCOUNT_NAME);
  await readLikeAPerson(page);
  await typeIntoLabel(page, "NMLS number", "1465666");
  await typeIntoLabel(page, "Phone", "5550134");
  await page.getByRole("button", { name: "Continue" }).click();
  clock.mark("2. Your details");

  // Step 3.
  await panelTitled(page, "Your Realtor partner");
  await readLikeAPerson(page);
  await typeIntoLabel(page, "Realtor's name", "Priya Nadeem");
  await typeIntoLabel(page, "Brokerage", "Nadeem and Co");
  await page.getByRole("button", { name: "Continue" }).click();
  clock.mark("3. Your Realtor partner");

  // Step 4. The walkthrough takes the user to the create screen and points at each field.
  await page.waitForURL("**/marketing/campaigns/new");
  await panelTitled(page, "Create the Open House Boost");
  // D3's prefill rule: the Realtor's name came from the profile, and no demo default is on screen.
  await expect(page.getByLabel("Realtor name")).toHaveValue("Priya Nadeem");
  await expect(page.locator("body")).not.toContainText("123 Main Street, Dallas");
  await expect(page.locator("body")).not.toContainText("Jordan Smith");
  await readLikeAPerson(page);
  await typeIntoLabel(page, "Property address", "48 Cedar Street, Austin");
  await typeIntoLabel(page, "State", "TX");
  await typeIntoLabel(page, "Property description", "A three-bedroom home near the park.");
  await page.getByLabel("Open house starts").fill("2026-10-03T13:00");
  await page.getByLabel("Open house ends").fill("2026-10-03T15:00");
  await page.getByLabel("I have permission to market this property.").check();
  await page.getByLabel("I have permission to use the Realtor's materials.").check();
  await typeIntoLabel(page, "Where the ad runs", "Austin metro");
  await page.getByRole("button", { name: "Save and run the checks" }).click();

  // Step 5. The walkthrough follows the saved campaign to its own page. The step is finished when
  // that page and its panel are on screen, not when the address changes: the create screen's own
  // address already matches a campaigns glob, and timing against it would measure a click.
  await panelTitled(page, "Read the result");
  await page.waitForURL(/\/marketing\/campaigns\/(?!new$)[^/]+$/u);
  clock.mark("4. Create the Open House Boost");
  await readLikeAPerson(page);
  await page.getByRole("button", { name: "Continue" }).click();
  clock.mark("5. Read the result");

  // Step 6. A self-serve account owns its workspace, so this is the approve branch.
  await panelTitled(page, "Approve, or hand it to an approver");
  await readLikeAPerson(page);
  await page.getByRole("button", { name: "Approve this version" }).click();
  await page.getByRole("button", { name: "Yes, approve" }).click();
  await expect(page.getByText("Approved.", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  clock.mark("6. Approve");

  // Step 7. 006C-AC-018: the closing statement names all three accounts and offers nothing.
  const done = await panelTitled(page, "What happens next");
  await expect(done).toContainText("It won't run as an ad yet");
  await expect(done).toContainText("HighLevel, Meta, and Stripe aren't connected.");
  await readLikeAPerson(page);
  await page.getByRole("button", { name: "Done" }).click();
  clock.mark("7. What happens next");
  await expect(page.getByRole("dialog")).toBeHidden();

  const totalSeconds = clock.totalSeconds;
  for (const timing of clock.timings) {
    const budget = BUDGETS[timing.step];
    expect(budget, timing.step).toBeDefined();
    expect(
      timing.seconds,
      `${timing.step} took ${timing.seconds.toFixed(1)} s against a ${String(budget)} s budget`,
    ).toBeLessThanOrEqual(budget ?? 0);
  }
  expect(
    totalSeconds,
    `The whole journey took ${totalSeconds.toFixed(1)} s against a ${String(CEILING_SECONDS)} s ceiling`,
  ).toBeLessThanOrEqual(CEILING_SECONDS);
  // 006A-AC-033. Sign-up plus the first sign-in, inside the same run.
  expect(signUpSeconds).toBeLessThanOrEqual(BUDGETS["0. Create your account"] ?? 0);

  if (shouldWriteEvidence) {
    writeTimingEvidence({
      budgets: BUDGETS,
      ceilingSeconds: CEILING_SECONDS,
      commit: headCommit(),
      timings: clock.timings,
      totalSeconds,
    });
  }
  expectNoExternalRequests(guard);
});
