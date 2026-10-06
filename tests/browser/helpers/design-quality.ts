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

/**
 * Design brief section 10's six type steps, in CSS pixels at the browser's 16px root: page title,
 * section title, card title, body, secondary, and caption. The tokens are `rem`, so these are the
 * values they compute to while the root stays 16px, which the check below also asserts.
 *
 * Superseded on 2026-10-01 by PRD-009 (009a, design `00-direction.md` section 2.4): the steps were
 * 23, 17, 14, 13, 11.5, and 10.5px; the light look's are 28, 19, 16 (card title and body), 14,
 * and 12px.
 */
export const TYPE_STEP_PIXELS = Object.freeze([28, 19, 16, 14, 12] as const);

/**
 * Text the type-step check does not hold to the six steps, each named with the reason, the way
 * `tooling/tests/unit/design-quality/governed-controls.test.ts` names its exceptions. A selector
 * here has to be argued for once and is then visible to the next reviewer; nothing is exempt by
 * default.
 */
export const TEXT_OFF_THE_TYPE_STEPS: readonly Readonly<{ selector: string; because: string }>[] =
  Object.freeze([
    {
      selector: "[data-ad-preview]",
      because:
        "The orchestrator's ruling of 2026-10-02 (CI run 36989783019): a picture of the ad is the ad as Facebook shows it, not product interface text. Its band is sized as a share of the art (a card, step 2, and step 3 draw the same proportions), and its feed frame uses the feed's own type, so the brief's six steps govern everything outside it and nothing inside it. Every picture of the ad carries data-ad-preview on its root (the creative, the feed preview, and the Brand page's band preview); nothing else is exempt, and design-quality-helpers.spec.ts proves text beside one is still measured.",
    },
  ]);

/**
 * Rubric axis 3 and rubric section 5, D-009 (ruled 2026-10-01): the body step is applied at the
 * root of inheritance and every text on the screen is at one of the brief's six steps.
 *
 * Three claims. `html` computes 16px, because every step is a `rem` token and a smaller root would
 * shrink all six. `body` computes 16px, the body step (PRD-009a), so text no module sizes reads at the body
 * step instead of the browser's 16px. And every visible element that carries text of its own (a
 * text node with a box on screen, or a field showing a value) renders at one of the six steps.
 *
 * Before the fix the overview's section titles were 24px, above its 23px page title, and the
 * campaigns list's lead was 16px, above every card title on the page. A picture is only compared
 * on the runner that drew it, so this measures the sizes everywhere. The check proves a size is a
 * step; the review still proves it is the right step for its role.
 */
export async function expectTextAtTheTypeSteps(page: Page): Promise<void> {
  const measured = await measureTextAtTheTypeSteps(page);
  expect.soft(measured.html, "html stays at the browser's 16px root").toBe(16);
  expect.soft(measured.body, "body carries the 16px body step").toBe(16);
  expect.soft(measured.offStep, "text rendered between the brief's six type steps").toEqual([]);
}

/** What `expectTextAtTheTypeSteps` measures, without asserting it, so the helper's own spec can. */
export async function measureTextAtTheTypeSteps(
  page: Page,
): Promise<Readonly<{ html: number; body: number; offStep: readonly string[] }>> {
  return page.evaluate(
    ({ steps, exceptions }) => {
      const size = (element: Element): number =>
        Number.parseFloat(getComputedStyle(element).fontSize);
      const describe = (element: Element, text: string): string =>
        `${element.tagName.toLowerCase()}${element.className.toString() === "" ? "" : `.${element.className.toString().split(" ")[0] ?? ""}`} "${text.trim().slice(0, 40)}"`;
      const exempt = (element: Element): boolean =>
        exceptions.some((exception) => element.closest(exception) !== null);
      const offStep = new Set<string>();
      const check = (element: Element, text: string): void => {
        if (exempt(element)) return;
        const pixels = size(element);
        if (steps.some((step) => Math.abs(step - pixels) < 0.01)) return;
        // October 6 campaign-studio amendment: only the marked h1 has a 40px display step.
        // Not a subtree exemption: descendants, wrong tags and other sizes remain checked.
        if (element.matches("h1[data-studio-title]") && Math.abs(pixels - 40) < 0.01) return;
        offStep.add(`${describe(element, text)} at ${String(pixels)}px`);
      };

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set<Element>();
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = node.textContent ?? "";
        const element = node.parentElement;
        if (text.trim() === "" || element === null || seen.has(element)) continue;
        seen.add(element);
        if (!element.checkVisibility({ visibilityProperty: true })) continue;
        // Text that draws no glyph box (a closed disclosure's body, an empty layout) is not text a
        // person reads, so it is not measured.
        const range = document.createRange();
        range.selectNodeContents(node);
        const drawn = [...range.getClientRects()].some(
          (rect) => rect.width > 0.5 && rect.height > 0.5,
        );
        if (drawn) check(element, text);
      }

      // A field shows its value as text, but the value is not a text node, so the walk above never
      // meets it.
      for (const field of document.querySelectorAll(
        "input:not([type='hidden']):not([type='checkbox']):not([type='radio']), select, textarea",
      )) {
        if (!field.checkVisibility({ visibilityProperty: true })) continue;
        check(field, field.getAttribute("aria-label") ?? field.getAttribute("name") ?? "a field");
      }

      return {
        html: size(document.documentElement),
        body: size(document.body),
        offStep: [...offStep],
      };
    },
    {
      steps: [...TYPE_STEP_PIXELS],
      exceptions: TEXT_OFF_THE_TYPE_STEPS.map((exception) => exception.selector),
    },
  );
}

/**
 * A date as this product writes one: "Jul 21, 2026", "7/21/2026", or "2026-07-21", each with or
 * without a time after it.
 */
const TIMESTAMP_PATTERN =
  /\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/u;

/**
 * Rubric axis 3: timestamps line up.
 *
 * PRD-008d, the second redraw of 2026-10-01, made every date a `time` element. Until PRD-009 the
 * global stylesheet set those in the data font and this check held them to it. Superseded on
 * 2026-10-01 by PRD-009 (009a, design `00-direction.md` section 2.2): numbers and dates use Inter
 * with tabular figures, and monospace survives only inside "Details for support". The check now
 * holds the rule from the outside, on every photographed screen: any visible text that reads as a
 * date is drawn with tabular figures, and in the interface face rather than the data face.
 */
export async function expectTimestampsInTabularFigures(page: Page): Promise<void> {
  const offRule = await page.evaluate((source) => {
    const pattern = new RegExp(source, "u");
    const probe = document.createElement("span");
    probe.style.fontFamily = "var(--font-data)";
    probe.style.display = "none";
    document.body.append(probe);
    const dataFamily = getComputedStyle(probe).fontFamily;
    probe.remove();

    const found = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = node.textContent ?? "";
      const element = node.parentElement;
      if (element === null || !pattern.test(text)) continue;
      if (!element.checkVisibility({ visibilityProperty: true })) continue;
      if (element.closest("[data-support-details]") !== null) continue;
      const style = getComputedStyle(element);
      if (style.fontVariantNumeric.includes("tabular-nums") && style.fontFamily !== dataFamily) {
        continue;
      }
      found.add(`${element.tagName.toLowerCase()} "${text.trim().slice(0, 60)}"`);
    }
    return [...found];
  }, TIMESTAMP_PATTERN.source);

  expect.soft(offRule, "a timestamp without tabular figures, or in the data face").toEqual([]);
}

/**
 * Rubric axis 3, the two typography gates together, so every place that takes a picture runs both
 * with one call and none of them can run one and forget the other.
 */
export async function expectTypographyOnBrief(page: Page): Promise<void> {
  await expectTextAtTheTypeSteps(page);
  await expectTimestampsInTabularFigures(page);
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
 * Rubric axis 2, "vertical rhythm is consistent ... across sibling screens". A page in the shell
 * opens at the top of the main landmark, whatever its length.
 *
 * PRD-008d, the scored baseline review of 2026-10-01: the bootstrap `main` rule centred a short
 * page in the frame, so the campaigns list's title sat about 200px below every sibling page's.
 */
export async function expectThePageOpensAtTheTopOfItsContent(page: Page): Promise<void> {
  const offset = await page.getByRole("main").evaluate((main) => {
    const first = main.firstElementChild;
    if (first === null) return undefined;
    const paddingTop = Number.parseFloat(getComputedStyle(main).paddingTop);
    return first.getBoundingClientRect().top - (main.getBoundingClientRect().top + paddingTop);
  });
  expect(offset, "the main landmark has content").toBeDefined();
  expect(Math.abs(offset ?? Number.POSITIVE_INFINITY), "the page opens at the top").toBeLessThan(1);
}

/**
 * Rubric axes 2 and 10. A page that fills the content column starts its title at the column's
 * inline start, as its siblings do, whatever it currently holds. PRD-008d's baseline review: the
 * campaigns list shrank to its contents and was centred, so its title moved with what it listed.
 */
export async function expectThePageFillsTheContentColumn(page: Page): Promise<void> {
  const gap = await page.getByRole("main").evaluate((main) => {
    const first = main.firstElementChild;
    if (first === null) return undefined;
    const paddingInlineStart = Number.parseFloat(getComputedStyle(main).paddingLeft);
    return (
      first.getBoundingClientRect().left - (main.getBoundingClientRect().left + paddingInlineStart)
    );
  });
  expect(gap, "the main landmark has content").toBeDefined();
  expect(
    Math.abs(gap ?? Number.POSITIVE_INFINITY),
    "the page starts at the column's edge",
  ).toBeLessThan(1);
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
 * (A `keepScroll` option used to exist for the guided setup's panel, which scrolled the page itself
 * and pointed at an element down it. PRD-009b retired the panel, so every picture starts at the top.)
 */
export async function settleForScreenshot(
  page: Page,
  options: Readonly<{ idleNetwork?: boolean }> = {},
): Promise<void> {
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
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
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
/**
 * Parks the pointer at the frame's top-left corner, which is the rail's brand block at the wide
 * frames and the top bar's own padding at 390: nothing there reacts to a pointer.
 *
 * PRD-008d, the scored baseline review of 2026-10-01. The pointer stays wherever the last click
 * left it, and a viewport change moves the layout under it, so a picture could carry an incidental
 * hover on whatever control the resize slid under the cursor: the help-menu picture at 1180 showed
 * the theme control's "Dark" option hovered on one run and not on the run before. A baseline that
 * depends on where the cursor happened to be is not a baseline.
 */
export async function parkThePointer(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
}

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
    /**
     * Regions whose content is a fact about this run rather than about the design. Painted over so
     * the picture still fails on a spacing token, a colour role, or a type step, and never fails
     * because the clock moved. Every date on the page is masked without being named here (see
     * `expectThePictureMatches`); name anything else.
     */
    mask?: readonly Locator[];
    axe?: Readonly<{ exclude?: readonly string[]; disableRules?: readonly string[] }>;
  }>,
): Promise<void> {
  await parkThePointer(page);
  for (const frame of input.frames ?? REVIEW_FRAMES) {
    await page.setViewportSize({ width: frame.width, height: frame.height });
    await settleForScreenshot(page, { idleNetwork: input.idleNetwork ?? true });

    await expectAxeClean(page, input.axe ?? {});
    await expectNoHorizontalOverflow(page);
    await expectTargetsAreLargeEnough(page);
    await expectTypographyOnBrief(page);
    await expectThePictureMatches(
      page,
      screenshotName(input.screen, frame.name, input.theme, input.state),
      { fullPage: input.fullPage ?? true, mask: input.mask ?? [] },
    );
  }
}

/** Every date the product draws: a `time` element, or the value of a date control. */
export const DATE_SELECTOR = "time, input[type='date']";

/**
 * PR #78 CI repair. A colour mask hides a date's glyphs but not its width: the rolling default
 * changed from "Fri, Oct 16, 2026" to "Mon, Oct 19, 2026" and pushed "in" onto the next line at
 * 390px. The baseline's schedule label is used only while photographing this already-masked
 * header date. All accessibility/layout checks run first on the real date; datetime, stored
 * campaign data, clocks, and adjacent text stay untouched. Restore the original even on failure.
 *
 * Scope is deliberately narrow: the library-ad header and campaign-list dates, whose schedules
 * and save timestamps originate in the rolling browser fixture. October 6's Linux comparison
 * found that masking the list's date text still allowed its width to shift the adjacent Topic
 * column. Normalize only those existing date nodes during capture; other dates, controls,
 * property pages, stored values and clocks are unchanged. Tests exercise restoration and scope.
 */
export async function withStableCampaignScheduleDates<T>(
  page: Page,
  capture: () => Promise<T>,
): Promise<T> {
  const selector = [
    "[data-campaign-page='library-ad'] > header time",
    "[data-campaigns-page] [data-campaign-table] tbody time",
    "[data-campaigns-page] [data-campaign-cards] time",
  ].join(", ");
  const originalAttribute = "data-review-original-schedule-label";
  try {
    await page.locator(selector).evaluateAll((elements, attribute) => {
      for (const element of elements) {
        if (
          element.hasAttribute(attribute) ||
          element.childNodes.length !== 1 ||
          element.firstChild?.nodeType !== Node.TEXT_NODE ||
          !(
            element.closest("[data-campaigns-page]") === null
              ? /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2}, \d{4}$/u
              : /^[A-Z][a-z]{2} \d{1,2}(?:, \d{4})?$/u
          ).test(element.textContent ?? "")
        ) {
          throw new Error("Campaign schedule screenshot expects a single readable date label");
        }
      }
      for (const element of elements) {
        element.setAttribute(attribute, element.textContent ?? "");
        if (element.firstChild !== null) {
          const isList = element.closest("[data-campaigns-page]") !== null;
          const isTimestamp = element.getAttribute("datetime")?.includes("T") === true;
          element.firstChild.nodeValue = isList
            ? isTimestamp
              ? "Oct 2"
              : "Oct 16"
            : "Fri, Oct 16, 2026";
        }
      }
    }, originalAttribute);
    return await capture();
  } finally {
    await page.locator(`[${originalAttribute}]`).evaluateAll((elements, attribute) => {
      for (const element of elements) {
        const original = element.getAttribute(attribute);
        if (original !== null && element.firstChild?.nodeType === Node.TEXT_NODE) {
          element.firstChild.nodeValue = original;
        }
        element.removeAttribute(attribute);
      }
    }, originalAttribute);
  }
}

/** Painted over a date's own line boxes, in Playwright's default mask colour. */
const FRAGMENT_MASK_ATTRIBUTE = "data-review-mask-fragments";
/** Handed to Playwright's own mask, which paints the element's whole box. */
const BOX_MASK_ATTRIBUTE = "data-review-mask-box";
const MASK_COLOR = "#ff00ff";

/**
 * The stylesheet that paints a fragment mask. An inline element's background is drawn on each of
 * its line boxes and nowhere else, so a date that wraps is covered on its two short pieces and the
 * words before and after it on those lines stay in the picture.
 */
const FRAGMENT_MASK_STYLE = `
[${FRAGMENT_MASK_ATTRIBUTE}],
[${FRAGMENT_MASK_ATTRIBUTE}] * {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  text-decoration-color: transparent !important;
}
[${FRAGMENT_MASK_ATTRIBUTE}] {
  background-color: ${MASK_COLOR} !important;
  background-image: none !important;
}`;

/**
 * Marks what a picture paints over: every date on the page, and whatever else the caller names.
 *
 * PRD-009 scored baseline review, R1-18 and R2's harness notes H-2 and H-3.
 *
 * - H-2: a date the run itself produced ("Saved on Oct 2, 2026", "Until Oct 16") was masked only
 *   where a spec remembered to pass it, so a picture could fail on another day. Every date is now
 *   masked by default, wherever a picture is taken through this helper; a date is a fact about the
 *   clock or the catalogue, never about the design. The catalogue's fixed review dates are masked
 *   with them on purpose: a mask that depended on which dates happen to be near today would differ
 *   between the run that drew a baseline and the run that compares it.
 * - R1-18 and H-3: Playwright paints a mask over the element's bounding box. A `time` that wraps
 *   has a box spanning both lines and the full width between them, so the mask blacked out "Version
 *   1. Reviewed" in five library cards, "From launch until" on step 3, and whole sentences on the
 *   campaign page, and those words could regress without failing. An element that lays out inline
 *   is now masked on its own line boxes only; anything else (a date control, a block) keeps
 *   Playwright's box mask, because its box is the date.
 *
 * Read at the frame the picture is taken at, because a resize can move an element between the two.
 */
async function markTheMasks(page: Page, extra: readonly Locator[]): Promise<void> {
  await clearTheMasks(page);
  for (const locator of [page.locator(DATE_SELECTOR), ...extra]) {
    await locator.evaluateAll(
      (elements, [fragment, box]) => {
        for (const element of elements) {
          const inline = getComputedStyle(element).display === "inline";
          element.setAttribute(inline ? fragment : box, "");
        }
      },
      [FRAGMENT_MASK_ATTRIBUTE, BOX_MASK_ATTRIBUTE] as const,
    );
  }
}

async function clearTheMasks(page: Page): Promise<void> {
  await page.evaluate(
    ([fragment, box]) => {
      for (const element of document.querySelectorAll(`[${fragment}], [${box}]`)) {
        element.removeAttribute(fragment);
        element.removeAttribute(box);
      }
    },
    [FRAGMENT_MASK_ATTRIBUTE, BOX_MASK_ATTRIBUTE] as const,
  );
}

/**
 * Takes the picture a named state or a default state is compared against, with every date masked
 * on its own line boxes (see `markTheMasks`). `captureNamedState` uses it at every frame; a spec
 * that compares a picture directly calls it in place of `toHaveScreenshot`, so the same masks hold
 * for every picture in the suite.
 *
 * The masks are put on after the machine checks have run and taken off after the comparison, so
 * no check measures a masked page and no later step sees the marks.
 */
export async function expectThePictureMatches(
  page: Page,
  name: string,
  options: Readonly<{ fullPage?: boolean; mask?: readonly Locator[] }> = {},
): Promise<void> {
  const fullPage = options.fullPage ?? true;
  await withStableCampaignScheduleDates(page, async () => {
    await markTheMasks(page, options.mask ?? []);
    const style = await page.addStyleTag({ content: FRAGMENT_MASK_STYLE });
    try {
      if (fullPage) await warmFullPageCapture(page);
      await expect(page).toHaveScreenshot(name, {
        fullPage,
        ...(fullPage ? { timeout: FULL_PAGE_SCREENSHOT_TIMEOUT_MS } : {}),
        mask: [page.locator(`[${BOX_MASK_ATTRIBUTE}]`)],
        maskColor: MASK_COLOR,
      });
    } finally {
      await style.evaluate((element) => {
        if (element instanceof Element) element.remove();
      });
      await clearTheMasks(page);
    }
  });
}
