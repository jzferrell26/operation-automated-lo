import { expect, test, type Page } from "@playwright/test";

import {
  REVIEW_FRAMES,
  expectThemeResolved,
  settleForScreenshot,
  useStoredTheme,
} from "./helpers/design-quality.js";

/**
 * PRD-009 Wave 3 polish: the measurements an independent verifier took of Home against
 * `design/mockups/home-first-run.html` and its previews, at 1440, 1180, 768 and 390 in Light and
 * Dark, held as numbers so a change that moves one fails here.
 *
 * The synthetic demo's person is a campaign creator, so no approval card is drawn for them (009B
 * D3), which is the case where "Running now" used to fill the whole column. The rules that hold
 * these numbers are read, without a browser, in
 * `apps/web/src/features/overview/home-polish.unit.test.ts`. This file measures the result.
 *
 * `--space-6` is the 24px gap between cards, and 518 is the previews' lead measure (the mockup's
 * `60ch` drawn in Segoe UI; the product draws Inter, where 60ch is 604px).
 */

const CARD_GAP = 24;
const LEAD_MEASURE = 518;
/** The lists row is two columns from the page's own breakpoint, and one column below it (009B-AC-003). */
const TWO_COLUMN_FROM = 1100;

type Frame = (typeof REVIEW_FRAMES)[number];

async function openHome(page: Page, frame: Frame): Promise<void> {
  await page.setViewportSize({ width: frame.width, height: frame.height });
  await page.goto("/overview");
  await settleForScreenshot(page);
}

async function measureAt(page: Page, frame: Frame) {
  const setup = page.getByRole("region", { name: "Get set up" });
  const intro = setup.getByText("You can set up an ad now.");
  const progress = setup.getByRole("img", { name: "0 of 3 setup steps done" });
  const firstTitle = setup.getByRole("heading", { level: 3, name: "Connect HighLevel" });
  const firstChip = setup.locator("[data-checklist-state]").first();
  const firstGlyph = setup.locator("li[data-item] > span svg").first();
  const lead = page
    .getByRole("region", { name: "Launch an ad" })
    .getByText("Pick a ready-made Facebook ad");
  const running = page.getByRole("region", { name: "Running now" });
  const question = page
    .getByRole("region", { name: "Launch an ad" })
    .getByText("What do you want to promote?");
  const topics = page.getByRole("list", { name: "What do you want to promote?" });

  const [introBox, progressBox, titleBox, runningBox, rowBox, questionBox, topicsBox] =
    await Promise.all([
      intro.boundingBox(),
      progress.boundingBox(),
      firstTitle.boundingBox(),
      running.boundingBox(),
      running.locator("xpath=..").boundingBox(),
      question.boundingBox(),
      topics.boundingBox(),
    ]);
  if (!introBox || !progressBox || !titleBox || !runningBox || !rowBox) {
    throw new Error(`Home did not lay out at ${frame.name}`);
  }
  if (!questionBox || !topicsBox) throw new Error(`The topic question did not lay out`);
  const leadWidths = await lead.evaluate((element) => {
    const parent = element.parentElement;
    if (parent === null) throw new Error("The lead has no card");
    const style = getComputedStyle(parent);
    return {
      width: element.getBoundingClientRect().width,
      available:
        parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
    };
  });
  const [chipFont, questionFont, glyphSize, buttons, welcomeToCards] = await Promise.all([
    firstChip.evaluate((element) => getComputedStyle(element).fontSize),
    question.evaluate((element) => getComputedStyle(element).fontSize),
    firstGlyph.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height };
    }),
    // Every button of Home: the primary, a topic chip and a checklist action.
    page
      .locator("[data-home='start'] a[data-variant='action'], [data-home='setup'] li > a")
      .evaluateAll((links) =>
        links.map((link) => ({
          weight: getComputedStyle(link).fontWeight,
          name: link.textContent?.trim() ?? "",
        })),
      ),
    // Edge to edge, from the greeting to the first card: the page gap.
    page.getByText(/^Welcome/u).evaluate((greeting) => {
      const card = document.querySelector("[data-home='start']");
      if (card === null) throw new Error("Home has no start card");
      return card.getBoundingClientRect().top - greeting.getBoundingClientRect().bottom;
    }),
  ]);

  return {
    progressToIntro: introBox.y - (progressBox.y + progressBox.height),
    introToFirstItem: titleBox.y - (introBox.y + introBox.height),
    leadWidths,
    runningWidth: runningBox.width,
    rowWidth: rowBox.width,
    chipFont,
    questionFont,
    buttons,
    welcomeToCards,
    // Edge to edge, so it holds whatever line height the question's own box ends up with.
    questionToTopics: topicsBox.y - (questionBox.y + questionBox.height),
    glyphSize,
  };
}

for (const theme of ["light", "dark"] as const) {
  test(`Home keeps the mockup's spacing, measure, glyphs and card widths at every frame in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await useStoredTheme(page, theme);

    for (const frame of REVIEW_FRAMES) {
      await openHome(page, frame);
      await expectThemeResolved(page, theme);
      await expect(page.getByRole("region", { name: "Needs your approval" })).toHaveCount(0);
      const at = `${frame.name} ${theme}`;
      const measured = await measureAt(page, frame);

      // The intro is `--space-4` below the progress bar and sits 20px (`--space-4` plus the first
      // row's `--space-1`) above the first item. It was 0 and 4.
      expect(measured.progressToIntro, `progress bar to intro at ${at}`).toBeCloseTo(16, 0);
      expect(measured.introToFirstItem, `intro to first item at ${at}`).toBeCloseTo(20, 0);

      // The lead is the previews' 518px, or the card's content width when that is narrower.
      expect(measured.leadWidths.width, `lead width at ${at}`).toBeCloseTo(
        Math.min(LEAD_MEASURE, measured.leadWidths.available),
        0,
      );

      // "Running now" is half of the lists row from 1100px (1440 and 1180), and the whole row below
      // it (768 and 390), whether or not an approval card sits beside it.
      const expectedWidth =
        frame.width >= TWO_COLUMN_FROM ? (measured.rowWidth - CARD_GAP) / 2 : measured.rowWidth;
      expect(measured.runningWidth, `Running now width at ${at}`).toBeCloseTo(expectedWidth, 0);

      // The topic question is the secondary step and sits 20px (`--space-5`) above its chips. It
      // was 16px and 12px. The gap is measured between box edges, so it does not move when the
      // body's line height becomes `--leading-normal`.
      expect(measured.questionFont, `topic question text at ${at}`).toBe("14px");
      expect(measured.questionToTopics, `question to topic buttons at ${at}`).toBeCloseTo(20, 0);

      // The state chip is the shared 12px chip (the 2026-10-03 ruling over the mockups' 14px), and
      // the item glyph is the 24px step.
      expect(measured.chipFont, `state chip text at ${at}`).toBe("12px");
      expect(measured.glyphSize.width, `item glyph width at ${at}`).toBe(24);
      expect(measured.glyphSize.height, `item glyph height at ${at}`).toBe(24);

      // Home's buttons keep the shared weight 500 (R4-12), and the page gap is the mockups' `.page`
      // rule: 24px under the greeting, 20px at 390 (R4-13).
      expect(measured.buttons.length, `Home's buttons at ${at}`).toBeGreaterThan(2);
      for (const button of measured.buttons) {
        expect(button.weight, `${button.name} weight at ${at}`).toBe("500");
      }
      expect(measured.welcomeToCards, `greeting to the cards at ${at}`).toBeCloseTo(
        frame.width < 720 ? 20 : 24,
        0,
      );
    }
  });
}
