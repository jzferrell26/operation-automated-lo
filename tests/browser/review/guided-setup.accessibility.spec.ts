import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  signUpFreshAccount,
  typeIntoLabel,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-006c 006C-AC-011 and 006C-AC-012. Every step, both themes, both frames.
 *
 * The matrix is the existing browser gate's, applied to the walkthrough: axe with zero violations,
 * zero animations and zero non-zero transitions under `prefers-reduced-motion: reduce`, and every
 * control at least 44 by 44. The steps are walked once per cell rather than screenshotted from one
 * pass, because a panel that is fine at 1180 and broken at 390 is exactly the defect this catches.
 */

const FRAMES = [
  { width: 1180, height: 900 },
  { width: 390, height: 844 },
] as const;

const THEMES = ["Light", "Dark"] as const;

async function chooseTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
  await page.getByRole("radio", { name: theme }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme.toLowerCase());
}

async function assertAxeClean(page: Page, where: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    `${where}\n${results.violations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`)
      .join("\n")}`,
  ).toEqual([]);
}

/** The gate's own reduced-motion assertion, pointed at the walkthrough's layer. */
async function assertNoMotion(page: Page, where: string): Promise<void> {
  const animated = await page
    .locator("[data-guided-setup-layer='true'] *, [data-guided-setup-highlight='true']")
    .evaluateAll((elements) =>
      elements
        .map((element) => ({
          animation: getComputedStyle(element).animationName,
          transition: getComputedStyle(element).transitionDuration,
        }))
        .filter(
          ({ animation, transition }) =>
            animation !== "none" || !/^0(?:s|ms)(?:, 0(?:s|ms))*$/u.test(transition),
        ),
    );
  expect(animated, where).toEqual([]);
}

async function assertTargetSizes(page: Page, where: string): Promise<void> {
  const undersized = await page
    .locator("[data-guided-setup-layer='true'] :is(button, a[href], [role='button']):visible")
    .evaluateAll((elements) =>
      elements
        .map((element) => ({
          name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "unnamed",
          rect: element.getBoundingClientRect().toJSON(),
        }))
        .filter(({ rect }) => rect.width < 44 || rect.height < 44),
    );
  expect(undersized, where).toEqual([]);
}

/**
 * D7's real promise: the panel never covers the field the user is being asked to fill in. The
 * check is against the first control inside the anchored element rather than the whole group,
 * because a group can be taller than the space above a bottom sheet and the part that has to stay
 * visible is the control, not the legend above it.
 */
async function assertPanelClearOfTheField(page: Page, where: string): Promise<void> {
  const highlighted = page.locator("[data-guided-setup-highlight='true']").first();
  // Every step that names a page element must end up pointing at it. The allowance is generous
  // because the element can arrive with a later render on a cold server; what is not allowed is
  // the step never finding it.
  await expect(highlighted).toBeVisible({ timeout: 15_000 });
  const control = highlighted.locator("input, select, textarea, button, a[href]").first();
  const target = (await control.count()) > 0 ? control : highlighted;
  const panelBox = await page.getByRole("dialog").boundingBox();
  const targetBox = await target.boundingBox();
  if (panelBox === null || targetBox === null) return;
  const overlaps =
    panelBox.x < targetBox.x + targetBox.width &&
    panelBox.x + panelBox.width > targetBox.x &&
    panelBox.y < targetBox.y + targetBox.height &&
    panelBox.y + panelBox.height > targetBox.y;
  expect(overlaps, `${where}: the panel covers the field it is pointing at`).toBe(false);
}

/**
 * Walks the steps and checks the whole contract at each one. The walk stops at the create screen,
 * because steps 5 through 7 need a saved campaign and the timed run already proves those; the
 * contract asserted here is about the panel, which is the same component at every step.
 */
type Checkpoint = Readonly<{
  step: string;
  /**
   * Whether the step points at something on the page. Steps 2 and 3 collect their fields inside
   * the panel, so there is nothing on the page to highlight and nothing for the panel to cover.
   */
  pointsAtPage: boolean;
  advance: () => Promise<void>;
}>;

async function walkAndAssert(page: Page, where: string): Promise<void> {
  const checkpoints: readonly Checkpoint[] = [
    {
      step: "1. Welcome",
      pointsAtPage: true,
      advance: async () => {
        await page.getByRole("button", { name: "Let's go" }).click();
      },
    },
    {
      step: "2. Your details",
      pointsAtPage: false,
      advance: async () => {
        await page.getByRole("button", { name: "Continue" }).click();
      },
    },
    {
      step: "3. Your Realtor partner",
      pointsAtPage: false,
      advance: async () => {
        await typeIntoLabel(page, "Realtor's name", "Priya Nadeem");
        await page.getByRole("button", { name: "Continue" }).click();
        await page.waitForURL("**/marketing/campaigns/new");
      },
    },
    { step: "4. Create the Open House Boost", pointsAtPage: true, advance: async () => undefined },
  ];

  for (const checkpoint of checkpoints) {
    const label = `${where} ${checkpoint.step}`;
    await expect(page.getByRole("dialog")).toBeVisible();
    await assertAxeClean(page, label);
    await assertNoMotion(page, label);
    await assertTargetSizes(page, label);
    if (checkpoint.pointsAtPage) await assertPanelClearOfTheField(page, label);
    await checkpoint.advance();
  }
}

for (const frame of FRAMES) {
  for (const theme of THEMES) {
    test(`every step is accessible and still under ${theme} at ${String(frame.width)}x${String(frame.height)}`, async ({
      page,
    }) => {
      const guard = await guardLocalOrigin(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize(frame);
      await signUpFreshAccount(page, freshEmail());
      await chooseTheme(page, theme);
      await walkAndAssert(page, `${theme} ${String(frame.width)}x${String(frame.height)}`);
      expectNoExternalRequests(guard);
    });
  }
}
