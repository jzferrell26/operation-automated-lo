import { expect, test, type Page } from "@playwright/test";

import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectKeyboardReachesEveryControl,
  expectNoHorizontalOverflow,
  expectTargetsAreLargeEnough,
  expectThemeResolved,
  screenshotName,
  useStoredTheme,
  type ReviewTheme,
} from "../helpers/design-quality.js";
import {
  expectNoExternalRequests,
  guardLocalOrigin,
  restartGuidedSetup,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-006d 006D-AC-007 through 006D-AC-012, for the screens only a real session reaches.
 *
 * The account screens are 404 in synthetic mode by design: `assertAuthPageIsServed` refuses to
 * serve a sign-in on a deployment that has no workspace. So they are reviewed here, in the `review`
 * project inside `pnpm test:db`, against the disposable database, the seeded people, and the TLS
 * terminator the `__Host-` session cookie requires. It is the same rubric and the same helpers as
 * `tests/browser/design-quality.spec.ts`; only the server differs.
 *
 * **This file creates no account and signs in twice.** That is a deliberate shape, not a shortcut.
 * The first version of it created a fresh account per frame and theme and signed in once per cell,
 * and the run's own rate limiter did exactly what it is there for: the last sign-up in the run was
 * refused with "There have been too many attempts", and the failure landed on PRD-006c's
 * `guided-setup.tablet-anchoring` spec rather than here. A review suite that spends the product's
 * rate-limit budget is a review suite that breaks the specs sharing the run with it. So the
 * session-bound screens are walked inside one signed-in session each, looping the frames and
 * themes in place.
 *
 * Every screen here shows seeded review data. No baseline under `tests/visual/screens/review/`
 * contains a real name, a real address, or a token.
 */

/** The account screens, each reachable without a session. */
const ACCOUNT_SCREENS = Object.freeze([
  { screen: "sign-in", path: "/sign-in" },
  { screen: "choose-workspace", path: "/sign-in/choose" },
  { screen: "sign-up", path: "/sign-up" },
  { screen: "forgot-password", path: "/forgot-password" },
  { screen: "reset-password", path: "/reset-password?token=review-placeholder-token" },
  { screen: "verify-email", path: "/verify-email?token=review-placeholder-token" },
] as const);

const THEMES = ["light", "dark"] as const satisfies readonly ReviewTheme[];

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForLoadState("networkidle");
}

/**
 * Inside a session the theme is chosen the way a person chooses it, from the control in the
 * header, because that is the only way to change it without reloading the page and losing the
 * session's place in the walkthrough.
 */
async function chooseThemeFromTheHeader(page: Page, theme: ReviewTheme): Promise<void> {
  await page.getByRole("radio", { name: theme === "light" ? "Light" : "Dark" }).click();
  await expectThemeResolved(page, theme);
  // The segmented control moves its fill over `--motion-base`; sampling before it settles reads a
  // blended pair that exists for a moment and is not a token.
  await page.waitForTimeout(400);
}

for (const { screen, path } of ACCOUNT_SCREENS) {
  for (const theme of THEMES) {
    for (const frame of REVIEW_FRAMES) {
      test(`${screen} at ${frame.name} in ${theme} meets the design quality bar`, async ({
        page,
      }) => {
        const guard = await guardLocalOrigin(page);
        await useStoredTheme(page, theme);
        await page.setViewportSize({ width: frame.width, height: frame.height });
        await page.goto(path);
        await expectThemeResolved(page, theme);
        await settle(page);

        await expectAxeClean(page);
        await expectNoHorizontalOverflow(page);
        await expectTargetsAreLargeEnough(page);
        await expect(page).toHaveScreenshot(screenshotName(screen, frame.name, theme), {
          fullPage: true,
        });

        expectNoExternalRequests(guard);
      });
    }
  }
}

for (const { screen, path } of ACCOUNT_SCREENS) {
  test(`${screen} is operable with the keyboard alone, with the ring the brief specifies`, async ({
    page,
  }) => {
    const guard = await guardLocalOrigin(page);
    await useStoredTheme(page, "dark");
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto(path);
    await settle(page);

    await expectKeyboardReachesEveryControl(page);
    expectNoExternalRequests(guard);
  });
}

/**
 * 006D-AC-011 on the account screens. A refused sign-in says what happened in a region that
 * announces, and at 390 the sentence is above the first field, so it is on screen without
 * scrolling. The credentials are deliberately wrong; the server's answer is the same sentence for
 * every wrong pair, which is the security property PRD-006a 006A-AC-013 owns. One attempt, so the
 * rate-limit budget the rest of the run needs is untouched.
 *
 * The alert is looked for inside the form. Next renders its own route announcer as a `role="alert"`
 * at the end of the body, so an unscoped query finds that empty region at the bottom of the page
 * instead of the message, and the assertion would be about nothing.
 */
test("a refused sign-in is announced and on screen at 390", async ({ page }) => {
  const guard = await guardLocalOrigin(page);
  await useStoredTheme(page, "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");

  await page.getByLabel("Email").fill("nobody@oalo.invalid");
  await page.getByLabel("Password", { exact: true }).fill("not the right password");
  await page.getByRole("button", { name: "Sign in" }).click();

  const problem = page.locator("form").getByRole("alert");
  await expect(problem).toBeVisible();
  await expect(problem).toHaveAttribute("aria-live", "assertive");
  await expect(problem).not.toBeEmpty();

  const problemBox = await problem.boundingBox();
  const fieldBox = await page.getByLabel("Email").boundingBox();
  expect(problemBox?.y ?? 0).toBeLessThan(fieldBox?.y ?? 0);
  expect(problemBox?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((problemBox?.y ?? 0) + (problemBox?.height ?? 0)).toBeLessThanOrEqual(844);

  await expectNoHorizontalOverflow(page);
  await expectAxeClean(page);
  expectNoExternalRequests(guard);
});

/**
 * 006D-AC-008 and 006D-AC-012 for the change-password screen, which lives inside the signed-in
 * shell. One sign-in, then all eight frame-and-theme cells in place.
 */
test("change-password meets the design quality bar at every frame in both themes", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const guard = await guardLocalOrigin(page);
  const { creatorEmail, password } = seededCredentials();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, creatorEmail, password);
  // The seeded person's progress lives on the server and survives the run, so the walkthrough is
  // put back to a known place and then dismissed before anything is measured.
  await restartGuidedSetup(page);
  await page.getByRole("button", { name: "Not now" }).click();

  for (const theme of THEMES) {
    await page.goto("/settings/account");
    await chooseThemeFromTheHeader(page, theme);
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await settle(page);

      await expectAxeClean(page);
      await expectNoHorizontalOverflow(page);
      await expectTargetsAreLargeEnough(page);
      await expect(page).toHaveScreenshot(screenshotName("change-password", frame.name, theme), {
        fullPage: true,
      });
    }
  }

  expectNoExternalRequests(guard);
});

/**
 * 006C-AC-020's review half at the two frames PRD-006c's own accessibility matrix leaves out, and
 * 006D-AC-018 from the review side.
 *
 * It signs in as the seeded creator and restarts the walkthrough rather than creating an account,
 * so the run's sign-up budget stays where PRD-006c's specs need it. `restartGuidedSetup` is what a
 * person would use, and using it here is what makes a spec about a seeded person repeatable.
 */
test("the guided setup meets the bar at 1440 and 768, in both themes", async ({ page }) => {
  test.setTimeout(240_000);
  const guard = await guardLocalOrigin(page);
  const { creatorEmail, password } = seededCredentials();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, creatorEmail, password);

  for (const theme of THEMES) {
    await chooseThemeFromTheHeader(page, theme);
    for (const frame of REVIEW_FRAMES.filter((candidate) =>
      ["1440", "768"].includes(candidate.name),
    )) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await restartGuidedSetup(page);
      await settle(page);

      await expectAxeClean(page);
      await expectTargetsAreLargeEnough(page);
      await expect(page).toHaveScreenshot(
        screenshotName("guided-setup", frame.name, theme, "step-1-welcome"),
      );

      await page.getByRole("button", { name: "Let's go" }).click();
      await expect(page.getByRole("dialog", { name: "Your details" })).toBeVisible();
      await settle(page);
      await expectAxeClean(page);
      await expectNoHorizontalOverflow(page);
      await expect(page).toHaveScreenshot(
        screenshotName("guided-setup", frame.name, theme, "step-2-your-details"),
      );

      await page.getByRole("button", { name: "Not now" }).click();
    }
  }

  // 006D-AC-018: the one surface PRD-006d put out of scope is not served here and nothing links
  // to it, so a person given the review URL cannot arrive at it.
  await page.goto("/demo");
  await expect(
    page.getByRole("link", { name: /walkthrough/iu }),
    "review mode served the demo route",
  ).toHaveCount(0);

  await page.goto("/overview");
  const demoLinks = await page
    .locator("a[href]")
    .evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute("href") ?? "")
        .filter((href) => href === "/demo" || href.startsWith("/demo/")),
    );
  expect(demoLinks).toEqual([]);

  expectNoExternalRequests(guard);
});

/** 006D-AC-014's mode gate, from the other side: the preview route is not served in review mode. */
test("the email preview route is not served in review mode", async ({ page }) => {
  await page.goto("/email-preview");
  await expect(page.locator("iframe[data-email-preview]")).toHaveCount(0);
});
