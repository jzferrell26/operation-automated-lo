import { expect, test, type Page } from "@playwright/test";

import {
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  signUpFreshAccount,
  walkToTheCreateStep,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-006c 006C-AC-013 and D7. Where the panel sits at each frame.
 *
 * Three claims, one per frame:
 *
 * - At 390 the panel is a bottom sheet, capped at 40 percent of the viewport, and the field being
 *   edited is above it rather than under it.
 * - At 768 and above the panel anchors beside the element it points at when there is room, and
 *   below it when there is not.
 * - At every frame the panel stays clear of the shell's sticky header.
 *
 * A panel that covers the field is the single failure that makes a walkthrough useless, and it is
 * a failure that only appears at one width, which is why it gets a spec of its own.
 */

const MOBILE = { width: 390, height: 844 } as const;
const TABLET = { width: 768, height: 1024 } as const;
const DESKTOP = { width: 1180, height: 900 } as const;

async function startAtTheCreateStep(page: Page): Promise<void> {
  await signUpFreshAccount(page, freshEmail());
  await walkToTheCreateStep(page);
}

/**
 * The panel, and the first control inside the element it is pointing at. The control rather than
 * the whole group, because a group can be taller than the space above a bottom sheet and what has
 * to stay visible is the thing the user is about to type into.
 */
async function boxes(page: Page) {
  const highlighted = page.locator("[data-guided-setup-highlight='true']").first();
  // Assert first, so a step that points at nothing fails with a name rather than hanging in
  // `boundingBox` until the whole test times out.
  await expect(highlighted).toBeVisible({ timeout: 15_000 });
  const control = highlighted.locator("input, select, textarea, button, a[href]").first();
  const panel = await page.getByRole("dialog").boundingBox();
  const field = await ((await control.count()) > 0 ? control : highlighted).boundingBox();
  expect(panel).not.toBeNull();
  expect(field).not.toBeNull();
  return {
    field: field as NonNullable<typeof field>,
    panel: panel as NonNullable<typeof panel>,
  };
}

test("at the mobile frame the panel is a capped bottom sheet clear of the field", async ({
  page,
}) => {
  const guard = await guardLocalOrigin(page);
  await page.setViewportSize(MOBILE);
  await startAtTheCreateStep(page);

  const { field, panel } = await boxes(page);
  expect(
    panel.height,
    "the bottom sheet is capped at 40 percent of the viewport",
  ).toBeLessThanOrEqual(MOBILE.height * 0.4 + 1);
  expect(
    Math.round(panel.y + panel.height),
    "the sheet sits on the bottom edge",
  ).toBeGreaterThanOrEqual(MOBILE.height - 2);
  expect(field.y + field.height, "the field is above the sheet").toBeLessThanOrEqual(panel.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expectNoExternalRequests(guard);
});

for (const frame of [TABLET, DESKTOP] as const) {
  test(`at ${String(frame.width)} the panel anchors beside or below the element, never over it`, async ({
    page,
  }) => {
    const guard = await guardLocalOrigin(page);
    await page.setViewportSize(frame);
    await startAtTheCreateStep(page);

    const { field, panel } = await boxes(page);
    const beside = panel.x >= field.x + field.width - 1;
    const below = panel.y >= field.y + field.height - 1;
    expect(beside || below, "the panel is beside the element or below it").toBe(true);

    // The sticky header is the one surface a panel must never sit under, because the brief's focus
    // ring has to stay visible and the header scrolls with the page.
    const header = await page.getByRole("banner").boundingBox();
    if (header !== null) {
      expect(panel.y, "the panel clears the sticky header").toBeGreaterThanOrEqual(
        header.y + header.height - 1,
      );
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expectNoExternalRequests(guard);
  });
}
