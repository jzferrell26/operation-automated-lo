import { expect, test } from "@playwright/test";

import { expectTargetsAreLargeEnough } from "./helpers/design-quality.js";

/**
 * Wave 7n. The helpers' own probe: a measurement never runs before the page is styled.
 *
 * `design-quality.spec.ts` and `review/design-quality.spec.ts` both measure every visible control
 * against the 44 by 44 floor, and on 2026-09-20 the review run reported "Show password" at 32 by 22
 * and two password fields at 177 by 21 on `reset-password` at 1440 in dark. Those are the sizes a
 * browser gives a bare button and a bare input: the page had been measured before its styles
 * applied, so `min-block-size: var(--target-min-size)` had no token to resolve and fell back to
 * `auto`.
 *
 * Wave 7e already waited for every `link[rel="stylesheet"]` in the document to have a non-null
 * `sheet`. That wait covers a sheet that has been fetched and not yet parsed. It does not cover a
 * sheet that is not in the document yet, which is the case here: the wait passes over the links it
 * can see, the route's own chunk arrives afterwards, and the measurement has already run. The build
 * puts `--target-min-size` in one chunk and the rules that read it in two others
 * (`apps/web/.next/static/chunks`), so any one of them arriving late is enough.
 *
 * This case is the hole, made deterministic: a control that is too small until a stylesheet that is
 * nowhere in the document arrives half a second later. It fails on the previous helper, which
 * measured immediately and reported the browser's own sizes.
 */

const LATE_STYLESHEET_DELAY_MS = 500;

/**
 * A bare control, the way the failing run found one: named, visible, carrying the class its
 * stylesheet will define, and for now styled by nothing at all.
 */
const BARE_CONTROL = `<!doctype html>
<html lang="en">
  <head><title>A control with no styles yet</title></head>
  <body><button aria-label="Show password" class="field-affix" id="reveal" type="button"></button></body>
</html>`;

/**
 * What the route's own chunk carries: the design system's target token and the rule that reads it.
 * Split across two rules on purpose, because that is how the build splits them, and the rule is
 * written against the class rather than the id for the same reason.
 */
const LATE_STYLESHEET = `:root { --target-min-size: 2.75rem; }
.field-affix {
  box-sizing: border-box;
  display: inline-flex;
  inline-size: var(--target-min-size);
  min-block-size: var(--target-min-size);
}`;

test("the target-size check waits for a stylesheet that arrives after the first paint", async ({
  page,
}) => {
  await page.setContent(BARE_CONTROL);

  // The state the failing run measured in: the browser's own size for a bare button.
  const unstyled = await page.locator("#reveal").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { height: Math.round(rect.height), width: Math.round(rect.width) };
  });
  expect(unstyled.height, "a bare button is under the 44px floor to begin with").toBeLessThan(44);
  expect(unstyled.width, "a bare button is under the 44px floor to begin with").toBeLessThan(44);

  await page.evaluate(
    ([css, delay]) => {
      window.setTimeout(() => {
        const style = document.createElement("style");
        style.textContent = String(css);
        document.head.append(style);
      }, Number(delay));
    },
    [LATE_STYLESHEET, String(LATE_STYLESHEET_DELAY_MS)] as const,
  );

  // No wait of its own here: waiting is the helper's job, which is the whole point of the case.
  await expectTargetsAreLargeEnough(page);
});
