import { expect, type Page } from "@playwright/test";

import { withAnEmptyCampaignWorkspace } from "./empty-campaign-workspace.js";
import {
  RATE_CLAIM_HEADLINE,
  SAMPLE_ADS,
  saveACampaign,
  verdictOnStepThree,
  type SampleAd,
} from "./launch-an-ad.js";

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
 * empty fixture, saves each campaign below through "Launch an ad" with the controls a person uses,
 * so every record is one the server made and checked rather than a file written by hand, and puts
 * the original store back afterwards through the same fixture. Saves are sequential and the store
 * keeps campaigns in the order they were saved, so the list's order is the order here.
 *
 * Two campaigns, because a list of one does not show what a list is for, and the two the product's
 * checks can tell apart: one ready for approval and one that needs changes. PRD-009d: each is a
 * library ad with its own headline, so the two cards differ by what a person reads first and not
 * only by the badge. The second claims a rate, which the checks send back.
 */

export type PopulatedCampaign = Readonly<{
  ad: SampleAd;
  headline: string;
  place: string;
  /** The verdict on step 3 once the checks have run. */
  checks: "Checks passed" | "Needs changes";
  /** The list's badge for the same campaign. */
  verdict: "Ready for approval" | "Needs changes";
}>;

export const POPULATED_CAMPAIGNS: readonly PopulatedCampaign[] = Object.freeze([
  Object.freeze({
    ad: SAMPLE_ADS.firstHome,
    headline: "Your first home starts with a plan",
    place: "Austin, TX",
    checks: "Checks passed",
    verdict: "Ready for approval",
  }),
  Object.freeze({
    ad: SAMPLE_ADS.preApproval,
    headline: RATE_CLAIM_HEADLINE,
    place: "Austin, TX",
    checks: "Needs changes",
    verdict: "Needs changes",
  }),
]);

async function saveThroughLaunchAnAd(page: Page, campaign: PopulatedCampaign): Promise<void> {
  await saveACampaign(page, campaign);
  await expect(verdictOnStepThree(page)).toContainText(campaign.checks);
}

/** Runs `work` against a synthetic workspace holding exactly `POPULATED_CAMPAIGNS`. */
export async function withAPopulatedCampaignWorkspace(
  page: Page,
  work: () => Promise<void>,
): Promise<void> {
  await withAnEmptyCampaignWorkspace(async () => {
    for (const campaign of POPULATED_CAMPAIGNS) {
      await saveThroughLaunchAnAd(page, campaign);
    }
    await work();
  });
}
