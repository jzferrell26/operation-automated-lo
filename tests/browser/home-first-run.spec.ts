import { expect, test } from "@playwright/test";

import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectKeyboardReachesEveryControl,
  expectNoHorizontalOverflow,
  expectTargetsAreLargeEnough,
  expectThemeResolved,
  expectTypographyOnBrief,
  settleForScreenshot,
  useStoredTheme,
} from "./helpers/design-quality.js";

/**
 * PRD-009b 009B-AC-014 and the synthetic halves of 009B-AC-001, 002, and 003, in a real browser.
 *
 * The synthetic server is the local demo: nothing is connected, no brand is saved, and the library
 * holds the labelled sample ads (009C-AC-004, the server sets the samples flag). Home has the same
 * composition as on the review project, fed by the local campaign store and the sample catalog, and
 * it links to no section the product removed. The demo's person is a campaign creator, so the
 * approval card, which is for people who can approve, is not drawn for them (009B-AC-010); the
 * review project's spec, `review/home-first-run.spec.ts`, reads it for a workspace owner.
 *
 * The browser checks that need a real account, the first render of a new sign-up, and the empty
 * library live in the review project. This file needs a browser run; it needs no database.
 */

const REMOVED_SECTIONS = /^\/(?:leads|automations|reports|marketplace|onboarding)(?:\/|$)/u;

test("Home has the same composition in the local demo, in order (009B-AC-001, 014)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/overview");
  await settleForScreenshot(page);

  await expect(page.getByRole("heading", { level: 1, name: "Launch an ad" })).toBeVisible();
  const headings = await page
    .getByRole("main")
    .getByRole("heading", { level: 2 })
    .allTextContents();
  expect(headings).toEqual(["Get set up", "Running now"]);
  await expect(
    page.getByText("HighLevel stays your CRM. Your contacts, pipelines and follow-up live there."),
  ).toBeVisible();

  for (const gone of [
    "Your numbers",
    "More numbers",
    "Quick actions",
    "Coming later",
    "How things stand",
    "What you have going on",
    "Your workspace",
    "Examples only",
  ]) {
    await expect(page.getByText(gone, { exact: true }), gone).toHaveCount(0);
  }
  await expect(page.locator("main .oalo-metric")).toHaveCount(0);
  await expect(page.locator("[role='dialog']")).toHaveCount(0);
});

test("Home links to no removed section and no demo address (009B-AC-014)", async ({ page }) => {
  await page.goto("/overview");

  const hrefs = await page
    .locator("main a[href]")
    .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""));
  expect(hrefs.length).toBeGreaterThan(5);
  expect(hrefs.filter((href) => REMOVED_SECTIONS.test(href))).toEqual([]);
  expect(hrefs.filter((href) => /synthetic/iu.test(href))).toEqual([]);
});

test("the topic buttons come from the sample library, and open step 1 with the topic (009B-AC-002)", async ({
  page,
}) => {
  await page.goto("/overview");
  const topics = page
    .getByRole("region", { name: "Launch an ad" })
    .getByRole("list", { name: "What do you want to promote?" })
    .getByRole("link");

  await expect(topics).toHaveText([
    "First-time buyers",
    "Refinance",
    "VA loans",
    "Pre-approval",
    "Down payment help",
  ]);
  await topics.nth(1).click();
  await page.waitForURL("**/marketing/campaigns/new?topic=refinance");
});

test("the checklist says what is not connected once, and the brand is not started (009B-AC-004, 008)", async ({
  page,
}) => {
  await page.goto("/overview");
  const setup = page.getByRole("region", { name: "Get set up" });

  await expect(setup.getByText("0 of 3 done")).toBeVisible();
  await expect(page.getByText("Not connected yet")).toHaveCount(2);
  await expect(setup.getByText("Not started")).toHaveCount(1);
  await expect(setup.getByRole("link", { name: "Connect HighLevel" })).toHaveAttribute(
    "href",
    "/settings/connections",
  );
  await expect(setup.getByRole("link", { name: "Add your brand" })).toHaveAttribute(
    "href",
    "/brand",
  );
  // The old statements and the old metric text appear nowhere on the page.
  await expect(page.getByText("HighLevel and Meta aren't connected.")).toHaveCount(0);
  await expect(page.getByText(/Not connected$/u)).toHaveCount(0);
});

test("Choose an ad is the first of Home's controls after the top bar, then the topics (009B-AC-003)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/overview");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  const walked: string[] = [];
  for (let press = 0; press < 40; press += 1) {
    await page.keyboard.press("Tab");
    walked.push(
      await page.evaluate(() => {
        const focused = document.activeElement as HTMLElement | null;
        return (focused?.getAttribute("aria-label") ?? focused?.textContent ?? "").trim();
      }),
    );
    if (walked.includes("Down payment help")) break;
  }

  expect(walked[0]).toBe("Skip to content");
  const primary = walked.indexOf("Choose an ad");
  const topBarEnd = walked.findIndex((name) => name.startsWith("Your account: "));
  expect(topBarEnd).toBeGreaterThan(0);
  expect(primary, "nothing but the top bar stands before Choose an ad").toBe(topBarEnd + 1);
  expect(walked.slice(primary, primary + 6)).toEqual([
    "Choose an ad",
    "First-time buyers",
    "Refinance",
    "VA loans",
    "Pre-approval",
    "Down payment help",
  ]);
});

for (const frame of REVIEW_FRAMES.filter((candidate) => candidate.width < 1100)) {
  test(`at ${frame.name} the cards stack in order: start, checklist, running (009B-AC-003)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: frame.width, height: frame.height });
    await page.goto("/overview");

    const boxes = await Promise.all(
      ["Launch an ad", "Get set up", "Running now"].map((name) =>
        page.getByRole("region", { name }).boundingBox(),
      ),
    );
    for (let index = 1; index < boxes.length; index += 1) {
      const previous = boxes[index - 1];
      const next = boxes[index];
      expect(previous && next).toBeTruthy();
      expect(next?.y ?? 0).toBeGreaterThan((previous?.y ?? 0) + (previous?.height ?? 0) - 1);
      expect(Math.abs((next?.x ?? 0) - (previous?.x ?? 0))).toBeLessThan(1);
    }
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`Home meets the machine checks at every frame in ${theme} (009B-AC-013)`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await useStoredTheme(page, theme);
    for (const frame of REVIEW_FRAMES) {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await page.goto("/overview");
      await expectThemeResolved(page, theme);
      await settleForScreenshot(page);

      await expectAxeClean(page);
      await expectNoHorizontalOverflow(page);
      await expectTargetsAreLargeEnough(page);
      await expectTypographyOnBrief(page);
    }
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto("/overview");
    await settleForScreenshot(page);
    await expectKeyboardReachesEveryControl(page);
  });
}
