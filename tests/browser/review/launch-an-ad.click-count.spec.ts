import { expect, test, type Page } from "@playwright/test";

import {
  countActivations,
  readActivations,
  resetActivations,
} from "../helpers/activation-count.js";
import { expectNoHorizontalOverflow } from "../helpers/design-quality.js";
import { SAMPLE_ADS, adCard, placeChips } from "../helpers/launch-an-ad.js";
import {
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  signUpFreshAccount,
} from "./helpers/guided-setup-journey.js";

/**
 * PRD-009d D9 and 009D-AC-022: the happy path from Home to an approved campaign, counted.
 *
 * A workspace owner can approve, so one person goes the whole way; that person signs up here,
 * because the two seeded people are a creator who cannot approve and an approver who cannot write
 * a campaign. This is the run's one extra sign-up: PRD-006d's arithmetic left eight of the ten an
 * hour per address spent (`review/design-quality.spec.ts`), so this makes nine.
 *
 * Saving the brand comes first and is not counted: the criterion is about a person who already has
 * a saved brand. Everything from Home on is counted by the page itself
 * (`helpers/activation-count.ts`), so a control the spec presses that is not a control, or a field
 * it fills that the product should have filled, shows up in the total.
 *
 * - The first campaign: Choose an ad (Home's primary link), Use this ad, Add, Save and check,
 *   Approve this version, Yes, approve. Six activations and one typed field (one place).
 * - The second campaign: the same less Add, because the area the person used last time is already
 *   there. Five activations and no typed field.
 * - Neither touches a checkbox or a file input.
 *
 * Then, outside the count, 009D-AC-004 in a real browser: an 80-character name on the band, at all
 * four frames, wraps and shrinks to no less than 14px and stays inside the band.
 */

/**
 * Writing review pass 2, W-31: each "Use this ad" button carries its ad's name, as a hidden suffix,
 * so the counter (which reads a control's text) names the ad that was chosen.
 */
function firstCampaign(ad: (typeof SAMPLE_ADS)[keyof typeof SAMPLE_ADS]): readonly string[] {
  return Object.freeze([
    "Choose an ad",
    `Use this ad: ${ad.name}`,
    "Add",
    "Save and check",
    "Approve this version",
    "Yes, approve",
  ]);
}

function secondCampaign(ad: (typeof SAMPLE_ADS)[keyof typeof SAMPLE_ADS]): readonly string[] {
  return Object.freeze([
    "Choose an ad",
    `Use this ad: ${ad.name}`,
    "Save and check",
    "Approve this version",
    "Yes, approve",
  ]);
}

const LONG_NAME =
  "Alexandra Bartholomew Montgomery-Whitfield Fitzgerald Wellington-Smyth the Third";

async function saveTheBrand(page: Page, name?: string): Promise<void> {
  await page.goto("/brand", { waitUntil: "networkidle" });
  const main = page.getByRole("main");
  if (name !== undefined) await main.getByLabel("Loan officer name", { exact: false }).fill(name);
  await main.getByLabel("Loan officer NMLS", { exact: false }).fill("1234567");
  await main.getByLabel("Company NMLS", { exact: false }).fill("7654321");
  await main.getByRole("button", { name: "Save report branding", exact: true }).click();
  await expect(main.getByText("Your changes are saved.").first()).toBeVisible();
  if (name !== undefined) return;
  await main.getByLabel("Title on your ads", { exact: false }).fill("Loan officer");
  await main.getByRole("button", { name: "Save ad brand", exact: true }).click();
  await expect(main.getByText("Your changes are saved.")).toHaveCount(2);
}

/** Home to an approved campaign, pressing only what a person presses. */
async function launchFromHome(
  page: Page,
  input: Readonly<{ ad: (typeof SAMPLE_ADS)[keyof typeof SAMPLE_ADS]; place?: string }>,
): Promise<void> {
  await page.goto("/overview", { waitUntil: "networkidle" });
  await resetActivations(page);
  // Home's one primary control is a link named "Choose an ad" inside the start card, the way
  // `home-first-run.spec.ts` asserts it (009B-AC-002). It is matched exactly and nowhere else, so a
  // Home that stopped drawing it, or drew it as something else, fails here rather than being
  // reached some other way.
  await page
    .getByRole("region", { name: "Launch an ad" })
    .getByRole("link", { name: "Choose an ad", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Choose an ad" })).toBeVisible();
  await expect(page.locator("input[type='file' i], input[type='checkbox' i]")).toHaveCount(0);
  await adCard(page, input.ad)
    .getByRole("button", { name: /^Use this ad/u })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
  await expect(page.locator("input[type='file' i], input[type='checkbox' i]")).toHaveCount(0);
  if (input.place !== undefined) {
    await page.getByLabel("Add a city or state", { exact: false }).fill(input.place);
    await page.getByRole("button", { name: "Add", exact: true }).click();
  }
  await expect(placeChips(page)).not.toHaveCount(0);
  await page.getByRole("button", { name: "Save and check" }).click();
  await page.waitForURL(/[?&]step=3(?:&|$)/u, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Review and launch" })).toBeVisible();
  await expect(page.locator("input[type='file' i], input[type='checkbox' i]")).toHaveCount(0);
  await page.getByRole("button", { name: "Approve this version" }).click();
  await page.getByRole("button", { name: "Yes, approve" }).click();
  await expect(
    page.locator("[data-launch-step='3']").getByText("Approved by", { exact: false }),
  ).toBeVisible({ timeout: 30_000 });
  // Launching stays off whatever was approved (009D-AC-016).
  await expect(page.getByRole("button", { name: "Launch on Facebook" })).toBeDisabled();
}

test("a workspace owner with a saved brand goes from Home to approved in 6 then 5 activations (009D-AC-022, 004)", async ({
  page,
}) => {
  test.setTimeout(360_000);
  const guard = await guardLocalOrigin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await countActivations(page);
  await signUpFreshAccount(page, freshEmail());
  await saveTheBrand(page);

  await launchFromHome(page, { ad: SAMPLE_ADS.firstHome, place: "Austin, TX" });
  const first = await readActivations(page);
  expect(first.activations, "the first campaign's activations").toEqual(
    firstCampaign(SAMPLE_ADS.firstHome),
  );
  expect(first.typedFields, "the first campaign's typed fields").toHaveLength(1);
  expect(first.typedFields[0]).toMatch(/^Add a city or state/u);
  expect(first.forbidden).toEqual([]);

  await launchFromHome(page, { ad: SAMPLE_ADS.preApproval });
  const second = await readActivations(page);
  expect(second.activations, "the second campaign's activations").toEqual(
    secondCampaign(SAMPLE_ADS.preApproval),
  );
  expect(second.typedFields, "the second campaign's typed fields").toEqual([]);
  expect(second.forbidden).toEqual([]);

  // 009D-AC-004, outside the count: the longest name the band is built for, at every frame.
  await saveTheBrand(page, LONG_NAME);
  await page.goto("/marketing/campaigns/new?step=2&ad=sample-first-home", {
    waitUntil: "networkidle",
  });
  for (const width of [1440, 1180, 768, 390]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 });
    const bands = page.locator("[data-brand-band]");
    await expect(bands.first()).toBeVisible();
    const problems = await bands.evaluateAll((elements) =>
      elements.flatMap((band) => {
        const outer = band.getBoundingClientRect();
        const found: string[] = [];
        if (band.scrollWidth > band.clientWidth + 1) found.push("the band scrolls");
        for (const child of band.querySelectorAll("*")) {
          const inner = child.getBoundingClientRect();
          if (inner.width > 0 && (inner.right > outer.right + 1 || inner.left < outer.left - 1)) {
            found.push(`${child.tagName} leaves the band`);
          }
        }
        const name = band.querySelector("[data-name-size]");
        if (name !== null && Number.parseFloat(getComputedStyle(name).fontSize) < 14) {
          found.push("the name is under 14px");
        }
        return found;
      }),
    );
    expect(problems, `the long name at ${String(width)}`).toEqual([]);
    await expectNoHorizontalOverflow(page);
  }

  expectNoExternalRequests(guard);
});
