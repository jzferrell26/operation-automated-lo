import { expect, test, type Page } from "@playwright/test";

import { SIGN_UP } from "../../../apps/web/src/copy/auth-messages.js";
import {
  REVIEW_FRAMES,
  captureNamedState,
  expectAxeClean,
  expectKeyboardReachesEveryControl,
  expectNoHorizontalOverflow,
  expectPanelFooterIsOnScreen,
  expectTargetsAreLargeEnough,
  expectThemeResolved,
  expectZeroMotionUnderReducedMotion,
  screenshotName,
  settleForScreenshot,
  useStoredTheme,
  type ReviewFrame,
} from "../helpers/design-quality.js";
import {
  expectNoExternalRequests,
  guardLocalOrigin,
  restartGuidedSetup,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";
import {
  chooseThemeFromTheHeader,
  putTheWalkthroughAside,
  REVIEW_THEMES,
} from "./helpers/review-session.js";

/**
 * PRD-006d 006D-AC-007 through 006D-AC-012, for the screens only a real session reaches.
 *
 * The account screens are 404 in synthetic mode by design: `assertAuthPageIsServed` refuses to
 * serve a sign-in on a deployment that has no workspace. So they are reviewed here, in the `review`
 * project inside `pnpm test:db`, against the disposable database, the seeded people, and the TLS
 * terminator the `__Host-` session cookie requires. It is the same rubric and the same helpers as
 * `tests/browser/design-quality.spec.ts`; only the server differs.
 *
 * **This file creates no account.** That is a deliberate shape, not a shortcut. The first version
 * of it created a fresh account per frame and theme and signed in once per cell, and the run's own
 * rate limiter did exactly what it is there for: the last sign-up in the run was refused with
 * "There have been too many attempts", and the failure landed on PRD-006c's
 * `guided-setup.tablet-anchoring` spec rather than here. A review suite that spends the product's
 * rate-limit budget is a review suite that breaks the specs sharing the run with it. So the
 * session-bound screens are walked inside one signed-in session each, looping the frames and
 * themes in place. The two sign-up submissions below are refusals against an address that already
 * has an account, so they create nothing either.
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

/**
 * PRD-006d D3's sign-up refusal state, and the arithmetic that used to keep it out of the suite.
 *
 * `handlePasswordSignUp` spends one `sign_up_ip` attempt on every submission before it parses the
 * body (`apps/web/src/server/password-authentication-handler.ts:771`), and the limit is ten an
 * hour per address (the same file, line 118). Until 2026-09-20 PRD-006c's four specs spent exactly
 * ten of them in one run: four in `guided-setup.accessibility.spec.ts`, three in
 * `guided-setup.tablet-anchoring.spec.ts`, two in `guided-setup.resume.spec.ts`, and one in
 * `guided-setup.timed.spec.ts`. Adding two here was measured on 2026-09-19: the run's last two
 * sign-ups were refused with "There have been too many attempts" and two PRD-006c specs failed on
 * a sign-up that never returned.
 *
 * F-22 made room rather than arguing about it. The accessibility matrix now walks one account
 * instead of four and the anchoring spec one instead of three, so those four specs spend five;
 * `guided-setup.walkthrough-captures.spec.ts` spends one more for the workspace owner that step
 * 6's approve branch needs, and the two submissions below bring a run to eight of ten. The state
 * is in the suite on every run instead of being a hand-staged row in the sign-off document.
 *
 * One submission per theme, because a public account screen carries no theme control and the theme
 * is chosen before the page loads. The refusal is React state on the page, so it survives the four
 * resizes and all four frames come from that one submission.
 */
const EXISTING_ADDRESS_NAME = "Review Sign Up";
/** Passes the policy, so the refusal on screen is the one under review. */
const EXISTING_ADDRESS_PASSWORD = "amber harbour rope ladder";

for (const theme of REVIEW_THEMES) {
  test(`sign-up tells an address that already has an account, in ${theme}`, async ({ page }) => {
    test.setTimeout(180_000);
    const guard = await guardLocalOrigin(page);
    const { creatorEmail } = seededCredentials();
    await useStoredTheme(page, theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sign-up");
    await expectThemeResolved(page, theme);
    await settleForScreenshot(page);

    await page.getByLabel("Your name").fill(EXISTING_ADDRESS_NAME);
    await page.getByLabel("Email").fill(creatorEmail);
    await page.getByLabel("Password", { exact: true }).fill(EXISTING_ADDRESS_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    /*
     * PRD-006b D10's sign-up row, word for word. It arrives as a `status`, not an `alert`: the
     * sign-up form answers a duplicate address with `AuthNotice`
     * (`apps/web/src/features/auth/components/sign-up-form.tsx:55-63`), which is the polite
     * urgency, because the sentence is a thing to do next rather than a refusal to understand.
     * Scoped to the form for the reason the refused sign-in case records.
     */
    const notice = page.locator("form").getByRole("status");
    await expect(notice).toContainText(SIGN_UP.existingAccountError);
    // The state's whole point is the two ways forward it offers, so they are asserted, not assumed.
    await expect(notice.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(notice.getByRole("link", { name: "Reset your password" })).toBeVisible();

    await captureNamedState(page, {
      screen: "sign-up",
      state: "address-already-has-an-account",
      theme,
    });

    // The refusal must not cost the screen its keyboard path, so the same walk the default states
    // get runs on it, at the same frame.
    await page.setViewportSize({ width: 1180, height: 900 });
    await settleForScreenshot(page);
    await expectKeyboardReachesEveryControl(page);
    expectNoExternalRequests(guard);
  });
}

/**
 * PRD-006d D3's named states on the public account screens.
 *
 * A token that was never issued is the product's own expired-link case: the reset and verification
 * routes answer the same way for a token that has aged out, a token that was already spent, and a
 * token that never existed, because telling those apart would say something about an account to
 * somebody holding a guess.
 */
const NEVER_ISSUED_TOKEN = "never-issued-review-token";

/**
 * A password that passes the policy, so every refusal below comes from the thing under review
 * rather than from the password.
 *
 * `handleResetPassword` evaluates the policy before it consumes the token
 * (`apps/web/src/server/password-authentication-handler.ts:987-1002`), so a weak phrase here would
 * photograph a password-policy message and call it an expired link. It shares no word with the
 * seeded people, whose names all begin "Review", nor with the gate's own seeded password.
 */
const THROWAWAY_NEW_PASSWORD = "copper meadow signal verse";

/** One of the rubric's four frames, by name, for a state the product only has at some of them. */
function frameNamed(name: string): ReviewFrame {
  const found = REVIEW_FRAMES.find((candidate) => candidate.name === name);
  if (found === undefined) throw new Error(`${name} is not one of the rubric's frames`);
  return found;
}

for (const { screen, path } of ACCOUNT_SCREENS) {
  for (const theme of REVIEW_THEMES) {
    for (const frame of REVIEW_FRAMES) {
      test(`${screen} at ${frame.name} in ${theme} meets the design quality bar`, async ({
        page,
      }) => {
        const guard = await guardLocalOrigin(page);
        await useStoredTheme(page, theme);
        await page.setViewportSize({ width: frame.width, height: frame.height });
        await page.goto(path);
        await expectThemeResolved(page, theme);
        await settleForScreenshot(page);

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
    await settleForScreenshot(page);

    await expectKeyboardReachesEveryControl(page);
    expectNoExternalRequests(guard);
  });
}

/**
 * 006D-AC-006 on the account screens.
 *
 * Until 2026-09-20 the reduced-motion assertion ran on the nine synthetic screens
 * (`tests/browser/design-quality.spec.ts`) and on the guided-setup layer, and on none of the seven
 * account screens. 006D-AC-006 says "the browser suite's zero-motion assertion passes on every
 * screen in D3", and the account screens are the half of D3 that only a real session reaches, so
 * the claim was true of the suite that could make it and untested on the suite that could not.
 *
 * It is the shared helper, at the same frame the synthetic half uses, so the two halves assert the
 * same thing. `change-password` lives inside the signed-in shell and is covered by its own case
 * below, which has the session these do not need.
 */
for (const { screen, path } of ACCOUNT_SCREENS) {
  test(`${screen} runs no animation and no transition under reduced motion`, async ({ page }) => {
    const guard = await guardLocalOrigin(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await useStoredTheme(page, "light");
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto(path);
    await settleForScreenshot(page);

    await expectZeroMotionUnderReducedMotion(page);
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
  // put back to a known place and then dismissed before anything is measured. The helper waits for
  // the dismissal's own write, which F-23 now also makes the product wait for.
  await restartGuidedSetup(page);
  await putTheWalkthroughAside(page);

  for (const theme of REVIEW_THEMES) {
    await page.goto("/settings/account");
    await chooseThemeFromTheHeader(page, theme);
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await settleForScreenshot(page);

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
 * PRD-006b D10's success state for the reset-password flow, and the writing review's F-03.
 *
 * D10 ends the reset row "Success: the user lands in the workspace with the notice 'Your password
 * is saved. You're signed in.'" The screen a person reads it on is the workspace, so the picture
 * is of the workspace, and it is filed under the flow it belongs to as the `saved-notice` state of
 * `reset-password`.
 *
 * The state is reached by the address the reset route redirects to rather than by spending a real
 * reset link. A real reset would rotate the seeded creator's password, and every other spec in this
 * run signs in with it. What the route returns is proven where it is decided, at route level, in
 * `password-recovery-handler.postgres.test.ts`.
 *
 * The screenshot is not the assertion. Baselines are compared only on the runner that drew them, so
 * the notice itself is asserted here: present, visible, and announced without interrupting.
 */
const RESET_SAVED_NOTICE = "Your password is saved. You're signed in.";

test("the workspace after a saved password meets the design quality bar", async ({ page }) => {
  test.setTimeout(240_000);
  const guard = await guardLocalOrigin(page);
  const { creatorEmail, password } = seededCredentials();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, creatorEmail, password);
  // The seeded person's progress lives on the server, so the walkthrough is put back to a known
  // place and dismissed before anything is measured, exactly as the change-password case does.
  await restartGuidedSetup(page);
  await putTheWalkthroughAside(page);

  for (const theme of REVIEW_THEMES) {
    await page.goto("/overview?passwordReset=1");
    await chooseThemeFromTheHeader(page, theme);

    const notice = page.locator("[data-live-urgency='status']").filter({
      hasText: RESET_SAVED_NOTICE,
    });
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute("aria-live", "polite");

    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await settleForScreenshot(page);

      await expectAxeClean(page);
      await expectNoHorizontalOverflow(page);
      await expectTargetsAreLargeEnough(page);
      await expect(page).toHaveScreenshot(
        screenshotName("reset-password", frame.name, theme, "saved-notice"),
        { fullPage: true },
      );
    }
  }

  // The notice must not cost the workspace its keyboard path, so the same walk the account screens
  // get runs here too, on the screen carrying it.
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/overview?passwordReset=1");
  await settleForScreenshot(page);
  await expectKeyboardReachesEveryControl(page);

  // It lives in the query, so the next navigation is a workspace with nothing left to say.
  await page.goto("/overview");
  await settleForScreenshot(page);
  await expect(
    page.locator("[data-live-urgency='status']").filter({
      hasText: RESET_SAVED_NOTICE,
    }),
  ).toHaveCount(0);

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

  for (const theme of REVIEW_THEMES) {
    await chooseThemeFromTheHeader(page, theme);
    for (const frame of REVIEW_FRAMES.filter((candidate) =>
      ["1440", "768"].includes(candidate.name),
    )) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await restartGuidedSetup(page);
      await settleForScreenshot(page);

      await expectAxeClean(page);
      await expectTargetsAreLargeEnough(page);
      /**
       * PRD-006d's reopened row 2. The committed step-1 baseline at 1440 showed the panel's
       * footer controls below the fold, and nothing here said so: a screenshot that is only
       * compared on the runner cannot be the assertion for a layout defect on every platform.
       * The controls are measured before the picture is taken, at both frames.
       */
      await expectPanelFooterIsOnScreen(page, frame, ["Let's go", "Not now"]);
      await expect(page).toHaveScreenshot(
        screenshotName("guided-setup", frame.name, theme, "step-1-welcome"),
      );

      await page.getByRole("button", { name: "Let's go" }).click();
      await expect(page.getByRole("dialog", { name: "Your details" })).toBeVisible();
      await settleForScreenshot(page);
      await expectAxeClean(page);
      await expectNoHorizontalOverflow(page);
      await expectPanelFooterIsOnScreen(page, frame);
      await expect(page).toHaveScreenshot(
        screenshotName("guided-setup", frame.name, theme, "step-2-your-details"),
      );

      await putTheWalkthroughAside(page);
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

/**
 * The boundary page's gate, from the side that must not serve it.
 *
 * It carries no real value, so serving it would leak nothing. It is asserted anyway, for the same
 * reason F-10 gated the demo route: a sentence in a PRD saying a page is not served on a
 * connected-account deployment is a hope until something on that deployment checks. The page is
 * gated on `canRenderSyntheticDemo()`, exactly as the email preview is, and this is the half of
 * that claim the other suite cannot make.
 *
 * What is asserted is the not-found page and the absence of all three surfaces, not the status
 * line. Measured on 2026-09-20: this address answers 200 carrying the not-found page, where
 * `/email-preview` answers a real 404. The difference is the route group, not the gate. The
 * boundary page lives under `(authenticated)` so that the shell around it is the product's own
 * shell, that layout reads a session before it renders, and by the time the page calls
 * `notFound()` the response has already begun streaming, so the status is committed. Asserting
 * 404 here would be asserting a property of the framework's streaming rather than of the gate,
 * and it would push the next person to move the page out of the shell to satisfy it, which is
 * the one thing that would make its pictures worth less.
 */
test("the boundary review page is not served in review mode", async ({ page }) => {
  await page.goto("/design-surfaces");

  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "We couldn't load your workspace" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("heading", { name: "Loading your workspace" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Resend the link." })).toHaveCount(0);
});

/**
 * PRD-006d D3's named states on the six public account screens, each reached the way a person
 * reaches it: a query the product itself navigates to, or a submission with the real server
 * answering.
 *
 * Every one of them is walked with the keyboard. Until 2026-09-20 the forgot-password confirmation
 * was exempted by a `hasControls: false` flag, because the state replaced the whole form with a
 * sentence and there was nothing left on the page to walk. That exemption was the finding, not a
 * property of the state: F-20 put the page's own sign-in link back under the notice, so the state
 * is operable and the walk runs on it like every other.
 */
type PublicNamedState = Readonly<{
  screen: string;
  state: string;
  path: string;
  reach?: (page: Page) => Promise<void>;
}>;

const PUBLIC_NAMED_STATES: readonly PublicNamedState[] = Object.freeze([
  {
    screen: "sign-in",
    state: "signed-out",
    // `handleSignOut` answers 303 to exactly this address
    // (`apps/web/src/server/password-authentication-handler.ts:1128-1160`), so the query is the
    // product's own way into the state rather than a test's invention.
    path: "/sign-in?signedOut=1",
  },
  {
    screen: "sign-in",
    state: "refused",
    path: "/sign-in",
    reach: async (page) => {
      await page.getByLabel("Email").fill("nobody@oalo.invalid");
      await page.getByLabel("Password", { exact: true }).fill("not the right password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page.locator("form").getByRole("alert")).toContainText(
        "That email and password don't match.",
      );
    },
  },
  {
    screen: "forgot-password",
    state: "confirmation",
    path: "/forgot-password",
    reach: async (page) => {
      await page.getByLabel("Email").fill("nobody@oalo.invalid");
      await page.getByRole("button", { name: "Send reset link" }).click();
      await expect(page.getByRole("status")).toContainText("reset link is on its way");
    },
  },
  {
    screen: "reset-password",
    state: "link-expired",
    path: `/reset-password?token=${NEVER_ISSUED_TOKEN}`,
    reach: async (page) => {
      await page.getByLabel("New password", { exact: true }).fill(THROWAWAY_NEW_PASSWORD);
      await page.getByLabel("Confirm new password").fill(THROWAWAY_NEW_PASSWORD);
      await page.getByRole("button", { name: "Save new password" }).click();
      await expect(page.locator("form").getByRole("alert")).toContainText(
        "This reset link has expired or was already used.",
      );
    },
  },
  {
    screen: "verify-email",
    state: "link-expired",
    path: `/verify-email?token=${NEVER_ISSUED_TOKEN}`,
    reach: async (page) => {
      await page.getByRole("button", { name: "Confirm", exact: true }).click();
      await expect(page.locator("form").getByRole("alert")).toContainText("This link has expired.");
    },
  },
]);

for (const named of PUBLIC_NAMED_STATES) {
  for (const theme of REVIEW_THEMES) {
    test(`${named.screen} in its ${named.state} state meets the bar at every frame in ${theme}`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      const guard = await guardLocalOrigin(page);
      await useStoredTheme(page, theme);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(named.path);
      await expectThemeResolved(page, theme);
      await settleForScreenshot(page);
      await named.reach?.(page);

      await captureNamedState(page, {
        screen: named.screen,
        state: named.state,
        theme,
      });

      // The same frame the default states' keyboard walk uses, so the two are comparable.
      await page.setViewportSize({ width: 1180, height: 900 });
      await settleForScreenshot(page);
      await expectKeyboardReachesEveryControl(page);
      expectNoExternalRequests(guard);
    });
  }
}

/**
 * PRD-006d D3's shell states that only a session reaches, inside one signed-in session.
 *
 * One sign-in rather than five. The rate limits this run shares are the reason the file already
 * walks the frames and themes in place rather than signing in per cell, and a shell state is no
 * different: the rail, the drawer, the chip, and the help menu are all React state on a page the
 * session is already on.
 *
 * The collapsed rail is captured at 1440, 1180, and 768. Until F-19 it was a 1440 state only,
 * because the stylesheet hid the collapse control between 768 and 1180 and forced the rail compact
 * there; design brief section 14 and `03-components/application-shell-and-navigation.md:26` both
 * say the tablet uses a collapsible rail, so the toggle now works at all three and the same
 * compact rail is the collapsed state at each. 390 is not one of them and is not meant to be: at
 * that width the rail is replaced by the drawer, whose trigger is `display: none` above 767.98px
 * (`apps/web/src/features/shell/components/app-shell.module.css`, the mobile block), so the mobile
 * drawer is a 390 state and the collapsed rail is not.
 *
 * It also holds F-21's shape in place: the sign-out control belongs to the shell's account area in
 * the topbar, and `<main>` opens with the page's own heading rather than with a control.
 */
test("the shell's named states meet the bar", async ({ page }) => {
  test.setTimeout(300_000);
  const guard = await guardLocalOrigin(page);
  const { creatorEmail, password } = seededCredentials();
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInExisting(page, creatorEmail, password);
  await restartGuidedSetup(page);
  // PRD-006c D5. Putting the walkthrough aside is what places the "Finish setup" chip in the
  // header, inside its seven-day window, so the chip is reached by the control a person uses.
  await putTheWalkthroughAside(page);
  await expect(page.getByRole("button", { name: "Finish setup" })).toBeVisible();

  /**
   * F-21. The sign-out control is the shell's, not the page's.
   *
   * `03-components/application-shell-and-navigation.md` puts identity and its controls in the rail
   * and the topbar's account control. Until 2026-09-20 the signed-in layout rendered the sign-out
   * form as the first child of `<main>`, so every workspace page opened with a button above its
   * own heading, which rubric axis 1 forbids. Two assertions hold that: the control is inside the
   * banner, and the first thing inside `<main>` that a person meets is the page's heading.
   */
  const signOut = page.getByRole("button", { name: "Sign out" });
  await expect(signOut).toBeVisible();
  await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("button", { name: "Sign out" })).toHaveCount(0);
  const headingBeforeControl = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (main === null) return "there is no main landmark";
    const first = main.querySelector("h1, h2, button, a[href], input, select, textarea");
    return first === null ? "main holds nothing" : first.tagName.toLowerCase();
  });
  expect(headingBeforeControl, "the page's own heading opens the main landmark").toMatch(
    /^h[12]$/u,
  );

  /**
   * F-19. "Tablet uses a collapsible rail" is a claim about a control a person can reach, so this
   * asserts the control rather than the width. The stylesheet used to hide it from 1180 down, and
   * the tablet rail could not be collapsed at all; the pictures below are of a state that was
   * unreachable at two of the three frames that have a rail.
   */
  for (const frame of [frameNamed("1440"), frameNamed("1180"), frameNamed("768")]) {
    await page.setViewportSize({ width: frame.width, height: frame.height });
    await expect(
      page.getByRole("button", { name: "Collapse navigation" }),
      `the rail toggle is reachable at ${frame.name}`,
    ).toBeVisible();
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const theme of REVIEW_THEMES) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/overview");
    await chooseThemeFromTheHeader(page, theme);

    await captureNamedState(page, { screen: "shell", state: "finish-setup-chip", theme });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Help", exact: true }).click();
    await expect(page.getByRole("button", { name: "Show me around again" })).toBeVisible();
    await captureNamedState(page, { screen: "shell", state: "help-menu-open", theme });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Show me around again" })).toBeHidden();

    // F-19. The same toggle, the same collapsed rail, at all three frames that have a rail. The
    // state is React state on the shell, so it survives the resizes inside the capture.
    await page.getByRole("button", { name: "Collapse navigation" }).click();
    await captureNamedState(page, {
      screen: "shell",
      state: "collapsed-rail",
      theme,
      frames: [frameNamed("1440"), frameNamed("1180"), frameNamed("768")],
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Expand navigation" }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Workspace navigation" })).toBeVisible();
    await captureNamedState(page, {
      screen: "shell",
      state: "mobile-drawer",
      theme,
      frames: [frameNamed("390")],
      // The drawer is a fixed overlay over a scroll-locked body; the frame it covers is the
      // picture, and a full-page capture of a locked body is the page behind it.
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Workspace navigation" })).toBeHidden();
  }

  expectNoExternalRequests(guard);
});
