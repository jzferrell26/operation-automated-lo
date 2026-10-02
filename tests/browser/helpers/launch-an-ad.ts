import { expect, type Locator, type Page } from "@playwright/test";

/**
 * PRD-009d. "Launch an ad" the way a person goes through it, shared by the synthetic suite and the
 * review suite so both reach a campaign by the same route.
 *
 * The ads are the labelled samples both servers show behind the sample flag (009c D3). A
 * campaign's verdict is the product's own: words that claim a rate are the blocking finding
 * `WORDS_RATE_OR_TERM_CLAIM`, so "Needs changes" is what the checks said about a real save rather
 * than a fixture standing in for one.
 */

export const LAUNCH_PATH = "/marketing/campaigns/new";

export const SAMPLE_ADS = Object.freeze({
  firstHome: Object.freeze({ id: "sample-first-home", name: "Sample: First home, start here" }),
  preApproval: Object.freeze({
    id: "sample-pre-approval",
    name: "Sample: Get pre-approved before you shop",
  }),
});

export type SampleAd = (typeof SAMPLE_ADS)[keyof typeof SAMPLE_ADS];

/** Words the checks send back: a rate, a payment, and a term in one headline. */
export const RATE_CLAIM_HEADLINE = "Rates as low as 3.5% this week";

/** Step 2 for one ad, opened by its address, for the specs whose subject is not step 1. */
export function stepTwoPath(ad: SampleAd): string {
  return `${LAUNCH_PATH}?step=2&ad=${ad.id}`;
}

/** The card for one ad on step 1: an article named by the ad's own heading. */
export function adCard(page: Page, ad: SampleAd): Locator {
  return page.getByRole("article", { name: ad.name, exact: true });
}

export async function useThisAd(page: Page, ad: SampleAd): Promise<void> {
  await adCard(page, ad).getByRole("button", { name: "Use this ad" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
}

/** The chips already in "Where it shows". */
export function placeChips(page: Page): Locator {
  return page.getByRole("list", { name: "Places this ad shows" }).getByRole("listitem");
}

/** Types one place and adds it, unless the remembered area already holds it. */
export async function addPlace(page: Page, place: string): Promise<void> {
  if ((await placeChips(page).filter({ hasText: place }).count()) > 0) return;
  await page.getByLabel("Add a city or state", { exact: false }).fill(place);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(placeChips(page).filter({ hasText: place })).toHaveCount(1);
}

/** "Save and check", then step 3 for the saved version. Answers the campaign's reference. */
export async function saveAndCheck(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Save and check" }).click();
  await page.waitForURL(/[?&]step=3(?:&|$)/u, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Review and launch" })).toBeVisible();
  return campaignRefOf(page.url());
}

export function campaignRefOf(url: string): string {
  const ref = new URL(url).searchParams.get("campaign");
  if (ref === null) throw new Error(`No campaign in ${url}`);
  return ref;
}

/** The verdict badge on step 3's "What you approve" card. */
export function verdictOnStepThree(page: Page): Locator {
  return page
    .locator("[data-launch-step='3']")
    .getByRole("heading", { name: "What you approve" })
    .locator("xpath=..");
}

/**
 * Saves one campaign from step 2 of `ad`: the words if given, one place, and "Save and check".
 * Answers the campaign's reference once step 3 is on screen.
 */
export async function saveACampaign(
  page: Page,
  input: Readonly<{ ad: SampleAd; place: string; headline?: string }>,
): Promise<string> {
  await page.goto(stepTwoPath(input.ad));
  await expect(page.getByRole("heading", { level: 1, name: "Set it up" })).toBeVisible();
  if (input.headline !== undefined) {
    await page.getByLabel("Headline", { exact: false }).fill(input.headline);
  }
  await addPlace(page, input.place);
  return saveAndCheck(page);
}
