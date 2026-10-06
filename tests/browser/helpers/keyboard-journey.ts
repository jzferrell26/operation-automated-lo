import { expect, type Page } from "@playwright/test";

/**
 * PRD-009g, 009G-AC-010. "Launch an ad" end to end with the keyboard alone: the page is never
 * clicked. A person who cannot use a pointer reaches each control by Tab, in the order the page
 * gives them, and presses Enter or Space on it, so this does exactly that and fails when the
 * control a step needs is not reachable, is reached after more stops than a person would put up
 * with, or does nothing when it is pressed.
 */

/** What the focused element is called, the way a screen reader would say it. */
export async function focusedControlName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (element === null || element === document.body) return "";
    const labelled = element.getAttribute("aria-label");
    if (labelled !== null && labelled.trim() !== "") return labelled.trim();
    const labels = (element as HTMLInputElement).labels;
    if (labels !== null && labels !== undefined && labels.length > 0) {
      return (labels[0]?.textContent ?? "").replace(/\s+/gu, " ").trim();
    }
    return (element.textContent ?? "").replace(/\s+/gu, " ").trim();
  });
}

/**
 * The most Tab presses a step may take to reach its control. Home and step 1 have a top bar and a
 * grid of cards in front of what they ask for, so the ceiling is generous; it is there so a control
 * that cannot be reached fails in seconds and names what it was looking for, not at the test's
 * timeout.
 */
const MAX_TABS = 120;

/** Presses Tab until the focused element's name matches, and answers how many presses it took. */
export async function tabTo(page: Page, name: RegExp): Promise<number> {
  for (let presses = 1; presses <= MAX_TABS; presses += 1) {
    await page.keyboard.press("Tab");
    if (name.test(await focusedControlName(page))) return presses;
  }
  throw new Error(
    `Tab never reached a control named ${String(name)} in ${String(MAX_TABS)} presses`,
  );
}

/** The focused control is the one asked for, and Enter presses it. */
export async function pressEnterOn(page: Page, name: RegExp): Promise<void> {
  expect(await focusedControlName(page), "Enter is pressed on the control Tab reached").toMatch(
    name,
  );
  await page.keyboard.press("Enter");
}

/** Types into the focused field the way a person does, one key at a time and quickly. */
export async function typeIntoTheFocusedField(page: Page, value: string): Promise<void> {
  await page.keyboard.type(value, { delay: 20 });
}

/**
 * Walks Home to step 3 of "Launch an ad" with Tab and Enter only, choosing the first ad on step 1
 * and typing `place` into the area field when step 2 has none yet. It answers how many Tab presses
 * each step took, so a spec can hold them to a ceiling.
 */
export async function launchAnAdFromHomeByKeyboard(
  page: Page,
  input: Readonly<{ place: string }>,
): Promise<Readonly<Record<string, number>>> {
  const tabs: Record<string, number> = {};

  // UX-001 places property creation first; the existing ad journey remains fully keyboard reachable.
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "One property. One partner. A stronger first impression.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Launch an ad" })).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  tabs["Home to Choose an ad"] = await tabTo(page, /^Choose an ad$/u);
  await pressEnterOn(page, /^Choose an ad$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeVisible();

  // Step 1: the first card's "Use this ad".
  tabs["Step 1 to Use this ad"] = await tabTo(page, /^Use this ad/u);
  await pressEnterOn(page, /^Use this ad/u);
  await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();

  // Step 2: the area, when it is empty, then "Save and check".
  const chips = page.getByRole("list", { name: "Places this ad shows" }).getByRole("listitem");
  if ((await chips.count()) === 0) {
    tabs["Step 2 to the area field"] = await tabTo(page, /^Add a city or state/u);
    await typeIntoTheFocusedField(page, input.place);
    tabs["Step 2 to Add"] = await tabTo(page, /^Add$/u);
    await pressEnterOn(page, /^Add$/u);
    await expect(chips).toHaveCount(1);
  }
  tabs["Step 2 to Save and check"] = await tabTo(page, /^Save and check$/u);
  await pressEnterOn(page, /^Save and check$/u);
  await page.waitForURL(/[?&]step=3(?:&|$)/u, { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Review and launch" })).toBeVisible();
  return tabs;
}

/**
 * Step 3 for a person who can approve: Tab to "Approve this version", Enter, then "Yes, approve" and
 * Enter. The confirmation may take focus itself when it opens, which is what a person hopes for, so
 * Tab is pressed only when it has not.
 */
export async function approveByKeyboard(page: Page): Promise<void> {
  await tabTo(page, /^Approve this version$/u);
  await pressEnterOn(page, /^Approve this version$/u);
  if (!/^Yes, approve$/u.test(await focusedControlName(page))) {
    await tabTo(page, /^Yes, approve$/u);
  }
  await pressEnterOn(page, /^Yes, approve$/u);
  await expect(
    page.locator("[data-launch-step='3']").getByText("Approved by", { exact: false }),
  ).toBeVisible({ timeout: 30_000 });
}
