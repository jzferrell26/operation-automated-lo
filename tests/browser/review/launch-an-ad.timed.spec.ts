import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { SAMPLE_ADS, adCard, placeChips } from "../helpers/launch-an-ad.js";
import {
  JourneyClock,
  NEW_ACCOUNT_COMPANY,
  NEW_ACCOUNT_NAME,
  NEW_ACCOUNT_PASSWORD,
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  printTimingBlock,
  readLikeAPerson,
  shouldWriteEvidence,
  typeIntoLabel,
  writeTimingEvidence,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-009g, 009G-AC-008, replacing `guided-setup.timed.spec.ts` (PRD-006c 006C-AC-015), which
 * PRD-009b deleted with the walkthrough. The owner's five minutes, measured again.
 *
 * One browser context, one fresh account, and the whole journey from the sign-up page's first paint
 * to an approved version through "Launch an ad". The typing model is PRD-006c D9's and is unchanged:
 * every value is typed one character at a time at 200 ms, and every screen gets a four-second
 * reading pause before the person acts on it, so what this asserts is a first-time loan officer's
 * time and not a machine's.
 *
 * The journey is the one PRD-009 designs for a person who has just signed up. Home's checklist says
 * the brand is the first thing to add, so the person opens it, types the two NMLS numbers and a
 * title, and saves both cards. Then Home again, "Choose an ad", one ad, the area typed once, "Save
 * and check", and "Approve this version" with its confirmation. A self-serve account owns its
 * workspace, so it is the approve branch. Launching is off in PRD-009 and the journey does not
 * touch it.
 *
 * The ceiling is `CEILING_SECONDS` of the old spec, kept. The step budgets are not asserted one by
 * one: they are the table's "Budget" column, so a reader can see which step moved, and each step's
 * verdict is printed with it. The total is asserted, and so is the account step, because
 * 006A-AC-033's evidence was that row and the sign-up screen has not changed.
 *
 * **Sign-ups.** One, in this test, which is the sixth of the eight the review run spends. The count
 * is at the top of `empty-account.spec.ts`.
 *
 * **The numbers.** They are printed to the log in a labelled block on every run, and written to
 * `docs/operations/evidence-packs/guided-setup-timing.md` only under
 * `OALO_REGENERATE_UI_EVIDENCE=true`, so an ordinary run never rewrites a committed file. The pull
 * request records the total.
 */

const BUDGETS: Readonly<Record<string, number>> = Object.freeze({
  "0. Create your account": 30,
  "1. Home": 10,
  "2. Brand": 50,
  "3. Choose an ad": 25,
  "4. Set it up": 35,
  "5. Review and approve": 20,
});

const CEILING_SECONDS = 300;

function headCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

test("a first-time loan officer reaches an approved ad inside five minutes", async ({ page }) => {
  test.setTimeout(360_000);
  const guard = await guardLocalOrigin(page);
  const clock = new JourneyClock();
  const email = freshEmail();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Step 0, PRD-006a. The five minutes start at the sign-up page's first paint.
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

  // Step 1. Home is the first page, and it asks for one thing first: the brand.
  await expect(page.getByRole("heading", { level: 1, name: "Launch an ad" })).toBeVisible();
  await readLikeAPerson(page);
  await page
    .getByRole("region", { name: "Get set up" })
    .getByRole("link", { name: "Add your brand details" })
    .click();
  await page.waitForURL("**/brand");
  clock.mark("1. Home");

  // Step 2. The brand: the two NMLS numbers and a title, then both cards saved.
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
  await readLikeAPerson(page);
  await typeIntoLabel(page, "Your NMLS number", "1234567");
  await typeIntoLabel(page, "Company NMLS number", "7654321");
  await main.getByRole("button", { name: "Save your details", exact: true }).click();
  await expect(main.getByText("Your changes are saved.").first()).toBeVisible();
  await typeIntoLabel(page, "Title on your ads", "Loan officer");
  await main.getByRole("button", { name: "Save ad settings", exact: true }).click();
  await expect(main.getByText("Your changes are saved.")).toHaveCount(2);
  clock.mark("2. Brand");

  // Step 3. Back to Home, "Choose an ad", and one ad: step 1 of "Launch an ad".
  await page.getByRole("banner").getByRole("link", { name: "Home", exact: true }).click();
  await page.waitForURL("**/overview");
  await readLikeAPerson(page);
  await page
    .getByRole("region", { name: "Launch an ad" })
    .getByRole("link", { name: "Choose an ad", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeVisible();
  await readLikeAPerson(page);
  await adCard(page, SAMPLE_ADS.firstHome)
    .getByRole("button", { name: /^Use this ad/u })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
  clock.mark("3. Choose an ad");

  // Step 4. Set it up: the area is the one thing typed, and the checks run on "Save and check".
  await readLikeAPerson(page);
  await typeIntoLabel(page, "Add a city or state", "Austin, TX");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(placeChips(page)).toHaveCount(1);
  await page.getByRole("button", { name: "Save and check" }).click();
  await page.waitForURL(/[?&]step=3(?:&|$)/u, { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Review and launch" })).toBeVisible();
  clock.mark("4. Set it up");

  // Step 5. Review and approve. The checks passed, so the approve control is the one on offer.
  const review = page.locator("[data-launch-step='3']");
  await expect(review).toHaveAttribute("data-review-state", "ready");
  await readLikeAPerson(page);
  await review.getByRole("button", { name: "Approve this version" }).click();
  await review.getByRole("button", { name: "Yes, approve" }).click();
  await expect(review.getByText("Approved by", { exact: false })).toBeVisible({ timeout: 30_000 });
  clock.mark("5. Review and approve");
  // Launching stays off whatever was approved (009D-AC-016).
  await expect(review.getByRole("button", { name: "Launch on Facebook" })).toBeDisabled();

  const evidence = {
    budgets: BUDGETS,
    ceilingSeconds: CEILING_SECONDS,
    commit: headCommit(),
    timings: clock.timings,
    totalSeconds: clock.totalSeconds,
  } as const;
  // The block is printed before anything is asserted, so a run that fails its ceiling still shows
  // the numbers that failed it.
  printTimingBlock(evidence);
  test.info().annotations.push({
    type: "launch-an-ad-total-seconds",
    description: evidence.totalSeconds.toFixed(1),
  });
  if (shouldWriteEvidence) writeTimingEvidence(evidence);

  expect(
    evidence.totalSeconds,
    `The whole journey took ${evidence.totalSeconds.toFixed(1)} s against a ${String(CEILING_SECONDS)} s ceiling`,
  ).toBeLessThan(CEILING_SECONDS);
  // 006A-AC-033. Sign-up plus the first authenticated render, inside the same run.
  expect(signUpSeconds, "account creation against its budget").toBeLessThanOrEqual(
    BUDGETS["0. Create your account"] ?? 0,
  );
  expectNoExternalRequests(guard);
});
