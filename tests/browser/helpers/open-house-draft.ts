import type { Page } from "@playwright/test";

/**
 * PRD-006d D3. Everything a person types into the create screen, typed once, so the synthetic suite
 * and the review suite reach the same campaign by the same route.
 *
 * The two dates are the only difference between a campaign that is ready and one that needs
 * changes: an open house that has already finished is the blocking finding `OPEN_HOUSE_DATES_INVALID`
 * (`packages/domain/src/campaign-foundation.ts:238-250`), so "Needs changes" is the product's own
 * verdict on a real draft rather than a fixture standing in for one.
 *
 * Both dates are far from today on purpose. A committed baseline shows the value in the field, so a
 * date computed from the clock would move the picture every run, and a date a few weeks out would
 * stop being in the future before the baseline stopped being current.
 */

export type OpenHouseWindow = Readonly<{ startsAt: string; endsAt: string }>;

export const READY_OPEN_HOUSE: OpenHouseWindow = Object.freeze({
  startsAt: "2030-06-12T13:00",
  endsAt: "2030-06-12T15:00",
});

export const FINISHED_OPEN_HOUSE: OpenHouseWindow = Object.freeze({
  startsAt: "2020-06-12T13:00",
  endsAt: "2020-06-12T15:00",
});

/**
 * Filled rather than typed. PRD-006c's timed run measures what a person's first five minutes cost
 * and types every character at 200 ms to do it; this is not that run. Here the typing is not the
 * subject, the screen the typing leads to is, and `fill` also replaces whatever the profile
 * prefilled instead of appending to it.
 */
export async function fillTheOpenHouseDraft(page: Page, openHouse: OpenHouseWindow): Promise<void> {
  await page.getByLabel("Property address").fill("48 Cedar Street, Austin");
  await page.getByLabel("State", { exact: true }).fill("TX");
  await page.getByLabel("Property description").fill("A three-bedroom home near the park.");
  await page.getByLabel("Open house starts").fill(openHouse.startsAt);
  await page.getByLabel("Open house ends").fill(openHouse.endsAt);
  await page.getByLabel("Realtor name").fill("Priya Nadeem");
  await page.getByLabel("I have permission to market this property.").check();
  await page.getByLabel("I have permission to use the Realtor's materials.").check();
  await page.getByLabel("Where the ad runs").fill("Austin metro");
}
