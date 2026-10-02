import { expect, test, type Page } from "@playwright/test";

import {
  FULL_PAGE_SCREENSHOT_TIMEOUT_MS,
  REVIEW_FRAMES,
  captureNamedState,
  expectAxeClean,
  expectKeyboardReachesEveryControl,
  expectNoHorizontalOverflow,
  expectTargetsAreLargeEnough,
  expectThePageFillsTheContentColumn,
  expectThePageOpensAtTheTopOfItsContent,
  expectThemeResolved,
  expectTypographyOnBrief,
  expectZeroMotionUnderReducedMotion,
  screenshotName,
  settleForScreenshot,
  useStoredTheme,
  warmFullPageCapture,
  type ReviewTheme,
} from "./helpers/design-quality.js";
import { withAnEmptyCampaignWorkspace } from "./helpers/empty-campaign-workspace.js";
import {
  POPULATED_CAMPAIGNS,
  withAPopulatedCampaignWorkspace,
} from "./helpers/populated-campaign-workspace.js";
import {
  RATE_CLAIM_HEADLINE,
  SAMPLE_ADS,
  saveACampaign,
  stepTwoPath,
  verdictOnStepThree,
} from "./helpers/launch-an-ad.js";

/**
 * PRD-006d 006D-AC-007 through 006D-AC-014, for the screens synthetic mode serves.
 *
 * This is the machine half of the scored review recorded in
 * `library/requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-prd-006d-design-review.md`.
 * The rubric's section 6 says a reviewer scores what a machine cannot; everything a machine can
 * check is checked here, at all four frames in both themes, so a reviewer's eye is spent on
 * hierarchy and consistency rather than on re-counting pixels.
 *
 * The account screens are not here (the seven guided-setup steps are gone with the walkthrough,
 * PRD-009b D4). They need a session and a real database, so they run in the `review` project inside `pnpm test:db`
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
  { screen: "campaign-detail", path: "/marketing/campaigns/synthetic-open-house-001" },
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

/**
 * Screens the matrix below takes no `default` picture of, because the rubric names every state
 * they have and each named state has its own capture further down.
 *
 * The campaigns list is "empty and populated" in the rubric's section 4, and the matrix's picture
 * of it was whichever of the two the workspace happened to hold when the matrix ran. On the
 * runner, whose workspace starts empty and whose matrix runs before any test saves a campaign,
 * that was the empty list, so the sign-off's populated row had no populated picture behind it
 * (PRD-008d, the baseline review of 2026-10-01). The two states are now taken from their own
 * fixture workspaces, `campaigns--empty` and `campaigns--populated`, and there is no
 * `campaigns--default` for a reader to mistake for either. The screen stays in
 * `SYNTHETIC_SCREENS`, so the motion, keyboard, and demo-link checks still visit it.
 */
const NAMED_STATES_ONLY: ReadonlySet<string> = new Set(["campaigns"]);

for (const { screen, path } of SYNTHETIC_SCREENS.filter(
  (candidate) => !NAMED_STATES_ONLY.has(candidate.screen),
)) {
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
        // Axis 3: the body step at the root, every text at a step, every timestamp in the data
        // font (rubric section 5, D-009).
        await expectTypographyOnBrief(page);
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
 * So the failure is produced and then measured. PRD-009d replaced the create screen with step 2 of
 * "Launch an ad", where a daily budget under the ruleset's floor is refused before anything is
 * sent: the message is said once at the top of the form, focus moves to it, and the budget field
 * carries its own sentence.
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
  // PRD-009d: the create screen is step 2 of "Launch an ad". A daily budget under the ruleset's
  // floor is a refusal the page makes before anything is sent.
  await page.goto(stepTwoPath(SAMPLE_ADS.firstHome));
  await settleForScreenshot(page);

  const state = page.getByLabel("Daily budget", { exact: false });
  await state.fill("1");
  await page.getByRole("button", { name: "Save and check" }).click();

  // Scoped to step 2: Next renders its own route announcer as an empty `role="alert"` at the end
  // of the body, and an unscoped query finds that instead of the message.
  const problem = page.locator("[data-launch-step='2']").getByRole("alert");
  await expect(problem).toBeVisible();
  await expect(problem).toHaveAttribute("aria-live", "assertive");
  await expect(problem).toContainText("Look over the fields marked below and try again.");

  const problemBox = await problem.boundingBox();
  const firstFieldBox = await page.getByLabel("Headline", { exact: false }).boundingBox();
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
  expect(describedText, "the daily budget is described by its inline error").toContain(
    "Choose a daily budget from $5 to $1,000.",
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
  /**
   * Polled, because this page holds no control for `expectStylesHaveApplied` to look at: its only
   * links are inside the frames. A frame photographed before the page's own sheet applies is the
   * browser's bare 300px frame and its 2px border, which is the 304 a full run measured once on
   * 2026-10-01 (113 other tests passed, and six runs of this test alone all read 600). The
   * assertion is unchanged: each frame is 600px wide once the page is styled.
   */
  for (const frame of await frames.all()) {
    await expect
      .poll(async () => (await frame.boundingBox())?.width, {
        message: "the email frame was still arriving at its width",
      })
      .toBe(600);
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
 * Brief section 9, "blue means informational", and the notice pattern `permission-screen.module.css`
 * carries over from the setup page's styles: every "nothing goes out" notice title carries the informational tone, on every screen.
 *
 * PRD-008d, the scored baseline review of 2026-10-01. The title's colour was decided by the order
 * the bundle loaded two equally specific rules in, so it was blue on some screens and dark on
 * others, and the dependency group's Next.js swapped which. A picture is only compared on the
 * runner that drew it, so the colour is measured here, against the token, in both themes.
 */
test("every notice title carries the informational tone, whatever order the styles load in", async ({
  page,
}) => {
  await blockAnythingOffOrigin(page);
  await page.setViewportSize({ width: 1180, height: 900 });
  // PRD-009d: "Launch an ad" replaced the create screen and carries no notice card of its own.
  const notices = [
    { path: "/brand", title: "Suggestions only. You decide what's saved." },
  ] as const;
  for (const theme of ["light", "dark"] as const satisfies readonly ReviewTheme[]) {
    await useStoredTheme(page, theme);
    for (const notice of notices) {
      await page.goto(notice.path);
      await expectThemeResolved(page, theme);
      await settleForScreenshot(page);
      const title = page.getByRole("main").locator("strong", { hasText: notice.title }).first();
      await expect(title, `${notice.path} in ${theme}`).toBeVisible();
      const [actual, informational] = await title.evaluate((element) => {
        const probe = document.createElement("span");
        probe.style.color = "var(--st-info-fg)";
        element.append(probe);
        const expected = getComputedStyle(probe).color;
        probe.remove();
        return [getComputedStyle(element).color, expected];
      });
      expect(actual, `${notice.path} in ${theme}: the notice title's colour`).toBe(informational);
    }
  }
});

/**
 * Rubric axis 7, layout at every frame, inside a component as well as across the page. A metric
 * card's state label stays inside its card.
 *
 * PRD-008d, the scored baseline review of 2026-10-01: the label does not shrink, and at 1440 and
 * 1180 the overview's four metric cards are narrower than a title and a label side by side, so
 * "Not connected" was clipped and "Needs a refresh" ran outside its card. The page-level overflow
 * check cannot see either, because nothing scrolls sideways.
 *
 * Rubric section 5, D-010 (ruled 2026-10-01). The same holds for the value, measured by the glyphs
 * it draws rather than by its box, because a value that overruns its card overruns inside a box
 * that does not grow: the bootstrap `section { max-width: 44rem }` put four cards in 704px at 1440,
 * and "Unavailable" painted over its card's border. The ruling asks for both themes, because each
 * theme is its own rendering of every card. And the overview takes its whole content column, as
 * the campaigns list does, instead of the 704px strip the cap centred in it.
 */
for (const theme of ["light", "dark"] as const satisfies readonly ReviewTheme[]) {
  test(`every metric card keeps its state label and its value inside the card at every frame in ${theme}`, async ({
    page,
  }) => {
    await blockAnythingOffOrigin(page);
    await useStoredTheme(page, theme);
    await page.goto("/overview");
    await expectThemeResolved(page, theme);
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await settleForScreenshot(page);
      const escaped = await page.locator(".oalo-metric").evaluateAll((cards) =>
        cards.flatMap((card) => {
          const name = card.querySelector(".oalo-metric__label")?.textContent ?? "a metric";
          const box = card.getBoundingClientRect();
          const style = getComputedStyle(card);
          const contentLeft =
            box.left +
            Number.parseFloat(style.borderLeftWidth) +
            Number.parseFloat(style.paddingLeft);
          const contentRight =
            box.right -
            Number.parseFloat(style.borderRightWidth) -
            Number.parseFloat(style.paddingRight);
          const labels = [...card.querySelectorAll(".oalo-state-label")]
            .map((label) => label.getBoundingClientRect())
            .filter((label) => label.left < box.left - 0.5 || label.right > box.right + 0.5)
            .map(() => `${name}: its state label leaves the card`);
          const values = [...card.querySelectorAll(".oalo-metric__value")]
            .map((value) => {
              const glyphs = document.createRange();
              glyphs.selectNodeContents(value);
              return { text: value.textContent ?? "", box: glyphs.getBoundingClientRect() };
            })
            .filter(
              ({ box: drawn }) =>
                drawn.left < contentLeft - 0.5 || drawn.right > contentRight + 0.5,
            )
            .map(({ text }) => `${name}: its value "${text}" leaves the card's content box`);
          return [...labels, ...values];
        }),
      );
      expect.soft(escaped, `at ${frame.name} in ${theme}`).toEqual([]);
      await expectThePageFillsTheContentColumn(page);
    }
  });
}

/**
 * Rubric axes 1 and 2. A link drawn as an action keeps its own height inside a grid.
 *
 * PRD-008d, the second redraw of 2026-10-01, finding R-14. The overview's action grids let every
 * item stretch to its row, so beside an unavailable action and the sentences that explain it, "See
 * your leads" was a button some 200px tall at 1440 and 1180, and the wider column D-010 gave the
 * overview made it wider as well.
 */
test("the overview's action links keep their own height at every frame", async ({ page }) => {
  await blockAnythingOffOrigin(page);
  await useStoredTheme(page, "light");
  await page.goto("/overview");
  for (const frame of REVIEW_FRAMES) {
    await page.setViewportSize({ width: frame.width, height: frame.height });
    await settleForScreenshot(page);
    const stretched = await page
      .locator("main [class*='__quickActions'] > a")
      .evaluateAll((links) =>
        links
          .filter((link) => {
            const style = getComputedStyle(link);
            const text = document.createRange();
            text.selectNodeContents(link);
            /**
             * The link's natural height is its lines times its line height, not the height of the
             * glyphs' box. With Inter the glyph box of a 16px line is 20px while the line is 24px,
             * so measuring the glyph box called an unstretched link 4px per line too short. One
             * rect comes back per line of text; where `line-height` is `normal` and so not a
             * length, the glyph box per line is the best the page can say.
             */
            const lines = Math.max(
              new Set([...text.getClientRects()].map((rect) => Math.round(rect.top))).size,
              1,
            );
            const lineHeight = Number.parseFloat(style.lineHeight);
            const natural =
              lines *
                (Number.isFinite(lineHeight)
                  ? lineHeight
                  : text.getBoundingClientRect().height / lines) +
              Number.parseFloat(style.paddingTop) +
              Number.parseFloat(style.paddingBottom) +
              Number.parseFloat(style.borderTopWidth) +
              Number.parseFloat(style.borderBottomWidth);
            const floor = Number.parseFloat(style.minHeight) || 0;
            return link.getBoundingClientRect().height > Math.max(natural, floor) + 1;
          })
          .map((link) => link.textContent?.trim() ?? "a link"),
      );
    expect(stretched, `at ${frame.name} an action link is stretched to its row`).toEqual([]);
  }
});

/**
 * PRD-006d D3's named states on a campaign a person has actually saved.
 *
 * PRD-009d: each campaign is saved through "Launch an ad" (`helpers/launch-an-ad.ts`), so the
 * review suite reaches the same campaign by the same route. Words that claim a rate are what
 * separate a campaign that needs changes from one that is ready.
 */

for (const theme of ["light", "dark"] as const satisfies readonly ReviewTheme[]) {
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
    const ref = await saveACampaign(page, { ad: SAMPLE_ADS.firstHome, place: "Austin, TX" });
    await expectThemeResolved(page, theme);
    await expect(verdictOnStepThree(page)).toContainText("Checks passed");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/marketing/campaigns/${ref}`);
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
    const ref = await saveACampaign(page, {
      ad: SAMPLE_ADS.firstHome,
      place: "Austin, TX",
      headline: RATE_CLAIM_HEADLINE,
    });
    await expectThemeResolved(page, theme);
    await expect(verdictOnStepThree(page)).toContainText("Needs changes");
    // PRD-009d: the findings with their notes are on the campaign's own page.
    await page.goto(`/marketing/campaigns/${ref}`);
    await expect(page.getByRole("heading", { name: "Needs changes" })).toBeVisible();

    /**
     * Rubric axis 2. PRD-008d, the second redraw of 2026-10-01, finding R-18: a finding's note
     * ("Fix this before approving") ran inline and touched the support details under it. It keeps
     * `--space-3` between itself and what follows, at every frame.
     */
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await settleForScreenshot(page);
      const tight = await page.locator("main [class*='__findings'] article").evaluateAll((cards) =>
        cards.flatMap((card) => {
          const note = card.querySelector(":scope > small");
          const next = note?.nextElementSibling;
          if (note === null || note === undefined || next === null || next === undefined) return [];
          const probe = document.createElement("span");
          probe.style.display = "none";
          probe.style.width = "var(--space-3)";
          card.append(probe);
          const space3 = Number.parseFloat(getComputedStyle(probe).width);
          probe.remove();
          const between = next.getBoundingClientRect().top - note.getBoundingClientRect().bottom;
          return between < space3 - 0.5 ? [`${String(Math.round(between))}px`] : [];
        }),
      );
      expect(tight, `at ${frame.name} a finding's note touches what follows it`).toEqual([]);
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.setViewportSize({ width: 1180, height: 900 });
    await settleForScreenshot(page);
    await expectKeyboardReachesEveryControl(page);

    expect(externalRequests).toEqual([]);
  });

  /**
   * PRD-008d 008D-AC-007, S-2: the campaigns list's empty state, the sign-off's "Campaigns list,
   * empty" row.
   *
   * The tests above save campaigns into the synthetic workspace, so the list a later picture sees
   * depends on the order the suite ran in. The empty state is therefore taken from a fixture
   * workspace with no campaigns (`helpers/empty-campaign-workspace.ts`), which swaps the synthetic
   * store for an empty one around this test alone and puts it back afterwards, so no other picture
   * in the suite changes.
   *
   * The state's words and its way onward are asserted before anything is photographed: "No
   * campaigns yet" is a claim about the workspace, and the one control on the card is the thing
   * the state exists to offer. PRD-009e 009E-AC-011: it is also the page's one primary action.
   */
  test(`the campaigns list's empty state meets the bar at every frame in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const externalRequests = await blockAnythingOffOrigin(page);
    await withAnEmptyCampaignWorkspace(async () => {
      await useStoredTheme(page, theme);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/marketing/campaigns");
      await expectThemeResolved(page, theme);
      await settleForScreenshot(page);

      const main = page.getByRole("main");
      await expect(main.getByRole("heading", { level: 1, name: "Campaigns" })).toBeVisible();
      await expect(main.getByText("No campaigns yet", { exact: true })).toBeVisible();
      await expect(
        main.getByText("Pick an ad from the library to set up your first one."),
      ).toBeVisible();
      // Rubric axis 9: the shared `empty` state, not a card assembled on the page.
      await expect(main.locator(".oalo-async-state[data-state='empty']")).toContainText(
        "No campaigns yet",
      );
      await expect(main.locator("[data-campaign-row]")).toHaveCount(0);
      await expectThePageOpensAtTheTopOfItsContent(page);
      await expectThePageFillsTheContentColumn(page);
      // 009E-AC-011: exactly one "Launch an ad", and it is inside the empty state.
      await expect(main.getByRole("link", { name: "Launch an ad" })).toHaveCount(1);
      await expect(
        main
          .locator(".oalo-async-state[data-state='empty']")
          .getByRole("link", { name: "Launch an ad" }),
      ).toHaveAttribute("href", "/marketing/campaigns/new");

      await captureNamedState(page, { screen: "campaigns", state: "empty", theme });

      await page.setViewportSize({ width: 1180, height: 900 });
      await settleForScreenshot(page);
      await expectKeyboardReachesEveryControl(page);
    });

    expect(externalRequests).toEqual([]);
  });

  /**
   * PRD-008d 008D-AC-010, the sign-off's "Campaigns list, populated" row.
   *
   * Taken from a fixture workspace holding exactly the two campaigns
   * `helpers/populated-campaign-workspace.ts` saves through "Launch an ad", one ready for
   * approval and one that needs changes, so the picture is the same list on every run and on
   * every machine. The list's contents are asserted before anything is photographed: both rows,
   * newest change first (PRD-009e 009E-AC-009), each with its ad's name as the link, its status
   * chip, and no empty state.
   */
  test(`the campaigns list's populated state meets the bar at every frame in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const externalRequests = await blockAnythingOffOrigin(page);
    await useStoredTheme(page, theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    await withAPopulatedCampaignWorkspace(page, async () => {
      await page.goto("/marketing/campaigns");
      await expectThemeResolved(page, theme);
      await settleForScreenshot(page);

      const main = page.getByRole("main");
      await expect(main.getByRole("heading", { level: 1, name: "Campaigns" })).toBeVisible();
      await expect(main.getByText("No campaigns yet", { exact: true })).toHaveCount(0);
      // One table row for each campaign, the last one saved first.
      const rows = main.locator("[data-campaign-table] [data-campaign-row]");
      await expect(rows).toHaveCount(POPULATED_CAMPAIGNS.length);
      for (const [index, campaign] of [...POPULATED_CAMPAIGNS].reverse().entries()) {
        await expect(rows.nth(index).getByRole("link", { name: campaign.ad.name })).toBeVisible();
        await expect(rows.nth(index)).toContainText(campaign.verdict);
      }
      await expect(main.getByRole("link", { name: "Launch an ad" })).toHaveCount(1);
      await expectThePageOpensAtTheTopOfItsContent(page);
      await expectThePageFillsTheContentColumn(page);
      // Rubric axis 1: a row's link is never drawn larger than the page's own title.
      const [pageTitle, rowLink] = await Promise.all(
        [main.getByRole("heading", { level: 1 }), rows.first().getByRole("link")].map(
          async (element) =>
            element.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize)),
        ),
      );
      expect(rowLink, "the row link is smaller than the page title").toBeLessThan(pageTitle ?? 0);

      await captureNamedState(page, { screen: "campaigns", state: "populated", theme });

      await page.setViewportSize({ width: 1180, height: 900 });
      await settleForScreenshot(page);
      await expectKeyboardReachesEveryControl(page);
    });

    expect(externalRequests).toEqual([]);
  });
}
