import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { HOME_START } from "../../../../apps/web/src/copy/home-messages.js";
import {
  EMPTY_LIBRARY,
  EMPTY_LIBRARY_REASON,
  EMPTY_LIBRARY_TITLE,
} from "../../../../apps/web/src/copy/launch-messages.js";
import { LIBRARY_PATH, settleTheLibrary } from "../../helpers/ads-library.js";
import {
  REVIEW_FRAMES,
  captureNamedState,
  expectAxeClean,
  expectKeyboardReachesEveryControl,
  expectNoHorizontalOverflow,
  expectThemeResolved,
  settleForScreenshot,
} from "../../helpers/design-quality.js";
import {
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  signUpFreshAccount,
} from "../helpers/guided-setup-journey.js";
import { chooseThemeFromTheHeader, REVIEW_THEMES } from "../helpers/review-session.js";

/**
 * PRD-009g, 009G-AC-001. The hosted first impression: a brand-new account on a server started
 * without the samples flag, so the catalog it reads is the one the repository ships, which is empty.
 *
 * `review-browser-run.mjs` starts that server for the review run's second pass and runs only the
 * specs in this directory against it (`playwright.config.ts`, `OALO_REVIEW_CATALOG`). Every other
 * review spec runs against the sample ads, which is why none of them has ever seen what a real
 * sign-up sees on the deployed app: Home's start card with the empty-library sentence in place of
 * the topics, and the library tab and step 1 with no chip and no card (009C-AC-012).
 *
 * **Sign-ups.** This spec creates one account, in `beforeAll`, and every case reads it
 * (009G D1). The review run's whole budget is in the comment at the top of `../empty-account.spec.ts`;
 * this is the eighth of the eight it counts, so it is stated there and not here.
 *
 * The three pages are photographed at the four frames in both themes with axe at zero, and walked
 * with the keyboard once each, because a page with no card on it is still a page a person tabs
 * through to reach "Choose an ad".
 */

type EmptyCatalogPage = Readonly<{
  /** The screen and state of the baseline, `<screen>--<state>--<frame>--<theme>.png`. */
  screen: string;
  state: string;
  path: string;
  /** What this page must say and not show, asserted before anything is photographed. */
  assertEmpty: (page: Page) => Promise<void>;
}>;

async function expectNoTopicsAndNoAds(page: Page): Promise<void> {
  const main = page.getByRole("main");
  await expect(main.getByRole("list", { name: "Show ads about" })).toHaveCount(0);
  await expect(main.getByRole("list", { name: HOME_START.question })).toHaveCount(0);
  await expect(main.locator("[data-ad-card-grid], [data-ad-card]")).toHaveCount(0);
  await expect(main.getByRole("link", { name: /^Use this ad/u })).toHaveCount(0);
  await expect(main.getByRole("button", { name: /^Use this ad/u })).toHaveCount(0);
}

/** Home's start card says the criterion's whole sentence, once, in the page's own main region. */
async function expectTheEmptyLibrarySentenceOnce(page: Page): Promise<void> {
  await expect(page.getByRole("main").getByText(EMPTY_LIBRARY, { exact: true })).toHaveCount(1);
}

/**
 * The library tab and step 1 say the same two sentences in the empty state's own two places (the
 * writing review delta check, D-1): the fact as its title and the reason as its description. Each is
 * said once, and the two are not also said joined, so no fact is repeated on the page.
 */
async function expectTheEmptyLibraryOnce(page: Page): Promise<void> {
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: EMPTY_LIBRARY_TITLE, exact: true })).toHaveCount(
    1,
  );
  await expect(main.getByText(EMPTY_LIBRARY_REASON, { exact: true })).toHaveCount(1);
  await expect(main.getByText(EMPTY_LIBRARY, { exact: true })).toHaveCount(0);
}

const PAGES: readonly EmptyCatalogPage[] = Object.freeze([
  {
    screen: "home",
    state: "real-catalog",
    path: "/overview",
    assertEmpty: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: HOME_START.heading })).toBeVisible();
      await expectTheEmptyLibrarySentenceOnce(page);
      await expectNoTopicsAndNoAds(page);
      // "Choose an ad" still opens step 1, which says the same sentence (009B-AC-002, 009C-AC-012).
      await expect(
        page
          .getByRole("region", { name: HOME_START.heading })
          .getByRole("link", { name: HOME_START.primaryAction, exact: true }),
      ).toHaveAttribute("href", "/marketing/campaigns/new");
    },
  },
  {
    screen: "ads-library",
    state: "real-catalog",
    path: LIBRARY_PATH,
    assertEmpty: async (page) => {
      await expectTheEmptyLibraryOnce(page);
      await expectNoTopicsAndNoAds(page);
    },
  },
  {
    screen: "launch-an-ad",
    state: "step-1-real-catalog",
    path: "/marketing/campaigns/new",
    assertEmpty: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeVisible();
      await expectTheEmptyLibraryOnce(page);
      await expectNoTopicsAndNoAds(page);
    },
  },
]);

let context: BrowserContext;
let page: Page;
let guard: Awaited<ReturnType<typeof guardLocalOrigin>>;

test.describe.serial("a brand-new account against the real, empty catalog", () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    guard = await guardLocalOrigin(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signUpFreshAccount(page, freshEmail());
  });

  test.afterAll(async () => {
    expectNoExternalRequests(guard);
    await context?.close();
  });

  /**
   * The server under this pass is the one it is meant to be. A spec that ran against the sample
   * server would find chips and cards and fail on them, but that would say "the catalog is not
   * empty", and the cause would be the wrong server. The sample art route answers only when the
   * guard passes (009C-AC-004), so its 404 is the direct evidence that the flag is not set here.
   */
  test("the server shows no sample ad, and its sample art route answers not found", async () => {
    const response = await page.request.get("/api/ads-library/samples/sample-first-home/2/tall");
    expect(response.status()).toBe(404);
    await page.goto(LIBRARY_PATH);
    await expect(page.getByText("Sample ad")).toHaveCount(0);
    await expect(page.getByText(EMPTY_LIBRARY_REASON, { exact: true })).toBeVisible();
  });

  for (const theme of REVIEW_THEMES) {
    test(`Home, the Ads library tab, and step 1 say there is no ad yet, at every frame in ${theme}`, async () => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/overview");
      await chooseThemeFromTheHeader(page, theme);

      for (const entry of PAGES) {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(entry.path);
        await expectThemeResolved(page, theme);
        await entry.assertEmpty(page);
        await settleTheLibrary(page);
        await captureNamedState(page, {
          screen: entry.screen,
          state: entry.state,
          theme,
          idleNetwork: false,
        });
      }
    });
  }

  test("each of the three pages is axe-clean and fits its frame, and its controls take the keyboard", async () => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1180, height: 900 });
    for (const entry of PAGES) {
      await page.goto(entry.path);
      await settleForScreenshot(page, { idleNetwork: false });
      await expectAxeClean(page);
      await expectNoHorizontalOverflow(page);
      // 009G-AC-010: the empty states keep a keyboard path and the brief's ring.
      await expectKeyboardReachesEveryControl(page);
    }
    // The narrowest frame too: a one-sentence page has the most room to overflow on a phone.
    const narrow = REVIEW_FRAMES.find((frame) => frame.name === "390");
    expect(narrow).toBeDefined();
    await page.setViewportSize({ width: narrow?.width ?? 390, height: narrow?.height ?? 844 });
    for (const entry of PAGES) {
      await page.goto(entry.path);
      await settleForScreenshot(page, { idleNetwork: false });
      await expectNoHorizontalOverflow(page);
    }
  });
});
