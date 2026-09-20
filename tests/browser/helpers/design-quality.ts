import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

/**
 * PRD-006d D7 and D8. The four checks every screen in the rubric's section 4 gets, at every frame,
 * in both themes, in one place so the synthetic suite and the review suite cannot drift apart.
 *
 * They are shared rather than copied because a review that runs a weaker check on the auth pages
 * than on the workspace pages is not a review of the product, it is a review of whichever half
 * somebody remembered to keep current.
 */

/** Design brief section 14. The four frames the rubric scores. */
export const REVIEW_FRAMES = Object.freeze([
  { name: "1440", width: 1440, height: 900 },
  { name: "1180", width: 1180, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
] as const);

export type ReviewFrame = (typeof REVIEW_FRAMES)[number];

export type ReviewTheme = "light" | "dark";

/**
 * Put the theme in place before the first paint, the same way the product does, so a screenshot
 * never catches the moment between the stored preference and the applied attribute. The workspace
 * screens also carry a visible theme control; this path works on the public pages too, which have
 * none, so one helper covers every screen.
 */
export async function useStoredTheme(page: Page, theme: ReviewTheme): Promise<void> {
  await page.addInitScript((preference) => {
    try {
      window.localStorage.setItem("oalo:theme-preference", preference);
    } catch {
      // A browser with site data blocked still renders; the product falls back to the system
      // preference, and this helper has nothing to add.
    }
  }, theme);
}

export async function expectThemeResolved(page: Page, theme: ReviewTheme): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

/**
 * Rubric axes 4 and 9. Unfiltered by default, and an empty violation list or nothing.
 *
 * `exclude` and `disableRules` exist for exactly one case, and each use of them says which: the
 * email preview renders two whole email documents in frames, and the page-structure best-practice
 * rules ("this document should have one main landmark") are about web pages, not about an email
 * body. The emails are still checked, in their own call, with those two rules off and every WCAG
 * rule on. Nothing else in either suite passes either option.
 */
export async function expectAxeClean(
  page: Page,
  options: Readonly<{ exclude?: readonly string[]; disableRules?: readonly string[] }> = {},
): Promise<void> {
  let builder = new AxeBuilder({ page });
  for (const selector of options.exclude ?? []) {
    builder = builder.exclude(selector);
  }
  if (options.disableRules !== undefined) {
    builder = builder.disableRules([...options.disableRules]);
  }
  const results = await builder.analyze();
  expect(
    results.violations,
    results.violations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`)
      .join("\n"),
  ).toEqual([]);
}

/** Rubric axis 7. A frame that overflows sideways is a visible delta, so it is a failure. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    overflow.scrollWidth,
    `document scrolls sideways at ${overflow.innerWidth}px`,
  ).toBeLessThanOrEqual(overflow.innerWidth);
}

/**
 * Rubric axis 7 and design brief section 18. Every visible interactive element is at least 44 by
 * 44. Reported with the element's accessible name so a failure says which control, not how many.
 */
export async function expectTargetsAreLargeEnough(page: Page): Promise<void> {
  const undersized = await page
    .locator("button:visible, a[href]:visible, [role='button']:visible, input:visible")
    .evaluateAll((elements) =>
      elements
        .filter((element) => !(element instanceof HTMLInputElement && element.type === "hidden"))
        .map((element) => {
          /**
           * For a checkbox or a radio the target is the label row, not the box. WCAG 2.2 SC 2.5.8
           * measures what a person can activate, and an associated label activates the control, so
           * a 16px box inside a 44px row is a 44px target. Drawing the box itself at 44 square is
           * what the PRD-006d review found on the sign-in screen: a grey block the size of the
           * button beside it, which read as though something were loading.
           */
          const target =
            element instanceof HTMLInputElement &&
            (element.type === "checkbox" || element.type === "radio")
              ? ([...(element.labels ?? [])][0] ?? element)
              : element;
          const rect = target.getBoundingClientRect();
          return {
            name:
              element.getAttribute("aria-label") ??
              element.textContent?.trim().slice(0, 40) ??
              element.getAttribute("name") ??
              "unnamed",
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter(({ width, height }) => width < 44 || height < 44),
    );
  expect(undersized).toEqual([]);
}

/**
 * PRD-006d 006D-AC-009. The keyboard reaches every interactive element in reading order, and the
 * ring the brief specifies is the ring that appears.
 *
 * It tabs through the page and, at each stop, reads the focused element's own outline. The ring is
 * 2px at a 3px offset and comes from `--focus-color`; an element that takes focus and draws no
 * outline at all is the failure this catches, because that is the one a person using a keyboard
 * cannot recover from.
 */
export async function expectKeyboardReachesEveryControl(
  page: Page,
  options: Readonly<{ stops: number }> = { stops: 24 },
): Promise<void> {
  const seen: string[] = [];
  const ringless: string[] = [];

  /**
   * A walk may start anywhere, so it is allowed to pass out of the document once.
   *
   * On a page that was only loaded, focus is on the body and the first Tab lands on the first
   * control. On a page reached through an interaction, the last thing that interaction did was
   * click a control, and when that control is the page's last focus stop, which a submit button
   * usually is, the next Tab leaves the document. Without this the walk would report that nothing
   * on the page takes focus, which would be a statement about where the walk began rather than
   * about the page. One pass out, then the following Tab re-enters at the first control; a second
   * one, or one after anything has been seen, ends the walk as before.
   */
  let wrapped = false;

  for (let stop = 0; stop < options.stops; stop += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const element = document.activeElement;
      if (element === null || element === document.body) return undefined;
      const drawsRing = (candidate: Element | null): boolean => {
        if (candidate === null) return false;
        const style = getComputedStyle(candidate);
        return style.outlineStyle !== "none" && style.outlineWidth !== "0px";
      };
      /**
       * A ring on the control itself, on its label, or on the element that wraps it all count:
       * what SC 2.4.7 asks is that the person can see where focus is, not which node paints it.
       * Anything further away than that is not a ring a person would connect to the control.
       */
      const labels =
        element instanceof HTMLInputElement ? [...(element.labels ?? [])] : ([] as Element[]);
      const ringed =
        drawsRing(element) || drawsRing(element.parentElement) || labels.some(drawsRing);
      return {
        tag: element.tagName.toLowerCase(),
        name:
          element.getAttribute("aria-label") ??
          element.getAttribute("name") ??
          element.textContent?.trim().slice(0, 40) ??
          "unnamed",
        classes: element.className.toString().slice(0, 60),
        ringed,
        /**
         * Reported on failure, because the answer is almost never "somebody forgot a rule": it is
         * that the control matches neither `:focus` nor `:focus-visible`, which is what a date
         * control and a frame do, and the fix is a different selector rather than a different
         * colour.
         */
        diagnostic: [
          `outline ${getComputedStyle(element).outlineStyle} ${getComputedStyle(element).outlineWidth}`,
          `type=${element.getAttribute("type") ?? "none"}`,
          `focus=${String(element.matches(":focus"))}`,
          `focus-visible=${String(element.matches(":focus-visible"))}`,
          `focus-within=${String(element.matches(":focus-within"))}`,
        ].join(", "),
      };
    });
    if (focused === undefined) {
      if (seen.length > 0 || wrapped) break;
      wrapped = true;
      continue;
    }
    const key = `${focused.tag}:${focused.name}`;
    if (seen.includes(key) && seen[0] === key) break;
    seen.push(key);
    /**
     * A frame is the one focus stop whose ring no stylesheet in this document can paint. While
     * focus is inside the framed document the frame element matches neither `:focus` nor
     * `:focus-within`, so the ring the person sees is the framed document's own. On the email
     * preview that document is the email, which this product renders but does not style, and
     * should not: adding a stylesheet to a transactional email so a preview looks tidy would
     * change what people receive. The frame is still a reachable stop, which the rest of this
     * check proves.
     */
    if (focused.tag === "iframe") continue;
    if (!focused.ringed) {
      ringless.push(
        `${key} (class "${focused.classes}", ${focused.diagnostic}) takes focus with no visible ring`,
      );
    }
  }

  expect(seen.length, "nothing on the page takes keyboard focus").toBeGreaterThan(0);
  expect(ringless).toEqual([]);
}

/**
 * Rubric axis 6. Under reduced motion nothing on the screen animates or transitions. The brief
 * allows restrained motion; it never allows motion a person has asked not to see.
 */
export async function expectZeroMotionUnderReducedMotion(page: Page): Promise<void> {
  const animated = await page.locator("body *").evaluateAll((elements) =>
    elements
      .map((element) => ({
        name: element.className.toString().slice(0, 60),
        animation: getComputedStyle(element).animationName,
        transition: getComputedStyle(element).transitionDuration,
      }))
      .filter(
        ({ animation, transition }) =>
          animation !== "none" || !/^0(?:s|ms)(?:,\s*0(?:s|ms))*$/u.test(transition),
      ),
  );
  expect(animated).toEqual([]);
}

/** The baseline name for one screen, frame, theme, and named state. */
export function screenshotName(
  screen: string,
  frame: string,
  theme: ReviewTheme,
  state = "default",
): string {
  return `${screen}--${state}--${frame}--${theme}.png`;
}

/**
 * Settle the page before a screenshot: fonts resolved, no network in flight, and the scroll
 * position at the top so the same pixels are captured every run.
 *
 * `idleNetwork` is false for exactly one kind of state: one a person only ever sees while a request
 * is still travelling, such as the create screen's saving state. There the request in flight is the
 * state, so waiting for the network to go quiet would wait for the state to end.
 *
 * `keepScroll` is true for exactly one kind of state too: one whose subject is a panel pointing at
 * an element somewhere down the page. The guided setup scrolls the page itself so the step's own
 * element sits clear of its panel (`model/panel-placement.ts`), and scrolling back to the top would
 * photograph a walkthrough pointing at something outside the picture. The position is the product's
 * own arithmetic from the same viewport, so it is as repeatable as the top of the page is.
 */
export async function settleForScreenshot(
  page: Page,
  options: Readonly<{ idleNetwork?: boolean; keepScroll?: boolean }> = {},
): Promise<void> {
  const keepScroll = options.keepScroll ?? false;
  /**
   * Every stylesheet the route inserted has been applied.
   *
   * A `<link rel="stylesheet">` whose `sheet` is still null has been fetched but not yet applied,
   * and an element styled by it is measured with its author styles missing. Measured on
   * 2026-09-20: one cell of the account matrix, verify-email at 390 in Light, reported the footer's
   * sign-in link at 46 by 18 while the other seven cells of the same markup reported 44 by 44,
   * because `Link.module.css` had not applied and `min-block-size` does not apply to an inline box.
   * Network idle does not cover this: the request has finished, the sheet has not.
   */
  await page.waitForFunction(() =>
    [...document.querySelectorAll('link[rel="stylesheet"]')].every(
      (node) => (node as HTMLLinkElement).sheet !== null,
    ),
  );
  await page.evaluate(async (keep) => {
    if (!keep) window.scrollTo(0, 0);
    await document.fonts.ready;
  }, keepScroll);
  if (options.idleNetwork ?? true) await page.waitForLoadState("networkidle");
}

/**
 * PRD-006d D3 and D8. One named state, captured at every frame the rubric scores it at, with the
 * same four machine checks the default states already get at every cell.
 *
 * The page arrives already in the state and already in the theme, and only the viewport moves
 * between cells. That is deliberate on two counts. A named state on these screens lives in React
 * state on the page, so a reload would lose it and a resize keeps it; and reaching it once per theme
 * rather than once per cell is what keeps a review suite from spending the sign-up, sign-in, and
 * password-reset budgets that the specs sharing the run need.
 */
export async function captureNamedState(
  page: Page,
  input: Readonly<{
    screen: string;
    state: string;
    theme: ReviewTheme;
    /** Defaults to all four frames. A state the product only has at some of them names those. */
    frames?: readonly ReviewFrame[];
    fullPage?: boolean;
    idleNetwork?: boolean;
    /** See `settleForScreenshot`: true for a panel that points at something down the page. */
    keepScroll?: boolean;
    /**
     * Regions whose content is a fact about this run rather than about the design: a decision's
     * timestamp, for instance. Painted over so the picture still fails on a spacing token, a colour
     * role, or a type step, and never fails because the clock moved.
     */
    mask?: readonly Locator[];
    axe?: Readonly<{ exclude?: readonly string[]; disableRules?: readonly string[] }>;
  }>,
): Promise<void> {
  for (const frame of input.frames ?? REVIEW_FRAMES) {
    await page.setViewportSize({ width: frame.width, height: frame.height });
    await settleForScreenshot(page, {
      idleNetwork: input.idleNetwork ?? true,
      keepScroll: input.keepScroll ?? false,
    });

    await expectAxeClean(page, input.axe ?? {});
    await expectNoHorizontalOverflow(page);
    await expectTargetsAreLargeEnough(page);
    await expect(page).toHaveScreenshot(
      screenshotName(input.screen, frame.name, input.theme, input.state),
      {
        fullPage: input.fullPage ?? true,
        ...(input.mask === undefined ? {} : { mask: [...input.mask] }),
      },
    );
  }
}
