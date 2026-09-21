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
 * How long a page may still be arriving at its styles before a measurement gives up waiting.
 *
 * It is an allowance, not a pause: a page that is already styled clears this in two polls. The
 * number is well inside the suite's own 30-second per-test ceiling, so a page that never styles
 * itself fails with the list of reasons below rather than with a bare timeout.
 */
const STYLES_APPLIED_TIMEOUT_MS = 10_000;

/**
 * Wave 7n. The page is styled: every stylesheet it holds has applied, the set has stopped growing,
 * and the design system has reached the controls that are about to be measured.
 *
 * Wave 7e already waited for every `link[rel="stylesheet"]` in the document to have a non-null
 * `sheet`, which covers a sheet that has been fetched and not yet parsed. It does not cover a sheet
 * that is not in the document yet: the wait passes over the links it can see, another arrives
 * afterwards, and whatever ran in between measured a page with its author styles missing. Measured
 * on 2026-09-20: `reset-password` at 1440 in dark reported "Show password" at 32 by 22 and its two
 * password fields at 177 by 21, which are a browser's own sizes for a bare button and a bare input.
 *
 * Two facts about the product decide what this checks. The build splits the design system across
 * chunks: `--target-min-size` is defined in one and read in two others
 * (`apps/web/.next/static/chunks`, measured 2026-09-20). `field.module.css` gives a password
 * field's reveal control `inline-size: var(--target-min-size)` and a text control
 * `min-block-size: var(--target-min-size)`. So the token chunk arriving late leaves both rules with
 * nothing to resolve and both fall back, and the field chunk arriving late removes the rules
 * altogether; either one gives exactly the numbers above. The two checks below are those two cases:
 * the token resolves on every control, and every control that carries a class has at least one
 * class some loaded sheet defines. Measured on the five public account screens and on
 * `/overview`, `/settings/account`, and `/onboarding` on 2026-09-20: no control anywhere carries a
 * class that no sheet defines, so the second check is a fact about the styles arriving rather than
 * about which classes a screen happens to use.
 */
export async function expectStylesHaveApplied(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        await page.evaluate(() => {
          const reasons: string[] = [];
          const describe = (element: Element): string =>
            `the ${element.tagName.toLowerCase()} named "${element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40) ?? "unnamed"}"`;

          const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
          const pending = links.filter((node) => (node as HTMLLinkElement).sheet === null);
          if (pending.length > 0) {
            reasons.push(
              `${String(pending.length)} of ${String(links.length)} stylesheet links have been fetched but not applied`,
            );
          }

          // The count settles rather than being asserted outright: a sheet the route inserts after
          // the first paint is a sheet nothing in the document points at yet, so the only honest
          // signal that they have all arrived is that no more are arriving.
          const counted = window as unknown as { oaloStyleSheetCount?: number };
          const count = document.styleSheets.length;
          if (counted.oaloStyleSheetCount !== count) {
            counted.oaloStyleSheetCount = count;
            reasons.push(
              `the document holds ${String(count)} stylesheets and the set is still growing`,
            );
          }

          const defined = new Set<string>();
          const collect = (rules: CSSRuleList): void => {
            for (const rule of rules) {
              const nested = (rule as CSSGroupingRule).cssRules as CSSRuleList | undefined;
              if (nested !== undefined) collect(nested);
              const selector = (rule as CSSStyleRule).selectorText;
              if (typeof selector !== "string") continue;
              for (const match of selector.matchAll(/\.([A-Za-z0-9_-]+)/gu)) {
                if (match[1] !== undefined) defined.add(match[1]);
              }
            }
          };
          for (const sheet of document.styleSheets) {
            try {
              collect(sheet.cssRules);
            } catch {
              // A sheet from another origin cannot be read. Neither suite serves one, and a sheet
              // that cannot be read is still applied, so there is nothing to wait for.
            }
          }

          const token = (element: Element): string =>
            getComputedStyle(element).getPropertyValue("--target-min-size").trim();
          if (token(document.documentElement) === "") {
            reasons.push("the design system's --target-min-size does not resolve on the document");
          }
          for (const control of document.querySelectorAll(
            "button, a[href], [role='button'], input",
          )) {
            if (token(control) === "") {
              reasons.push(
                `the design system's --target-min-size does not resolve on ${describe(control)}`,
              );
              break;
            }
            const classes = [...control.classList];
            if (classes.length === 0 || classes.some((name) => defined.has(name))) continue;
            reasons.push(
              `no loaded stylesheet defines any class of ${describe(control)} (${classes.join(" ")})`,
            );
            break;
          }
          return reasons;
        }),
      {
        message: "the page was still arriving at its styles",
        timeout: STYLES_APPLIED_TIMEOUT_MS,
      },
    )
    .toEqual([]);
}

/**
 * Rubric axis 7 and design brief section 18. Every visible interactive element is at least 44 by
 * 44. Reported with the element's accessible name so a failure says which control, not how many.
 *
 * Wave 7n. The wait is here rather than only in `settleForScreenshot`, so that every path that
 * measures a target size gets it whether or not that path was about to take a picture.
 */
export async function expectTargetsAreLargeEnough(page: Page): Promise<void> {
  await expectStylesHaveApplied(page);
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

/** Everything the browser's own sequential navigation can land on. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "iframe",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * The tags whose ring a stylesheet in this document cannot paint, each named with the entry in
 * `library/knowledge/private/ux-ui/06-review-rubric.md` section 5 that records why.
 *
 * It is a list of names rather than a fallback rule on purpose. Until 2026-09-20 this check
 * accepted a ring on the control, on its parent, or on its label, which meant any control whose
 * own ring had gone missing passed as long as something near it drew one. A named exception has to
 * be argued for once and is then visible to the next reviewer; a fallback rule quietly covers
 * every defect of that shape forever.
 */
const RING_LIVES_ON_A_DOCUMENTED_WRAPPER: readonly Readonly<{ tag: string; because: string }>[] = [
  {
    tag: "iframe",
    because:
      "Rubric section 5, D-007. While focus is inside the framed document the frame element matches neither `:focus` nor `:focus-within`, so the ring a person sees is the framed document's own. The email preview's bordered viewport carries `:focus-within` instead, and the email itself is not this product's to style.",
  },
];

/**
 * One stop of the walk below, measured in the page, so that a walk of a whole screen and a walk
 * of one panel ask a control the identical question.
 *
 * It lived inside `expectKeyboardReachesEveryControl` until 2026-09-20, and that is the whole
 * reason the guided setup's own panel had never been measured: the only way to reach this code
 * was to tab through a page, and the panel's Continue, "Not now", and Done are in no page's tab
 * order, because the panel is a non-modal layer the page under it knows nothing about. Naming the
 * measurement is what lets the panel be held to the same three properties as every other control
 * in the product, with no second copy of them to drift.
 *
 * `containerSelector` is `null` for a whole-page walk and the panel's selector for a panel walk.
 * `inside` is how a panel walk knows it has tabbed out of the thing it is about; a page walk
 * ignores it.
 */
function measureTheFocusedControl(containerSelector: string | null) {
  const element = document.activeElement;
  if (element === null || element === document.body) return undefined;
  const container = containerSelector === null ? null : document.querySelector(containerSelector);
  const style = getComputedStyle(element);
  /**
   * Read before anything is added to the document. `getComputedStyle` returns a live view, so
   * a probe inserted first could be observed here through a `:last-child` or `:nth-child`
   * rule somewhere on the page. Copying the four values out first makes that impossible.
   */
  const ring = {
    color: style.outlineColor,
    offset: style.outlineOffset,
    style: style.outlineStyle,
    width: style.outlineWidth,
  };

  /**
   * `--focus-color` resolved where the control sits, by asking the engine to paint it. Reading
   * the custom property back gives the declaration, `var(--ac-primary)`, while the outline
   * computes to a colour, so the two can only be compared by resolving one of them. The probe
   * is never rendered and is removed immediately, so it changes no layout and no picture.
   */
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = "var(--focus-color)";
  (element.parentElement ?? document.body).append(probe);
  const expectedColor = getComputedStyle(probe).color;
  probe.remove();

  const wrong: string[] = [];
  if (ring.style === "none") wrong.push("outline-style is none");
  if (ring.width !== "2px") wrong.push(`outline-width is ${ring.width}, not 2px`);
  if (ring.offset !== "3px") wrong.push(`outline-offset is ${ring.offset}, not 3px`);
  if (ring.color !== expectedColor) {
    wrong.push(`outline-color is ${ring.color}, not --focus-color (${expectedColor})`);
  }

  /**
   * SC 2.4.11. The control has to be the thing on top where its own ring is drawn, so the
   * page is asked what is painted at five points on it.
   *
   * The centre and the four edge midpoints, not the four corners. Measured on 2026-09-20: a
   * corner reported every rounded control on every screen as covered by its own parent, 26 of
   * them on the overview alone, because the product's controls carry `--radius-control` and
   * the pixel in the very corner of the bounding box is outside the rounded shape and belongs
   * to whatever is behind it. That is a fact about `border-radius`, not about anything a
   * person cannot see. An edge midpoint is inside the shape at any radius, and a surface that
   * covers a control covers at least one of these five points.
   *
   * A point outside the viewport answers with nothing, which is the browser's own scrolling
   * rather than a defect, so it is skipped.
   */
  const rect = element.getBoundingClientRect();
  const covering: string[] = [];
  if (rect.width > 0 && rect.height > 0) {
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;
    const samples: readonly (readonly [number, number])[] = [
      [midX, midY],
      [midX, rect.top + 1],
      [midX, rect.bottom - 1],
      [rect.left + 1, midY],
      [rect.right - 1, midY],
    ];
    /**
     * The layer a covering element belongs to, or null when it belongs to the page's own
     * flow.
     *
     * Design brief section 14 and rubric axis 7 name the thing this check is for: "a sticky
     * surface never covers a field, an error, or a focus ring". A positioned layer is what
     * can arrive over content that was laid out without it: the rail, the sticky topbar, the
     * guided setup's panel, a modal scrim.
     *
     * An element in the page's own flow that overlaps a control is a different animal, and
     * on this product it is usually a specified part of the control. Measured on 2026-09-20:
     * the password field's reveal control sits inside the field's inline end
     * (`03-components/form-field-and-text-inputs.md`, "a reveal control at the inline end"),
     * so it is on top of the input's own box by design, on every account screen. It covers
     * the input's padding, never the input's ring, which `--focus-offset` draws outside the
     * border box. Reporting it would be reporting the specification.
     */
    const positionedLayerOver = (candidate: Element): string | null => {
      for (
        let node: Element | null = candidate;
        node !== null && node !== document.body;
        node = node.parentElement
      ) {
        const position = getComputedStyle(node).position;
        if (position === "fixed" || position === "sticky") {
          return `${node.tagName.toLowerCase()}.${node.className.toString().slice(0, 40)} (${position})`;
        }
      }
      return null;
    };

    for (const [x, y] of samples) {
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      const onTop = document.elementFromPoint(x, y);
      if (onTop === null || onTop === element || element.contains(onTop)) continue;
      const layer = positionedLayerOver(onTop);
      if (layer === null) continue;
      const over = onTop.getBoundingClientRect();
      covering.push(
        [
          `${onTop.tagName.toLowerCase()}.${onTop.className.toString().slice(0, 40)}`,
          `in ${layer}`,
          `at (${String(Math.round(x))}, ${String(Math.round(y))})`,
          `control ${String(Math.round(rect.left))},${String(Math.round(rect.top))}`,
          `${String(Math.round(rect.width))}x${String(Math.round(rect.height))}`,
          `over ${String(Math.round(over.left))},${String(Math.round(over.top))}`,
          `${String(Math.round(over.width))}x${String(Math.round(over.height))}`,
        ].join(" "),
      );
    }
  }

  return {
    tag: element.tagName.toLowerCase(),
    name:
      element.getAttribute("aria-label") ??
      element.getAttribute("name") ??
      element.textContent?.trim().slice(0, 40) ??
      "unnamed",
    classes: element.className.toString().slice(0, 60),
    wrong,
    covering: [...new Set(covering)],
    inside: container === null ? true : container.contains(element),
    /**
     * Reported on failure, because the answer is almost never "somebody forgot a rule": it is
     * that the control matches neither `:focus` nor `:focus-visible`, which is what a date
     * control and a frame do, and the fix is a different selector rather than a different
     * colour.
     */
    diagnostic: [
      `outline ${ring.style} ${ring.width} at ${ring.offset}`,
      `type=${element.getAttribute("type") ?? "none"}`,
      `focus=${String(element.matches(":focus"))}`,
      `focus-visible=${String(element.matches(":focus-visible"))}`,
      `focus-within=${String(element.matches(":focus-within"))}`,
    ].join(", "),
  };
}

/**
 * PRD-006d 006D-AC-009 and design brief section 18. The keyboard reaches every interactive element
 * in reading order, and the ring the brief specifies is the ring that appears, on the control.
 *
 * It tabs through the page and, at each stop, measures the focused element's own outline against
 * the three tokens the brief names: `--focus-width` at 2px, `--focus-offset` at 3px, and
 * `--focus-color`. The colour is resolved out of the element's own cascade rather than written
 * here as a literal, so a tenant accent, a theme, or a token change moves the expectation with the
 * product instead of leaving a stale number in a test.
 *
 * It then applies SC 2.4.11, the other half of 006D-AC-009's "never obscured", in the words the
 * brief's own axis 7 uses: no sticky or fixed surface covers the focused control. A ring drawn
 * correctly under a sticky header is a ring nobody sees.
 *
 * The stop budget is the page's own count of focusable elements, plus room for the one allowed
 * pass out of the document and for the stop that closes the cycle. It used to be a flat 24, which
 * silently stopped walking partway down any screen with more controls than that: the create screen
 * alone has more, so the fields below the fourteenth were never reached by this check at all.
 */
export async function expectKeyboardReachesEveryControl(
  page: Page,
  options: Readonly<{ stops?: number }> = {},
): Promise<void> {
  const budget =
    options.stops ??
    (await page.evaluate(
      (selector) => document.querySelectorAll(selector).length + 2,
      FOCUSABLE_SELECTOR,
    ));
  const wrapperTags = RING_LIVES_ON_A_DOCUMENTED_WRAPPER.map((entry) => entry.tag);
  const seen: string[] = [];
  const ringless: string[] = [];
  const obscured: string[] = [];

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

  for (let stop = 0; stop < budget; stop += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(measureTheFocusedControl, null);
    if (focused === undefined) {
      if (seen.length > 0 || wrapped) break;
      wrapped = true;
      continue;
    }
    const key = `${focused.tag}:${focused.name}`;
    if (seen.includes(key) && seen[0] === key) break;
    seen.push(key);
    // The named exceptions, each argued once in `RING_LIVES_ON_A_DOCUMENTED_WRAPPER` above. The
    // stop is still walked and still counted; only its ring is somebody else's to paint.
    if (wrapperTags.includes(focused.tag)) continue;
    if (focused.wrong.length > 0) {
      ringless.push(
        `${key} (class "${focused.classes}", ${focused.diagnostic}): ${focused.wrong.join("; ")}`,
      );
    }
    if (focused.covering.length > 0) {
      obscured.push(`${key} is covered by ${focused.covering.join(", ")}`);
    }
  }

  expect(seen.length, "nothing on the page takes keyboard focus").toBeGreaterThan(0);
  expect(ringless).toEqual([]);
  expect(obscured, "SC 2.4.11: a focused control is behind something else").toEqual([]);
}

/**
 * 006D-AC-009 for a layer that is not in any page's tab order, which on this product means the
 * guided setup's panel.
 *
 * The page walk above starts on a screen and tabs through it, so every control it has ever
 * measured is a control some screen owns. The walkthrough's panel is a non-modal `Sheet`: it is
 * placed over whichever screen the step is about, it is not part of that screen, and no walk of
 * any screen in the review suite has ever had it open. Its Continue, its "Not now", its Done, and
 * its close control were therefore held to D7's three ring properties by nothing at all, while
 * `guided-setup.accessibility.spec.ts` asserted only that focus moved to the right places. Focus
 * arriving somewhere and focus being visible there are two different promises, and until
 * 2026-09-20 this product only kept the first one on its own panel.
 *
 * It walks the panel's own tab order rather than reading its controls off the DOM, for the reason
 * the ring rules make unavoidable: every ring in `packages/ui` is drawn on `:focus-visible`, and a
 * control focused from a script while the last interaction was a pointer press matches `:focus`
 * and not `:focus-visible`. A walk that called `focus()` on each control would measure an absent
 * ring on a correct product and pass only by accident. So the walk puts the browser in keyboard
 * modality the way a person does: it steps back out of the panel's first control and tabs into it.
 *
 * Every stop is measured by `measureTheFocusedControl`, the same function the page walk uses, so
 * the panel is held to `--focus-width` at 2px, `--focus-offset` at 3px, `--focus-color` resolved
 * from the control's own cascade, and SC 2.4.11's hit test, with nothing weakened for it. The walk
 * ends when Tab leaves the panel, which is the contract the panel is built to: PRD-006c D6 says
 * Tab leaves the panel for the page, so leaving is the end of the panel's tab order and not a
 * defect.
 */
export async function expectTheRingOnThePanelsOwnControls(
  page: Page,
  options: Readonly<{ containerSelector: string; where: string }>,
): Promise<void> {
  const { containerSelector, where } = options;
  const controls = page.locator(containerSelector).locator(FOCUSABLE_SELECTOR);
  const count = await controls.count();
  expect(count, `${where}: the panel has controls of its own`).toBeGreaterThan(0);

  /**
   * Out of the panel's first control, then back in by Tab, so every stop the walk measures was
   * arrived at by a key press and matches `:focus-visible`.
   *
   * Usually that is one Tab: Shift+Tab steps to whatever precedes the panel in tab order and the
   * Tab after it comes straight back. When the panel holds the first control on the screen,
   * Shift+Tab leaves the document instead and the next Tab re-enters at the document's first
   * control, which may be some way above the panel. So the Tab is repeated until focus is inside
   * the panel, bounded by the document's own focusable count. The panel's controls are contiguous
   * in tab order either way, so the stop this ends on is the panel's first control.
   */
  await controls.first().focus();
  await page.keyboard.press("Shift+Tab");
  const documentBudget = await page.evaluate(
    (selector) => document.querySelectorAll(selector).length + 2,
    FOCUSABLE_SELECTOR,
  );
  let entered = false;
  for (let step = 0; step < documentBudget && !entered; step += 1) {
    await page.keyboard.press("Tab");
    entered = await page.evaluate((selector) => {
      const element = document.activeElement;
      const container = document.querySelector(selector);
      return element !== null && container !== null && container.contains(element);
    }, containerSelector);
  }
  expect(entered, `${where}: Tab reaches the panel's own controls`).toBe(true);

  const seen: string[] = [];
  const ringless: string[] = [];
  const obscured: string[] = [];

  for (let stop = 0; stop < count + 1; stop += 1) {
    const focused = await page.evaluate(measureTheFocusedControl, containerSelector);
    if (focused === undefined || !focused.inside) break;
    /**
     * Every stop is recorded, including a name already seen.
     *
     * The page walk above stops when it comes back to where it started, because a page's tab order
     * is a cycle. A non-modal panel's is not: Tab leaves it, which is what ends this loop. So a
     * repeated name here would mean focus is not moving or the panel is holding it, which is a
     * defect this should report rather than a signal to stop early; the count below is what says
     * so, because the stops and the panel's own controls would no longer be the same number.
     */
    const key = `${focused.tag}:${focused.name}`;
    seen.push(key);
    if (focused.wrong.length > 0) {
      ringless.push(
        `${key} (class "${focused.classes}", ${focused.diagnostic}): ${focused.wrong.join("; ")}`,
      );
    }
    if (focused.covering.length > 0) {
      obscured.push(`${key} is covered by ${focused.covering.join(", ")}`);
    }
    await page.keyboard.press("Tab");
  }

  expect(seen.length, `${where}: the panel's own tab order reaches every one of its controls`).toBe(
    count,
  );
  expect(ringless, `${where}: the panel's own controls carry the brief's ring`).toEqual([]);
  expect(
    obscured,
    `${where}: SC 2.4.11, a focused control in the panel is behind something else`,
  ).toEqual([]);
}

/**
 * PRD-006c D7, "the footer stays visible", and PRD-006d's reopened row 2.
 *
 * The step-1 guided-setup panel's footer controls were below the fold at 1440: the placement
 * clamped against a panel measurement that was one render behind, and the sheet scrolled its own
 * footer out of its capped box. Both are fixed, in
 * `apps/web/src/features/guided-setup/model/panel-placement.ts` and in the primitive's stylesheet.
 * This is what says so from the outside, wherever a panel is on screen.
 *
 * It measures the controls rather than the panel. A panel whose box is inside the viewport but
 * whose Continue control has scrolled out of it is the same dead end for the person using it, and
 * only the control's own rectangle tells the two apart.
 */
export async function expectPanelFooterIsOnScreen(
  page: Page,
  frame: Readonly<{ width: number; height: number }>,
  controlNames: readonly string[] = ["Continue", "Not now"],
): Promise<void> {
  const dialog = page.getByRole("dialog");
  for (const name of controlNames) {
    const control = dialog.getByRole("button", { name, exact: true });
    if ((await control.count()) === 0) continue;
    const box = await control.first().boundingBox();
    expect(box, `at ${String(frame.width)} "${name}" has a box`).not.toBeNull();
    const measured = box as NonNullable<typeof box>;
    expect(
      measured.y,
      `at ${String(frame.width)} "${name}" starts inside the viewport`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      measured.y + measured.height,
      `at ${String(frame.width)} "${name}" ends inside the viewport`,
    ).toBeLessThanOrEqual(frame.height);
    expect(
      measured.x + measured.width,
      `at ${String(frame.width)} "${name}" ends inside the frame`,
    ).toBeLessThanOrEqual(frame.width);
  }
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
   * Every stylesheet the route needs has been applied.
   *
   * A `<link rel="stylesheet">` whose `sheet` is still null has been fetched but not yet applied,
   * and an element styled by it is measured with its author styles missing. Measured on
   * 2026-09-20: one cell of the account matrix, verify-email at 390 in Light, reported the footer's
   * sign-in link at 46 by 18 while the other seven cells of the same markup reported 44 by 44,
   * because `Link.module.css` had not applied and `min-block-size` does not apply to an inline box.
   * Network idle does not cover this: the request has finished, the sheet has not.
   *
   * Wave 7n moved that wait into `expectStylesHaveApplied`, which also covers the sheet that is not
   * in the document yet. A picture taken before the styles apply is wrong in exactly the way a
   * measurement taken then is, so both go through the one helper.
   */
  await expectStylesHaveApplied(page);
  /**
   * Every font face the page asked for has loaded, or failed for good.
   *
   * Measured on 2026-09-21 on the ubuntu-24.04 runner: the verify job's picture of the reports
   * page at 1440 and 1180 differed from the baseline by two percent of a 9,383 px page in both
   * themes, while two draws of the same page by the baselines workflow were identical to the
   * pixel. A sheet that has applied is not a font that has arrived: text photographed in the
   * fallback face moves every glyph on the longest page in the product. `document.fonts.ready`
   * settles when every requested face is loaded or has failed, so the picture is of the type the
   * design system specifies rather than of whatever the cache held.
   */
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  /**
   * Every transition the last change started has finished.
   *
   * Measured on 2026-09-20 by the stricter keyboard walk. `app-shell.module.css` transitions
   * `.workspace`'s `margin-inline-start` over `--motion-base`, which is what makes the rail's
   * collapse control feel like a rail collapsing. A viewport change across the mobile boundary
   * moves the same margin, so for 180ms after a resize the content column is still sliding out
   * from under the fixed rail, and anything measured in that window is measured against a layout
   * the page is on its way out of: the walk reported the create screen's "Open campaign" link and
   * its support summary as covered by a navigation item, two pixels of overlap that exist only
   * while the margin is in flight.
   *
   * Transitions only, never animations. `Button.module.css`'s spinner runs `infinite` while a
   * safe action is saving, so waiting for every animation to stop would wait for a state whose
   * whole point is that it has not finished yet.
   *
   * The screenshots were never exposed to this: `toHaveScreenshot` is configured with
   * `animations: "disabled"`, which finishes transitions before it captures. Only the checks
   * around it were, which is the same shape of gap as the rest of this batch.
   */
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) => !(animation instanceof CSSTransition) || animation.playState !== "running",
      ),
  );
  await page.evaluate(async (keep) => {
    if (!keep) window.scrollTo(0, 0);
    await document.fonts.ready;
  }, keepScroll);
  if (options.idleNetwork ?? true) await page.waitForLoadState("networkidle");
}

/**
 * A full-page picture of a nine-thousand-pixel page is captured at least twice and compared once
 * before the expectation can pass, and on the throttled runner each of those takes seconds. Five
 * seconds, the suite's default, was measured too short on 2026-09-21: the first attempt on every
 * reports page picture ended with two captures taken and no third to confirm the second. This is
 * room for three captures and two comparisons with a margin.
 */
export const FULL_PAGE_SCREENSHOT_TIMEOUT_MS = 20_000;

/**
 * One full-page capture whose picture is thrown away, taken before the one that is compared.
 *
 * Measured on `ubuntu-24.04` on 2026-09-21, six attempts across two runs of `ci.yml`, on every
 * reports page picture: the first full-page capture of a page measured 99 pixels taller than the
 * page is, the whole difference being empty canvas after the last card, and the second capture
 * was the page's height and identical to its baseline pixel for pixel. `toHaveScreenshot` wants
 * two consecutive captures that agree before it compares, so the first attempt on a tall page was
 * always spent, and the five seconds the expectation had were gone before a third capture could
 * confirm the second. The baselines were drawn by the same expectation in its writing mode, which
 * also waits for two captures to agree, so they hold the settled height; the comparison has to
 * reach the same state, and this is the capture that gets it there. What Chromium does with the
 * first capture beyond the viewport is not explained here, only measured: the extra height was
 * the shell's sticky header and disclosure banner on every attempt, and the workstation never
 * shows it.
 */
export async function warmFullPageCapture(page: Page): Promise<void> {
  await page.screenshot({ fullPage: true });
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
    const fullPage = input.fullPage ?? true;
    if (fullPage) await warmFullPageCapture(page);
    await expect(page).toHaveScreenshot(
      screenshotName(input.screen, frame.name, input.theme, input.state),
      {
        fullPage,
        ...(fullPage ? { timeout: FULL_PAGE_SCREENSHOT_TIMEOUT_MS } : {}),
        ...(input.mask === undefined ? {} : { mask: [...input.mask] }),
      },
    );
  }
}
