import { expect, test, type Page } from "@playwright/test";

import {
  FULL_PAGE_SCREENSHOT_TIMEOUT_MS,
  REVIEW_FRAMES,
  captureNamedState,
  expectAxeClean,
  expectKeyboardReachesEveryControl,
  expectNoHorizontalOverflow,
  expectTargetsAreLargeEnough,
  expectThemeResolved,
  expectZeroMotionUnderReducedMotion,
  screenshotName,
  settleForScreenshot,
  useStoredTheme,
  warmFullPageCapture,
  type ReviewTheme,
} from "./helpers/design-quality.js";
import {
  FINISHED_OPEN_HOUSE,
  READY_OPEN_HOUSE,
  fillTheOpenHouseDraft,
} from "./helpers/open-house-draft.js";

/**
 * PRD-006d 006D-AC-007 through 006D-AC-014, for the screens synthetic mode serves.
 *
 * This is the machine half of the scored review recorded in
 * `library/requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-prd-006d-design-review.md`.
 * The rubric's section 6 says a reviewer scores what a machine cannot; everything a machine can
 * check is checked here, at all four frames in both themes, so a reviewer's eye is spent on
 * hierarchy and consistency rather than on re-counting pixels.
 *
 * The account screens and the seven guided-setup steps are not here. They need a session and a
 * real database, so they run in the `review` project inside `pnpm test:db`
 * (`tests/browser/review/design-quality.spec.ts`), against the same helpers.
 *
 * Every screen carries synthetic data only. No baseline in `tests/visual/screens/` contains a real
 * address, a real name, or anything a person typed.
 */

const applicationOrigin = "http://127.0.0.1:3100";

/** The rubric's section 4, restricted to what a synthetic deployment actually serves. */
const SYNTHETIC_SCREENS = Object.freeze([
  { screen: "overview", path: "/overview" },
  { screen: "campaigns", path: "/marketing/campaigns" },
  { screen: "campaign-create", path: "/marketing/campaigns/new" },
  { screen: "campaign-detail", path: "/marketing/campaigns/synthetic-open-house-001" },
  { screen: "reports", path: "/reports" },
  { screen: "onboarding", path: "/onboarding" },
  { screen: "settings-connections", path: "/settings/connections" },
  { screen: "brand", path: "/brand" },
  { screen: "email-preview", path: "/email-preview" },
  /**
   * The rubric's section 4 "Boundaries" entry, plus the unverified-email notice.
   *
   * Three states nothing in either suite had ever looked at, because each of them appears only
   * when something fails, when something is slow, or when an address has not been confirmed. They
   * are in D3 and in the rubric and were in no review and no gate until 2026-09-20. The page is
   * gated the way the email preview is, on `canRenderSyntheticDemo()`, and the review suite
   * asserts the other side of that gate.
   */
  { screen: "design-surfaces", path: "/design-surfaces" },
] as const);

/**
 * The email preview is the one screen whose frames are not part of this product's page structure.
 * Each frame holds a whole email document, and "this document should have one main landmark" is a
 * rule about web pages. The emails are checked in their own call below, with those two
 * page-structure rules off and every other rule, including every WCAG rule, on.
 */
const EMAIL_FRAME_SELECTOR = "iframe[data-email-preview]";
const PAGE_STRUCTURE_RULES = ["landmark-one-main", "page-has-heading-one", "region"] as const;

function axeOptionsFor(screen: string): Readonly<{ exclude?: readonly string[] }> {
  return screen === "email-preview" ? { exclude: [EMAIL_FRAME_SELECTOR] } : {};
}

/** The brief forbids an external request from any screen; the suite proves it on every one. */
async function blockAnythingOffOrigin(page: Page): Promise<readonly string[]> {
  const externalRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (new URL(url).origin !== applicationOrigin) {
      externalRequests.push(url);
      await route.abort();
      return;
    }
    await route.continue();
  });
  return externalRequests;
}

for (const { screen, path } of SYNTHETIC_SCREENS) {
  for (const theme of ["light", "dark"] as const satisfies readonly ReviewTheme[]) {
    for (const frame of REVIEW_FRAMES) {
      test(`${screen} at ${frame.name} in ${theme} meets the design quality bar`, async ({
        page,
      }) => {
        const externalRequests = await blockAnythingOffOrigin(page);
        await useStoredTheme(page, theme);
        await page.setViewportSize({ width: frame.width, height: frame.height });
        await page.goto(path);
        await expectThemeResolved(page, theme);
        await settleForScreenshot(page);

        // Axes 4 and 9.
        await expectAxeClean(page, axeOptionsFor(screen));
        // Axis 7.
        await expectNoHorizontalOverflow(page);
        await expectTargetsAreLargeEnough(page);
        // Axes 1, 2, 3, 8 and 10, as far as a machine can hold them: the whole composition is
        // compared against a committed baseline, so any of them moving is a failure with a picture.
        await warmFullPageCapture(page);
        await expect(page).toHaveScreenshot(screenshotName(screen, frame.name, theme), {
          fullPage: true,
          timeout: FULL_PAGE_SCREENSHOT_TIMEOUT_MS,
        });

        expect(externalRequests).toEqual([]);
      });
    }
  }
}

for (const { screen, path } of SYNTHETIC_SCREENS) {
  test(`${screen} runs no animation and no transition under reduced motion`, async ({ page }) => {
    const externalRequests = await blockAnythingOffOrigin(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await useStoredTheme(page, "light");
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto(path);
    await settleForScreenshot(page);

    // Axis 6.
    await expectZeroMotionUnderReducedMotion(page);
    expect(externalRequests).toEqual([]);
  });
}

for (const { screen, path } of SYNTHETIC_SCREENS) {
  test(`${screen} is operable with the keyboard alone, with the ring the brief specifies`, async ({
    page,
  }) => {
    const externalRequests = await blockAnythingOffOrigin(page);
    await useStoredTheme(page, "dark");
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto(path);
    await settleForScreenshot(page);

    // 006D-AC-009.
    await expectKeyboardReachesEveryControl(page);
    expect(externalRequests).toEqual([]);
  });
}

/**
 * 006D-AC-011 on the create screen, which until 2026-09-20 nothing checked.
 *
 * The test that stood here was named for a form result and never produced one: it focused the
 * first field and measured the field. Meanwhile the screen's save failure was a plain card below
 * fourteen fields, unconnected to any of them and announced to nobody, which is three of the four
 * things 006D-AC-011 asks for missing at once.
 *
 * So the failure is produced, from the real server, and then measured. A two-letter state is the
 * shortest honest way in: the control's `maxLength` caps it at two characters and the browser's
 * own required check passes on one, so the refusal comes from the draft schema
 * (`apps/web/src/server/open-house-draft.ts:18-24`) rather than from a stubbed answer, and it
 * comes back naming the control it is about.
 *
 * Four claims, the four the criterion makes: the message announces, it is above the first field,
 * it is on screen at 390 without scrolling, and the control the refusal named carries it through
 * `aria-describedby`.
 */
test("a failed save on the create screen is announced, connected, and on screen at 390", async ({
  page,
}) => {
  await blockAnythingOffOrigin(page);
  await useStoredTheme(page, "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marketing/campaigns/new");
  await settleForScreenshot(page);

  await fillTheOpenHouseDraft(page, READY_OPEN_HOUSE);
  const state = page.getByLabel("State", { exact: true });
  await state.fill("T");
  await page.getByRole("button", { name: "Save and run the checks" }).click();

  // Scoped to the form: Next renders its own route announcer as an empty `role="alert"` at the end
  // of the body, and an unscoped query finds that instead of the message.
  const problem = page.locator("form").getByRole("alert");
  await expect(problem).toBeVisible();
  await expect(problem).toHaveAttribute("aria-live", "assertive");
  await expect(problem).toContainText("Look over the fields marked below and try again.");

  const problemBox = await problem.boundingBox();
  const firstFieldBox = await page.getByLabel("Property address").boundingBox();
  expect(problemBox?.y ?? -1, "the message is on screen at 390").toBeGreaterThanOrEqual(0);
  expect(
    (problemBox?.y ?? 0) + (problemBox?.height ?? 0),
    "the message ends inside the frame at 390",
  ).toBeLessThanOrEqual(844);
  expect(problemBox?.y ?? 0, "the message is above the first field").toBeLessThan(
    firstFieldBox?.y ?? 0,
  );

  /**
   * The control the refusal named carries it, rather than the person being told to go looking.
   *
   * The ids are resolved with `getElementById` rather than turned into a selector. React's
   * `useId` emits ids with characters that are not valid in a CSS identifier, so `#${id}` is a
   * selector that throws rather than a check that fails, which would read as a broken test instead
   * of a broken screen.
   */
  await expect(state).toHaveAttribute("aria-invalid", "true");
  const describedText = await state.evaluate((control) =>
    (control.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .filter((id) => id !== "")
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
      .join(" | "),
  );
  expect(describedText, "the state control is described by its inline error").toContain(
    "This one needs another look.",
  );

  await expectNoHorizontalOverflow(page);
  await expectAxeClean(page);
});

/**
 * 006D-AC-014. The email preview renders both messages, each in its own frame at 600px, and each
 * one is captured like any other screen by the matrix above.
 */
test("the email preview renders both account emails at the mail-client width", async ({ page }) => {
  await blockAnythingOffOrigin(page);
  await useStoredTheme(page, "light");
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/email-preview");
  await settleForScreenshot(page);

  const frames = page.locator("iframe[data-email-preview]");
  await expect(frames).toHaveCount(2);
  for (const frame of await frames.all()) {
    const box = await frame.boundingBox();
    expect(box?.width).toBe(600);
  }
  await expect(
    page.getByRole("heading", { name: "Reset your Automated LO password" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Confirm your email for Automated LO" }),
  ).toBeVisible();

  // Each email document on its own terms: its language, its title, its link's name, and its
  // contrast, with only the two page-structure rules that do not apply to an email switched off.
  await expectAxeClean(page, { disableRules: PAGE_STRUCTURE_RULES });
});

/**
 * The boundary page's own contract, from the side that serves it.
 *
 * The three surfaces are asserted by name rather than only photographed, because a baseline is
 * only compared on the runner that drew it and this is a claim that has to hold everywhere. The
 * resend control is asserted too: the unverified notice without it is a sentence telling somebody
 * to look in an inbox with no way to make the message arrive again.
 */
test("the boundary page renders the error state, the loading state, and the unverified notice", async ({
  page,
}) => {
  await blockAnythingOffOrigin(page);
  await useStoredTheme(page, "light");
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/design-surfaces");
  await settleForScreenshot(page);

  await expect(
    page.getByRole("heading", { name: "We couldn't load your workspace" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Loading your workspace" })).toBeVisible();
  await expect(page.locator("[aria-busy='true']")).toHaveCount(1);
  await expect(
    page.getByText("Confirm your email so you can reset your password later."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend the link." })).toBeVisible();
});

/** 006D-AC-018. Nothing a person can reach in the product links to the demo route. */
test("no screen links to the demo route", async ({ page }) => {
  await blockAnythingOffOrigin(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const { path } of SYNTHETIC_SCREENS) {
    await page.goto(path);
    const demoLinks = await page
      .locator("a[href]")
      .evaluateAll((elements) =>
        elements
          .map((element) => element.getAttribute("href") ?? "")
          .filter((href) => href === "/demo" || href.startsWith("/demo/")),
      );
    expect(demoLinks, `${path} links to the demo route`).toEqual([]);
  }
});

/**
 * PRD-006d D3's named states on the create screen and on a campaign a person has actually saved.
 *
 * The draft itself, and the two open-house windows that separate a ready campaign from one that
 * needs changes, live in `helpers/open-house-draft.ts`, so the review suite reaches the same
 * campaign by the same route.
 */

for (const theme of ["light", "dark"] as const satisfies readonly ReviewTheme[]) {
  /**
   * The saving state is the one state a person only ever sees while a request is still travelling,
   * so it is held by slowing the request rather than by pretending to make one: the real route is
   * called, its answer is simply not delivered until the pictures are taken. The button carries the
   * label change the brief asks for, which is why the label is asserted before anything is captured.
   */
  test(`the create screen's saving state meets the bar at every frame in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const externalRequests = await blockAnythingOffOrigin(page);
    await useStoredTheme(page, theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/marketing/campaigns/new");
    await expectThemeResolved(page, theme);
    await settleForScreenshot(page);
    await fillTheOpenHouseDraft(page, READY_OPEN_HOUSE);

    let deliverTheAnswer: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      deliverTheAnswer = resolve;
    });
    await page.route("**/api/campaigns/preflight", async (route) => {
      await held;
      await route.continue();
    });

    await page.getByRole("button", { name: "Save and run the checks" }).click();
    const saving = page.getByRole("button", { name: "Running the checks" });
    await expect(saving).toBeVisible();
    await expect(saving).toBeDisabled();

    try {
      await captureNamedState(page, {
        screen: "campaign-create",
        state: "saving",
        theme,
        // The request in flight is the state, so there is no idle network to wait for.
        idleNetwork: false,
      });
    } finally {
      deliverTheAnswer();
    }
    await expect(page.getByRole("heading", { name: "Ready for approval" })).toBeVisible();

    expect(externalRequests).toEqual([]);
  });

  /**
   * The ready result, and then the campaign's own page as the person who wrote it sees it.
   *
   * Synthetic mode's principal holds `campaign_creator`
   * (`apps/web/src/server/authenticated-principal.ts:210-224`), and `campaignMayBeApprovedBy`
   * (`packages/application/src/campaign-workspace-read.ts:110-119`) needs an approval role, so the
   * campaign screen this reaches is exactly the permission-restricted one: the state a creator is
   * always in, with the hand-off control instead of an approve control.
   */
  test(`a ready campaign and its permission-restricted detail meet the bar in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const externalRequests = await blockAnythingOffOrigin(page);
    await useStoredTheme(page, theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/marketing/campaigns/new");
    await expectThemeResolved(page, theme);
    await settleForScreenshot(page);
    await fillTheOpenHouseDraft(page, READY_OPEN_HOUSE);
    await page.getByRole("button", { name: "Save and run the checks" }).click();
    await expect(page.getByRole("heading", { name: "Ready for approval" })).toBeVisible();

    await captureNamedState(page, {
      screen: "campaign-create",
      state: "ready-for-approval",
      theme,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("link", { name: "Open campaign" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await settleForScreenshot(page);
    await expect(page.getByRole("button", { name: "Approve this version" })).toBeDisabled();

    await captureNamedState(page, {
      screen: "campaign-detail",
      state: "permission-restricted",
      theme,
    });

    await page.setViewportSize({ width: 1180, height: 900 });
    await settleForScreenshot(page);
    await expectKeyboardReachesEveryControl(page);

    expect(externalRequests).toEqual([]);
  });

  test(`a campaign that needs changes meets the bar at every frame in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const externalRequests = await blockAnythingOffOrigin(page);
    await useStoredTheme(page, theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/marketing/campaigns/new");
    await expectThemeResolved(page, theme);
    await settleForScreenshot(page);
    await fillTheOpenHouseDraft(page, FINISHED_OPEN_HOUSE);
    await page.getByRole("button", { name: "Save and run the checks" }).click();
    await expect(page.getByRole("heading", { name: "Needs changes" })).toBeVisible();

    await captureNamedState(page, {
      screen: "campaign-create",
      state: "needs-changes",
      theme,
    });

    await page.setViewportSize({ width: 1180, height: 900 });
    await settleForScreenshot(page);
    await expectKeyboardReachesEveryControl(page);

    expect(externalRequests).toEqual([]);
  });
}
