import { expect, test, type Page } from "@playwright/test";

import {
  REVIEW_FRAMES,
  expectKeyboardReachesEveryControl,
  expectZeroMotionUnderReducedMotion,
  settleForScreenshot,
  useStoredTheme,
} from "./helpers/design-quality.js";
import { withAnEmptyCampaignWorkspace } from "./helpers/empty-campaign-workspace.js";
import { launchAnAdFromHomeByKeyboard, tabTo } from "./helpers/keyboard-journey.js";
import { SAMPLE_ADS, saveACampaign } from "./helpers/launch-an-ad.js";
import { settleTheLibrary } from "./helpers/ads-library.js";
import { expectFocusClearsTheStickyBar } from "./helpers/sticky-bar.js";

/**
 * PRD-009g, 009G-AC-010 and 009G-AC-012, for every screen the toolkit adds or rewrites, on the
 * synthetic server.
 *
 * - **Keyboard (009G-AC-010).** Each screen is operable end to end with the keyboard alone, with the
 *   2px ring at a 3px offset on every control it reaches (`expectKeyboardReachesEveryControl`), and
 *   no focused control is hidden under the sticky top bar at any of the four frames
 *   (`expectFocusClearsTheStickyBar`). The second is a different walk from the first: the bar can
 *   only hide a control that the page scrolls in from above, so it starts at the bottom and goes
 *   backwards. The UX contract test (`ui-foundation-ux.spec.ts`, "keyboard focus, target size, and
 *   reduced motion meet the UX contract on Home") covers Home's focus, target size, and motion; the
 *   walks here cover Home's full tab order and every other new screen.
 * - **Reduced motion (009G-AC-012).** Under `prefers-reduced-motion: reduce` every element on the
 *   screen has no animation and a zero transition: the library and Launch an ad's three steps, the
 *   campaign page and the Campaigns list, Brand, the gone page, the Menu sheet, the
 *   topic chips (hovered, focused, and pressed), and the ad preview's shape switch (switched).
 *
 * The review project runs the keyboard half again signed in, against a brand-new account
 * (`review/empty-account.spec.ts`), where the bar has no sample-data line and the pages hold what a
 * real person's hold.
 */

/** Aborts, and records, any request that leaves the server the project started. */
async function blockAnythingOffOrigin(
  page: Page,
  baseURL: string | undefined,
): Promise<readonly string[]> {
  const origin = new URL(baseURL ?? "http://127.0.0.1:3100").origin;
  const external: string[] = [];
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      external.push(route.request().url());
      await route.abort();
      return;
    }
    await route.continue();
  });
  return external;
}

/**
 * The screens that need no campaign saved, with the page each one opens.
 *
 * Realtor partners, Settings, its account page, and Homeowner reports are workspace pages: the
 * synthetic server answers them with its not-found page, so there is nothing to walk. The review
 * project walks them signed in (`review/empty-account.spec.ts`, 009G-AC-010). Under reduced motion
 * they share the one stylesheet rule the screens below do, and the review project's sweep reads the
 * same helper.
 */
const SCREENS = Object.freeze([
  { name: "Home", path: "/overview" },
  { name: "Campaigns", path: "/marketing/campaigns" },
  { name: "the Ads library tab", path: "/marketing/campaigns/library" },
  {
    name: "the Ads library tab filtered to one topic",
    path: "/marketing/campaigns/library?topic=refinance",
  },
  { name: "Launch an ad, step 1", path: "/marketing/campaigns/new" },
  {
    name: "Launch an ad, step 1 filtered to one topic",
    path: "/marketing/campaigns/new?topic=refinance",
  },
  { name: "Launch an ad, step 2", path: "/marketing/campaigns/new?step=2&ad=sample-first-home" },
  { name: "Brand", path: "/brand" },
  { name: "Settings, connections", path: "/settings/connections" },
  { name: "the gone page", path: "/leads" },
] as const);

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await settleTheLibrary(page);
}

for (const screen of SCREENS) {
  test(`${screen.name} runs no animation and no transition under reduced motion (009G-AC-012)`, async ({
    page,
    baseURL,
  }) => {
    const external = await blockAnythingOffOrigin(page, baseURL);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await useStoredTheme(page, "light");
    await page.setViewportSize({ width: 1180, height: 900 });
    await open(page, screen.path);

    await expectZeroMotionUnderReducedMotion(page);
    expect(external).toEqual([]);
  });

  test(`${screen.name} is operable with the keyboard alone, and nothing it focuses is under the top bar (009G-AC-010)`, async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const external = await blockAnythingOffOrigin(page, baseURL);
    await useStoredTheme(page, "light");

    // The ring, and the order, on the frame the other walks use.
    await page.setViewportSize({ width: 1180, height: 900 });
    await open(page, screen.path);
    await expectKeyboardReachesEveryControl(page);

    // The sticky bar is one row, two rows, or a row with a Menu button, so every frame is its own case.
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await open(page, screen.path);
      await expectFocusClearsTheStickyBar(page, `${screen.name} at ${frame.name}`);
    }
    expect(external).toEqual([]);
  });
}

/**
 * The check measures something. Reduced motion is a media query, so a page that has no motion at all
 * would pass every case above, and so would a helper that read nothing. With motion allowed, Home
 * carries transitions (its links and buttons ease their state changes), and the same helper finds
 * them.
 */
test("the motion check can fail: with motion allowed, Home has transitions the helper finds", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await useStoredTheme(page, "light");
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/overview");
  await settleForScreenshot(page, { idleNetwork: false });

  await expect(expectZeroMotionUnderReducedMotion(page)).rejects.toThrow();
});

/**
 * 009G-AC-012: the topic chips. A chip is where a person's pointer rests and their keyboard lands,
 * so hover and focus are held still too: a rule that eases only on `:hover` is not in the computed
 * style of an element nobody is pointing at.
 */
test("the topic chips on Home and on the library keep every state still under reduced motion", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await useStoredTheme(page, "light");
  await page.setViewportSize({ width: 1180, height: 900 });

  await page.goto("/overview");
  await settleForScreenshot(page, { idleNetwork: false });
  const homeChip = page
    .getByRole("list", { name: "What do you want to promote?" })
    .getByRole("link")
    .first();
  await homeChip.hover();
  await expectZeroMotionUnderReducedMotion(page);
  await homeChip.focus();
  await expectZeroMotionUnderReducedMotion(page);

  await open(page, "/marketing/campaigns/library");
  const chips = page.getByRole("list", { name: "Show ads about" }).getByRole("button");
  const second = chips.nth(1);
  await second.hover();
  await expectZeroMotionUnderReducedMotion(page);
  // Pressed with the keyboard, and pressed again: the grid changes in place and nothing eases.
  await second.focus();
  await page.keyboard.press("Enter");
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await settleTheLibrary(page);
  await expectZeroMotionUnderReducedMotion(page);
  await page.keyboard.press("Space");
  await expectZeroMotionUnderReducedMotion(page);
});

/**
 * 009G-AC-010 and 009G-AC-012: the Menu sheet. It opens from the bar's Menu button below 720px, takes
 * focus when it opens, and gives it back to the button when it closes, all without a keyboard
 * trap and without motion.
 */
test("the Menu sheet opens and closes by keyboard at 390 and runs no motion under reduced motion", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const external = await blockAnythingOffOrigin(page, baseURL);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await useStoredTheme(page, "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await settleForScreenshot(page, { idleNetwork: false });

  const menuButton = page.getByRole("banner").getByRole("button", { name: "Menu" });
  await menuButton.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Menu" });
  await expect(sheet).toBeVisible();
  await expectZeroMotionUnderReducedMotion(page);

  // Focus goes into the sheet when it opens. The sheet is the non-modal layer, so Tab is never
  // trapped (`packages/ui/src/components/overlay.tsx`); what has to hold is that every item in it
  // is reached by Tab, in order, before focus leaves.
  expect(await sheet.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  const reached = new Set<string>();
  for (let press = 0; press < 12; press += 1) {
    const inside = await sheet.evaluate((element) => {
      const focused = document.activeElement;
      return element.contains(focused) ? (focused?.textContent ?? "").trim() : undefined;
    });
    if (inside === undefined) break;
    reached.add(inside);
    await page.keyboard.press("Tab");
  }
  for (const label of [
    "Home",
    "Campaigns",
    "Brand",
    "Realtor partners",
    "Homeowner reports",
    "Settings",
  ]) {
    expect(
      [...reached].some((text) => text.startsWith(label)),
      `${label} is reached by Tab`,
    ).toBe(true);
  }

  // Escape closes the sheet from inside it, and focus goes back to the button that opened it.
  await sheet.getByRole("link").first().focus();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(menuButton).toBeFocused();
  await expectZeroMotionUnderReducedMotion(page);
  expect(external).toEqual([]);
});

/**
 * 009G-AC-010 and 009G-AC-012 on the two screens that exist only once a campaign does: step 3 and the
 * campaign page, and on the ad preview's shape switch, which is on step 3.
 *
 * The campaign is saved through "Launch an ad" in a workspace that starts empty and is put back
 * afterwards, so no other picture sees it. A synthetic person cannot approve, so step 3 is in its
 * "cannot approve" state here, which has the hand-off card and the same preview, switch, and band.
 */
test("step 3, its shape switch, and the campaign page are operable by keyboard and still under reduced motion", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240_000);
  const external = await blockAnythingOffOrigin(page, baseURL);
  await useStoredTheme(page, "light");
  await page.setViewportSize({ width: 1180, height: 900 });

  await withAnEmptyCampaignWorkspace(async () => {
    const campaignRef = await saveACampaign(page, {
      ad: SAMPLE_ADS.firstHome,
      place: "Austin, TX",
    });
    const stepThree = page.url();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await settleForScreenshot(page, { idleNetwork: false });

    // Step 3 as it opens.
    await expectZeroMotionUnderReducedMotion(page);
    await expectKeyboardReachesEveryControl(page);

    // The shape switch is a pair of radios: it is reached and changed by keyboard, the preview
    // changes shape, and nothing eases.
    const shape = page.getByRole("group", { name: "Shape", exact: true });
    const square = shape.getByRole("radio", { name: /square/iu });
    const tall = shape.getByRole("radio", { name: /tall/iu });
    await expect(tall).toBeChecked();
    await tall.focus();
    await page.keyboard.press("ArrowRight");
    await expect(square).toBeChecked();
    await expectZeroMotionUnderReducedMotion(page);
    await page.keyboard.press("ArrowLeft");
    await expect(tall).toBeChecked();
    await expectZeroMotionUnderReducedMotion(page);
    await square.check();
    await square.hover();
    await expectZeroMotionUnderReducedMotion(page);

    // Both screens clear the bar at every frame.
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await page.goto(stepThree);
      await settleForScreenshot(page, { idleNetwork: false });
      await expectFocusClearsTheStickyBar(page, `step 3 at ${frame.name}`);
      await page.goto(`/marketing/campaigns/${campaignRef}`);
      await settleForScreenshot(page, { idleNetwork: false });
      await expectFocusClearsTheStickyBar(page, `the campaign page at ${frame.name}`);
    }

    // The campaign page, in the ring and the motion the brief specifies.
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto(`/marketing/campaigns/${campaignRef}`);
    await settleForScreenshot(page, { idleNetwork: false });
    await expectZeroMotionUnderReducedMotion(page);
    await expectKeyboardReachesEveryControl(page);
  });
  expect(external).toEqual([]);
});

/**
 * 009G-AC-010, "end to end": "Launch an ad" is done from Home to step 3 with Tab, Enter, and typing,
 * and the page is never clicked. A synthetic person cannot approve, so the journey ends where it
 * can: step 3 shows the hand-off card and no approve control, and the card's own button is reachable
 * by keyboard. The review project goes on to approve (`review/empty-account.spec.ts`).
 */
test("Launch an ad can be done from Home to step 3 with the keyboard alone", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const external = await blockAnythingOffOrigin(page, baseURL);
  await useStoredTheme(page, "light");
  await page.setViewportSize({ width: 1440, height: 900 });

  await withAnEmptyCampaignWorkspace(async () => {
    const tabs = await launchAnAdFromHomeByKeyboard(page, { place: "Austin, TX" });
    for (const [step, presses] of Object.entries(tabs)) {
      expect(presses, `${step} takes ${String(presses)} Tab presses`).toBeLessThanOrEqual(60);
    }
    await expect(page.locator("[data-launch-step='3']")).toHaveAttribute(
      "data-review-state",
      "cannot-approve",
    );
    await expect(page.getByRole("button", { name: "Approve this version" })).toHaveCount(0);
    await tabTo(page, /^Copy the link$/u);
  });
  expect(external).toEqual([]);
});
