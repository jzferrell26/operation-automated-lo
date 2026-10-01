import { expect, type Page } from "@playwright/test";

import { withAnEmptyCampaignWorkspace } from "./empty-campaign-workspace.js";
import {
  FINISHED_OPEN_HOUSE,
  READY_OPEN_HOUSE,
  fillTheOpenHouseDraft,
  type OpenHouseWindow,
} from "./open-house-draft.js";

/**
 * PRD-008d 008D-AC-010, the sign-off's "Campaigns list, populated" row. The synthetic workspace
 * with exactly the campaigns this file saves in it, and nothing else.
 *
 * The suite's screen matrix runs before any test saves a campaign, so on the runner, whose
 * workspace starts empty, the campaigns list it photographed was the empty state, and the
 * populated row had no populated picture. Taking the list after the create-screen tests instead
 * would make the picture depend on test order and on what an earlier run on the same machine left
 * behind, which is the problem `empty-campaign-workspace.ts` exists to remove.
 *
 * So the populated workspace is the empty one plus the product's own saves. It starts from the
 * empty fixture, saves each campaign below through the create screen with the controls a person
 * uses, so every record is one the server made and checked rather than a file written by hand, and
 * puts the original store back afterwards through the same fixture. Saves are sequential and the
 * store keeps campaigns in the order they were saved, so the list's order is the order here.
 *
 * Two campaigns, because a list of one does not show what a list is for, and the two the product's
 * checks can tell apart: one ready for approval and one that needs changes. Each has its own
 * headline and address, as two campaigns a person wrote would, so the two cards differ by what a
 * person reads first and not only by the badge. Left alone, both would carry the create screen's
 * one starter headline.
 */

export type PopulatedCampaign = Readonly<{
  headline: string;
  address: string;
  openHouse: OpenHouseWindow;
  /** The create screen's verdict once the checks have run, which is also the list's badge. */
  verdict: "Ready for approval" | "Needs changes";
}>;

export const POPULATED_CAMPAIGNS: readonly PopulatedCampaign[] = Object.freeze([
  Object.freeze({
    headline: "Open house on Cedar Street this Saturday",
    address: "48 Cedar Street, Austin",
    openHouse: READY_OPEN_HOUSE,
    verdict: "Ready for approval",
  }),
  Object.freeze({
    headline: "Tour the Birch Lane home",
    address: "12 Birch Lane, Austin",
    openHouse: FINISHED_OPEN_HOUSE,
    verdict: "Needs changes",
  }),
]);

async function saveThroughTheCreateScreen(page: Page, campaign: PopulatedCampaign): Promise<void> {
  await page.goto("/marketing/campaigns/new");
  await fillTheOpenHouseDraft(page, campaign.openHouse);
  await page.getByLabel("Property address").fill(campaign.address);
  await page.getByLabel("Headline", { exact: true }).fill(campaign.headline);
  await page.getByRole("button", { name: "Save and run the checks" }).click();
  await expect(page.getByRole("heading", { name: campaign.verdict })).toBeVisible();
}

/** Runs `work` against a synthetic workspace holding exactly `POPULATED_CAMPAIGNS`. */
export async function withAPopulatedCampaignWorkspace(
  page: Page,
  work: () => Promise<void>,
): Promise<void> {
  await withAnEmptyCampaignWorkspace(async () => {
    for (const campaign of POPULATED_CAMPAIGNS) {
      await saveThroughTheCreateScreen(page, campaign);
    }
    await work();
  });
}
