import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { EARLIER_FLOW_LINE } from "../../../apps/web/src/copy/campaign-page-messages.js";
import { settleTheLibrary } from "../helpers/ads-library.js";
import {
  REVIEW_FRAMES,
  captureNamedState,
  expectKeyboardReachesEveryControl,
  expectThemeResolved,
  expectZeroMotionUnderReducedMotion,
  settleForScreenshot,
} from "../helpers/design-quality.js";
import {
  RATE_CLAIM_HEADLINE,
  SAMPLE_ADS,
  campaignRefOf,
  saveACampaign,
} from "../helpers/launch-an-ad.js";
import {
  expectEachConnectionStatedOnce,
  readConnectionStatements,
} from "../helpers/state-it-once.js";
import { approveByKeyboard, launchAnAdFromHomeByKeyboard } from "../helpers/keyboard-journey.js";
import { expectFocusClearsTheStickyBar } from "../helpers/sticky-bar.js";
import {
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  seededCredentials,
  signInExisting,
  signUpFreshAccount,
} from "./helpers/guided-setup-journey.js";
import {
  EVERY_PAGE_WITHOUT_A_CAMPAIGN,
  NEW_ACCOUNT_PAGES,
  expectAHeading,
  expectOneTitle,
  type NewAccountPage,
} from "./helpers/new-account-pages.js";
import { chooseThemeFromTheHeader, REVIEW_THEMES } from "./helpers/review-session.js";
import { saveBrandDetails } from "./helpers/saved-brand.js";
import { seedCampaignHistory } from "./helpers/seed-campaign-history.js";

/**
 * PRD-009g, 009G-AC-001, 009G-AC-002, 009G-AC-009, and the review half of 009G-AC-010: a brand-new
 * account, walked from its first page to its first approved ad, in one account.
 *
 * **One account, reused (D1).** Every earlier design check looked at seeded or demo data, so nothing
 * ever photographed the page a real sign-up lands on. This file signs up once, in `beforeAll`, and
 * every case reads or builds on that one account, in order (`describe.serial`). It walks every page,
 * frame, and theme before anything is saved, then saves the brand and four campaigns through "Launch
 * an ad" and photographs the populated states with the same account.
 *
 * **Sign-ups, counted across the review specs (R-8).** The product allows ten sign-ups an hour per
 * client address (`sign_up_ip`, `apps/web/src/server/password-authentication-handler.ts`), and every
 * submission spends one, refusals included. The review run spends eight of them:
 *
 *   1. `design-quality.spec.ts`: the sign-up refusal in Light (an address that already has an account)
 *   2. `design-quality.spec.ts`: the same refusal in Dark
 *   3. `workspace-pages.spec.ts`: the signed-in workspace pages
 *   4. `home-first-run.spec.ts`: Home for a brand-new account
 *   5. `launch-an-ad.click-count.spec.ts`: the happy path, counted
 *   6. `launch-an-ad.timed.spec.ts`: the five minutes, timed
 *   7. this file: the one account every case here reads
 *   8. `real-catalog/first-impression.spec.ts`: the hosted first impression, in the run's second pass
 *
 * That leaves two. Under CI the review project retries a failed test once, and a retry of a file
 * that signs up in `beforeAll` signs up again, so two is the room a failing run has. A new
 * account-creating spec has to find a way to reuse one of these accounts or take its place in this
 * list. This file's seeded campaigns (below) sign nobody up: they are stored into this file's own
 * account, so the total stays at eight.
 *
 * **What is photographed.** The pictures are the labelled sample ads on the review server, and a
 * fresh account's own pages. Nothing here is a real person: the name, company, and address are the
 * constants in `helpers/guided-setup-journey.ts` and the address is under the reserved `.invalid`
 * domain. A date is a fact about the run, not about the design, so every `time` element and every
 * date field is masked (the pictures still fail on a spacing token, a colour role, or a type step).
 *
 * **The states a person cannot make (009G-AC-002).** Three of the states need a campaign whose
 * library ad changed after it was saved: "Ad retired" on step 3 and on the campaign page, the "a
 * newer version of the ad exists" notice, and a campaign saved before PRD-009. The product never
 * saves a version against a retired, replaced, or missing ad (009D-AC-011), so no browser reaches
 * one by using it. They are stored the one sanctioned way: `seedCampaignHistory`
 * (`helpers/seed-campaign-history.ts`) builds each with the product's own manifest builder and
 * ruleset, as they were when the ad was current, and the harness
 * (`seedReviewAccountCampaigns` in `packages/db/test/campaign-integration-support.mjs`) writes them
 * into this account's workspace and refuses to run outside the review run's database. The sample
 * catalog already holds the retired ad (`sample-spring-search`) and the replaced version
 * (`sample-first-home` version 1), so no catalog entry is added, and the pages that show them are
 * the product's own, reading what is stored. The seeding happens after the four campaigns above are
 * saved (it takes its brand from one of them) and before the Brand changes, so none of the three
 * carries a "Brand changed" notice that belongs to another state.
 */

/*
 * Dates are a fact about the run, and every picture taken through `captureNamedState` paints them
 * over on their own line boxes (`expectThePictureMatches` in `../helpers/design-quality.ts`). This
 * spec used to pass its own `time` locators, which Playwright masks by their bounding box, so a
 * date that wrapped blacked out the words around it ("Version 1. Reviewed", "From launch until"):
 * the PRD-009 scored review's R1-18.
 */

async function settleImages(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page
          .locator("[data-ad-card] img, [data-ad-preview] img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      { message: "every ad picture loaded" },
    )
    .toBe(true);
}

/** Opens a page of the account in the current theme, ready to be measured or photographed. */
async function openNewAccountPage(page: Page, entry: NewAccountPage): Promise<void> {
  await page.goto(entry.path);
  await entry.ready(page);
  if (entry.hasArt === true) {
    await settleTheLibrary(page);
    await settleImages(page);
  }
}

/** Saves the Brand as a loan officer does: the two NMLS numbers and a title, then both cards. */
async function saveTheBrand(page: Page, title: string): Promise<void> {
  await page.goto("/brand", { waitUntil: "networkidle" });
  const main = page.getByRole("main");
  await main.getByLabel("Your NMLS number", { exact: false }).fill("1234567");
  await main.getByLabel("Company NMLS number", { exact: false }).fill("7654321");
  await main.getByRole("button", { name: "Save your details", exact: true }).click();
  await expect(main.getByText("Your changes are saved.").first()).toBeVisible();
  await main.getByLabel("Title on your ads", { exact: false }).fill(title);
  await main.getByRole("button", { name: "Save ad settings", exact: true }).click();
  await expect(main.getByText("Your changes are saved.")).toHaveCount(2);
}

/** Changes only the title on the ads, the one Brand field a band prints that is not a number. */
async function changeTheTitle(page: Page, title: string): Promise<void> {
  await page.goto("/brand", { waitUntil: "networkidle" });
  const main = page.getByRole("main");
  await main.getByLabel("Title on your ads", { exact: false }).fill(title);
  await main.getByRole("button", { name: "Save ad settings", exact: true }).click();
  await expect(main.getByText("Your changes are saved.")).toHaveCount(1);
}

type SavedCampaign = Readonly<{ ref: string; stepThree: string; page: string }>;

function savedFrom(page: Page): SavedCampaign {
  const ref = campaignRefOf(page.url());
  const url = new URL(page.url());
  return { ref, stepThree: `${url.pathname}${url.search}`, page: `/marketing/campaigns/${ref}` };
}

/** The decision a step 3 page is in, read from the attribute the page carries for it. */
async function expectStepThreeState(page: Page, state: string): Promise<void> {
  await expect(page.locator("[data-launch-step='3']")).toHaveAttribute("data-review-state", state);
}

let context: BrowserContext;
let page: Page;
let guard: Awaited<ReturnType<typeof guardLocalOrigin>>;
/** The address this file's one account signed up with, which the seeded campaigns are stored under. */
let accountEmail: string;

/**
 * The campaigns the account builds, by what each one is for. The first four are saved through
 * "Launch an ad". The last three are the states a person can no longer make, stored by
 * `seedCampaignHistory`; `earlierFlow` has no step 3, because only a library ad has one.
 */
const saved: {
  needsChanges?: SavedCampaign;
  ready?: SavedCampaign;
  approved?: SavedCampaign;
  sentBack?: SavedCampaign;
  adRetired?: SavedCampaign;
  newerVersion?: SavedCampaign;
  earlierFlow?: SavedCampaign;
} = {};

test.describe.serial("a brand-new account, from its first page to its first approved ad", () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    guard = await guardLocalOrigin(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    accountEmail = freshEmail();
    await signUpFreshAccount(page, accountEmail);
  });

  test.afterAll(async () => {
    expectNoExternalRequests(guard);
    await context?.close();
  });

  // ---- Before anything is saved ---------------------------------------------------------------

  /**
   * 009G-AC-009, D2. Each distinct connection sentence appears at most once on a page, and on Home
   * every one is inside "Get set up". The sentences are read from the copy files, so the check holds
   * the wording the writing review left, and a page that says one twice is named.
   */
  test("every page of a brand-new account says each connection once, and Home says all of them in Get set up (009G-AC-009)", async () => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/overview");
    await chooseThemeFromTheHeader(page, "light");

    for (const path of EVERY_PAGE_WITHOUT_A_CAMPAIGN) {
      const entry = NEW_ACCOUNT_PAGES.find((candidate) => candidate.path === path);
      if (entry === undefined) {
        await page.goto(path);
        await expectAHeading(page);
      } else {
        await openNewAccountPage(page, entry);
      }
      await expectEachConnectionStatedOnce(page, path);
    }

    // The check is not vacuous: Home does say a connection is missing, in the card.
    await page.goto("/overview");
    const statements = await readConnectionStatements(page);
    expect(statements.length, "Home states what is not connected").toBeGreaterThanOrEqual(3);
    expect(statements.every((statement) => statement.insideSetupCard)).toBe(true);
  });

  for (const theme of REVIEW_THEMES) {
    /**
     * 009G-AC-001. Every page the criterion lists, at the four frames, with axe at zero, the target
     * and type checks, and the picture compared against its baseline. `captureNamedState` runs all of
     * them at each frame.
     */
    test(`the pages of a brand-new account meet the bar at every frame in ${theme}, before anything is saved (009G-AC-001)`, async () => {
      test.setTimeout(900_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/overview");
      await chooseThemeFromTheHeader(page, theme);

      for (const entry of NEW_ACCOUNT_PAGES) {
        await page.setViewportSize({ width: 1440, height: 900 });
        await openNewAccountPage(page, entry);
        await expectThemeResolved(page, theme);
        await captureNamedState(page, {
          screen: entry.screen,
          state: entry.state,
          theme,
          idleNetwork: entry.hasArt !== true,
        });
      }
    });
  }

  /**
   * 009G-AC-010, the review half. Every new screen is operable end to end with the keyboard alone,
   * with the 2px ring at a 3px offset, and no focused control is hidden under the sticky bar. In
   * review the bar has no sample-data line, so it is the one the person actually has.
   */
  test("every new screen takes the keyboard, with the brief's ring, and keeps focus clear of the sticky bar (009G-AC-010)", async () => {
    test.setTimeout(900_000);
    await page.goto("/overview");
    await chooseThemeFromTheHeader(page, "light");

    for (const entry of NEW_ACCOUNT_PAGES) {
      await page.setViewportSize({ width: 1180, height: 900 });
      await openNewAccountPage(page, entry);
      await expectKeyboardReachesEveryControl(page);
      for (const frame of REVIEW_FRAMES) {
        await page.setViewportSize({ width: frame.width, height: frame.height });
        await openNewAccountPage(page, entry);
        await expectFocusClearsTheStickyBar(page, `${entry.path} at ${frame.name}`);
      }
    }
  });

  /**
   * 009G-AC-012 on the pages only a session reaches. The synthetic project holds the criterion's own
   * test (`tests/browser/toolkit-motion-and-keyboard.spec.ts`); Realtor partners, Settings, and
   * Homeowner reports are workspace pages it cannot open, so the same helper runs here on every page
   * of the account.
   */
  test("every page of a brand-new account runs no animation and no transition under reduced motion (009G-AC-012)", async () => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto("/overview");
    await chooseThemeFromTheHeader(page, "light");
    await page.emulateMedia({ reducedMotion: "reduce" });
    try {
      for (const entry of NEW_ACCOUNT_PAGES) {
        await openNewAccountPage(page, entry);
        await expectZeroMotionUnderReducedMotion(page);
      }
    } finally {
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
  });

  // ---- Saving: the brand, then four campaigns -------------------------------------------------

  /**
   * The account becomes a loan officer who has set up and used the product: the brand saved, then
   * four campaigns through "Launch an ad", each left in a state the criterion names. Saving the
   * brand comes first because a campaign without an NMLS number cannot pass its checks. The owner of
   * a workspace can approve, so one person decides on two of the four.
   */
  test("saves the brand, then four campaigns, and leaves each in a different state", async () => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await saveTheBrand(page, "Loan officer");

    // Needs changes: the words claim a rate, which the checks send back.
    await saveACampaign(page, {
      ad: SAMPLE_ADS.preApproval,
      place: "Austin, TX",
      headline: RATE_CLAIM_HEADLINE,
    });
    await expectStepThreeState(page, "needs-changes");
    saved.needsChanges = savedFrom(page);

    // Approved: the owner approves, and confirms.
    await saveACampaign(page, { ad: SAMPLE_ADS.firstHome, place: "Austin, TX" });
    await expectStepThreeState(page, "ready");
    const toApprove = savedFrom(page);
    await page.getByRole("button", { name: "Approve this version" }).click();
    await page.getByRole("button", { name: "Yes, approve" }).click();
    await expect(
      page.locator("[data-launch-step='3']").getByText("Approved by", { exact: false }),
    ).toBeVisible({ timeout: 30_000 });
    saved.approved = toApprove;

    // Sent back: the owner sends it back for changes.
    await saveACampaign(page, { ad: SAMPLE_ADS.preApproval, place: "Austin, TX" });
    await expectStepThreeState(page, "ready");
    const toSendBack = savedFrom(page);
    await page.getByRole("button", { name: "Send back for changes" }).click();
    await expect(
      page.locator("[data-launch-step='3']").getByText("Sent back for changes").first(),
    ).toBeVisible({ timeout: 30_000 });
    saved.sentBack = toSendBack;

    // Ready for approval, with no decision on it.
    await saveACampaign(page, { ad: SAMPLE_ADS.firstHome, place: "Austin, TX" });
    await expectStepThreeState(page, "ready");
    saved.ready = savedFrom(page);
  });

  /**
   * 009G-AC-002. The three campaigns a person can no longer make (see the note at the top): an
   * undecided campaign whose ad the library has since retired, one made from a version of its ad
   * that a newer version has since replaced, and one saved before PRD-009. They are stored into this
   * account by the sanctioned harness, taking their brand from the campaign saved ready above, and
   * each page is then opened the way a person opens it, to prove the product reads what was stored
   * as the state it is: step 3 says "Ad retired", the campaign page carries the retired notice or the
   * newer-version notice, and the older campaign opens read-only with its one line.
   */
  test("stores a campaign for an ad retired since, one for an ad with a newer version, and one saved before PRD-009 (009G-AC-002)", async () => {
    test.setTimeout(240_000);
    expect(saved.ready, "the ready campaign this seeding takes its brand from").toBeDefined();
    const seeded = await seedCampaignHistory({
      email: accountEmail,
      templateCampaignRef: saved.ready?.ref ?? "",
    });
    saved.adRetired = seeded.adRetired;
    saved.newerVersion = seeded.newerVersion;
    saved.earlierFlow = seeded.earlierFlow;

    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(seeded.adRetired.stepThree);
    await expectStepThreeState(page, "retired");
    await page.goto(seeded.adRetired.page);
    await expect(page.locator("[data-notice='retired']")).toBeVisible();
    await expect(page.locator("[data-campaign-standing='ad_retired']")).toBeVisible();
    // Nothing else is wrong with it: the Brand has not changed, so no other notice is on the page.
    await expect(page.locator("[data-library-notices] > li")).toHaveCount(1);

    await page.goto(seeded.newerVersion.page);
    await expect(page.locator("[data-notice='newer-version']")).toBeVisible();
    // QA-11. The chip is the approval rule's answer, so it is not "Ready for approval".
    await expect(page.locator("[data-campaign-standing='ad_newer_version']")).toBeVisible();
    await expect(page.locator("[data-library-notices] > li")).toHaveCount(1);

    await page.goto(seeded.earlierFlow.page);
    await expect(page.locator("[data-campaign-page='earlier-flow']")).toBeVisible();
    await expect(page.getByText(EARLIER_FLOW_LINE, { exact: true })).toBeVisible();
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: "Launch an ad", exact: true })).toBeVisible();
    await expect(main.getByRole("link", { name: "Make a new version" })).toHaveCount(0);
  });

  /**
   * 009G-AC-009 again, now that the account has campaigns: step 3 in each of its states, a campaign
   * page, the Campaigns list with every chip it can show, and Home with its lists filled.
   */
  test("the pages that need a campaign say each connection once too (009G-AC-009)", async () => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const campaign of [
      saved.needsChanges,
      saved.ready,
      saved.approved,
      saved.sentBack,
      saved.adRetired,
      saved.newerVersion,
    ]) {
      expect(campaign).toBeDefined();
      await page.goto(campaign?.stepThree ?? "/overview");
      await expect(page.locator("[data-launch-step='3']")).toBeVisible();
      await expectEachConnectionStatedOnce(page, `step 3 of ${campaign?.ref ?? "?"}`);
      await page.goto(campaign?.page ?? "/overview");
      await expectOneTitle(page);
      await expectEachConnectionStatedOnce(page, `the campaign page of ${campaign?.ref ?? "?"}`);
    }
    // A campaign saved before PRD-009 has a page and no step 3.
    expect(saved.earlierFlow).toBeDefined();
    await page.goto(saved.earlierFlow?.page ?? "/overview");
    await expectOneTitle(page);
    await expectEachConnectionStatedOnce(
      page,
      `the campaign page of ${saved.earlierFlow?.ref ?? "?"}`,
    );

    await page.goto("/marketing/campaigns");
    const list = page.locator("[data-campaign-table]");
    for (const chip of [
      "Ready for approval",
      "Needs changes",
      "Approved",
      "Sent back for changes",
      "Ad retired",
      "Newer ad version",
    ]) {
      await expect(
        list.getByText(chip, { exact: true }).first(),
        `the list shows ${chip}`,
      ).toBeVisible();
    }
    await expectEachConnectionStatedOnce(page, "the Campaigns list with campaigns");

    await page.goto("/overview");
    await expectEachConnectionStatedOnce(page, "Home with campaigns");
  });

  // ---- The populated states, photographed (009G-AC-002) --------------------------------------

  /**
   * D8's states of step 3: the name of the picture, the decision the page carries for it, and the
   * campaign it is photographed for. "Ad retired" is a stored campaign (see the note at the top);
   * "cannot approve" is a different person, below.
   */
  const STEP_THREE_STATES = [
    ["needs-changes", "needs-changes", "needsChanges"],
    ["ready-for-approval", "ready", "ready"],
    ["approved", "approved", "approved"],
    ["sent-back", "sent-back", "sentBack"],
    ["ad-retired", "retired", "adRetired"],
  ] as const;

  /**
   * The campaign page in the states it has for a library ad, and the one it has for a campaign saved
   * before PRD-009. Each state of the library notices is here once on its own: the retired notice and
   * the newer-version notice are stored campaigns, and "Brand changed" is last in this file.
   */
  const CAMPAIGN_PAGE_STATES = [
    ["approved", "approved"],
    ["sent-back", "sentBack"],
    ["ad-retired", "adRetired"],
    ["newer-version", "newerVersion"],
    ["saved-before-prd-009", "earlierFlow"],
  ] as const;

  for (const theme of REVIEW_THEMES) {
    test(`step 3 in each state this account reaches meets the bar at every frame in ${theme} (009G-AC-002)`, async () => {
      test.setTimeout(900_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/overview");
      await chooseThemeFromTheHeader(page, theme);

      for (const [state, reviewState, key] of STEP_THREE_STATES) {
        const campaign = saved[key];
        expect(campaign, `the ${state} campaign was saved`).toBeDefined();
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(campaign?.stepThree ?? "/overview");
        await expectStepThreeState(page, reviewState);
        await expectThemeResolved(page, theme);
        await settleImages(page);
        await captureNamedState(page, {
          screen: "launch-an-ad",
          state: `step-3-${state}`,
          theme,
        });
      }
    });

    test(`the campaign page in each state this account reaches meets the bar at every frame in ${theme} (009G-AC-002)`, async () => {
      test.setTimeout(900_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/overview");
      await chooseThemeFromTheHeader(page, theme);

      for (const [state, key] of CAMPAIGN_PAGE_STATES) {
        const campaign = saved[key];
        expect(campaign, `the ${state} campaign was saved`).toBeDefined();
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(campaign?.page ?? "/overview");
        await expect(page.getByRole("region", { name: "Approval" })).toBeVisible();
        await expectThemeResolved(page, theme);
        await settleImages(page);
        await captureNamedState(page, {
          screen: "campaign-page",
          state,
          theme,
        });
      }
    });

    test(`the Campaigns list with every chip it can show meets the bar at every frame in ${theme} (009G-AC-002)`, async () => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/overview");
      await chooseThemeFromTheHeader(page, theme);
      await page.goto("/marketing/campaigns");
      await expect(page.locator("[data-campaign-table]")).toBeVisible();
      await expectThemeResolved(page, theme);
      await settleImages(page);
      await captureNamedState(page, {
        screen: "campaigns",
        state: "all-states",
        theme,
      });
    });

    test(`the gone page meets the bar at every frame in ${theme} (009G-AC-002)`, async () => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/overview");
      await chooseThemeFromTheHeader(page, theme);
      const response = await page.goto("/leads");
      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { level: 1, name: "This page is gone." }),
      ).toBeVisible();
      await expectThemeResolved(page, theme);
      await captureNamedState(page, { screen: "gone", state: "default", theme });
    });

    /**
     * The Menu sheet, open, at 390. It is the one place the six links live below 720px, so it is a
     * screen of its own. It is a layer over the page, so the picture is of the frame and not of the
     * whole page behind it.
     */
    test(`the Menu sheet, open at 390, meets the bar in ${theme} (009G-AC-002)`, async () => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/overview");
      await chooseThemeFromTheHeader(page, theme);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/overview");
      await settleForScreenshot(page);
      await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
      await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
      await captureNamedState(page, {
        screen: "shell",
        state: "menu-sheet-open",
        theme,
        frames: REVIEW_FRAMES.filter((frame) => frame.name === "390"),
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
    });
  }

  /**
   * D8's "Ready for approval, viewer can't approve": the hand-off card, which only a person without
   * an approval role sees. The seeded creator is that person, and signing them in costs one of the
   * twenty sign-ins a quarter hour allows, which a sign-up would not be (see the note at the top).
   */
  for (const theme of REVIEW_THEMES) {
    test(`step 3 for a person who cannot approve meets the bar at every frame in ${theme} (009G-AC-002)`, async ({
      browser,
    }) => {
      test.setTimeout(600_000);
      const { creatorEmail, password } = seededCredentials();
      const creatorContext = await browser.newContext({ ignoreHTTPSErrors: true });
      const creator = await creatorContext.newPage();
      const creatorGuard = await guardLocalOrigin(creator);
      await creator.setViewportSize({ width: 1440, height: 900 });
      await signInExisting(creator, creatorEmail, password);
      // The seed saves the creator no Brand, and a library ad carries the creator's own NMLS number,
      // so without one step 3 reads "Needs changes" and offers no hand-off (see `saveBrandDetails`).
      // A real loan officer saves the Brand first, and so does this one, as the decision spec does.
      await saveBrandDetails(creator);
      await saveACampaign(creator, { ad: SAMPLE_ADS.firstHome, place: "Austin, TX" });
      await expectStepThreeState(creator, "cannot-approve");
      await chooseThemeFromTheHeader(creator, theme);
      await expect(
        creator
          .locator("[data-launch-step='3']")
          .getByRole("button", { name: "Approve this version" }),
      ).toHaveCount(0);
      await settleImages(creator);
      await captureNamedState(creator, {
        screen: "launch-an-ad",
        state: "step-3-cannot-approve",
        theme,
      });
      expectNoExternalRequests(creatorGuard);
      await creatorContext.close();
    });
  }

  /**
   * The campaign page with a library notice (009E-AC-006): the Brand changed after the version was
   * saved, so the page says so and offers a new version. It is the one notice a person reaches by
   * using the product alone (the retired and newer-version notices are above, on stored campaigns),
   * and it is last because it changes the Brand every case above read as it was.
   */
  for (const theme of REVIEW_THEMES) {
    test(`the campaign page with a library notice meets the bar at every frame in ${theme} (009G-AC-002)`, async () => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      if (theme === "light") await changeTheTitle(page, "Senior loan officer");
      await page.goto("/overview");
      await chooseThemeFromTheHeader(page, theme);
      await page.goto(saved.approved?.page ?? "/overview");
      await expect(page.getByText("Make a new version to use it.")).toBeVisible();
      await expectThemeResolved(page, theme);
      await settleImages(page);
      await captureNamedState(page, {
        screen: "campaign-page",
        state: "library-notice",
        theme,
      });
      await expectEachConnectionStatedOnce(page, "the campaign page with a notice");
    });
  }

  /**
   * 009G-AC-010 for the screens that need a campaign: step 3 and the campaign page, in the review
   * build, at every frame, including the stored campaigns (a retired ad, a newer version, and one
   * saved before PRD-009), which have controls of their own: "Choose another ad", "Use the new
   * version", and "Launch an ad".
   */
  test("step 3 and the campaign page take the keyboard and keep focus clear of the sticky bar (009G-AC-010)", async () => {
    test.setTimeout(900_000);
    await page.goto("/overview");
    await chooseThemeFromTheHeader(page, "light");
    for (const [name, address] of [
      ["step 3", saved.ready?.stepThree],
      ["step 3 with the ad retired", saved.adRetired?.stepThree],
      ["the campaign page", saved.approved?.page],
      ["the campaign page with the ad retired", saved.adRetired?.page],
      ["the campaign page with a newer version", saved.newerVersion?.page],
      ["the campaign page saved before PRD-009", saved.earlierFlow?.page],
      ["the Campaigns list", "/marketing/campaigns"],
    ] as const) {
      await page.setViewportSize({ width: 1180, height: 900 });
      await page.goto(address ?? "/overview");
      await settleImages(page);
      await expectKeyboardReachesEveryControl(page);
      for (const frame of REVIEW_FRAMES) {
        await page.setViewportSize({ width: frame.width, height: frame.height });
        await page.goto(address ?? "/overview");
        await settleImages(page);
        await expectFocusClearsTheStickyBar(page, `${name} at ${frame.name}`);
      }
    }
  });

  /**
   * 009G-AC-010, "end to end": a person who cannot use a pointer launches an ad from Home with Tab,
   * Enter, and typing, and the page is never clicked. It is last because it saves a fifth campaign,
   * which every picture above is drawn without.
   */
  test("Launch an ad can be done from Home to an approved version with the keyboard alone (009G-AC-010)", async () => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const tabs = await launchAnAdFromHomeByKeyboard(page, { place: "Austin, TX" });
    for (const [step, presses] of Object.entries(tabs)) {
      expect(presses, `${step} takes ${String(presses)} Tab presses`).toBeLessThanOrEqual(60);
    }
    await expectStepThreeState(page, "ready");
    await approveByKeyboard(page);
    await expect(page.getByRole("button", { name: "Launch on Facebook" })).toBeDisabled();
  });
});
