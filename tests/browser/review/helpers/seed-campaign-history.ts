import { seedReviewAccountCampaigns } from "../../../../packages/db/test/route-seeding-bridge.js";
import { LAUNCH_PATH } from "../../helpers/launch-an-ad.js";
import { HISTORY_LABELS, buildCampaignHistory, type HistoryLabel } from "./campaign-history.js";
import { reviewDatabaseUrl } from "./review-database.js";

/**
 * PRD-009g, 009G-AC-002. Puts the campaigns the product no longer lets a person make into the review
 * account's workspace, and answers where each one is.
 *
 * What the three are, why a browser cannot make them, and what is stored is in `campaign-history.ts`.
 * How they are written, and the rule that they are written only in the review run's own database, is
 * `seedReviewAccountCampaigns` in `packages/db/test/campaign-integration-support.mjs`; this file
 * only supplies the connection by the review run's own constants (`review-database.ts`) and turns
 * what was stored into the addresses the spec visits. It adds no route and no switch to the product:
 * the pages it names are the product's own, and they read what is stored.
 *
 * The database package is loaded from its build by the harness, so this runs only inside the review
 * browser run, which builds `@oalo/web` and everything under it before the browser starts.
 */

export type SeededCampaignPages = Readonly<{
  ref: string;
  /** Step 3 of "Launch an ad" for this campaign. Only a library ad has one. */
  stepThree: string;
  /** The campaign's own page. */
  page: string;
}>;

export type SeededCampaignHistory = Readonly<{
  earlierFlow: SeededCampaignPages;
  newerVersion: SeededCampaignPages;
  adRetired: SeededCampaignPages;
}>;

export function pagesOf(ref: string): SeededCampaignPages {
  return Object.freeze({
    ref,
    stepThree: `${LAUNCH_PATH}?step=3&campaign=${ref}`,
    page: `/marketing/campaigns/${ref}`,
  });
}

/**
 * Stores the three campaigns for the account that signed up as `email`, taking the brand, budget,
 * area, and dates from `templateCampaignRef`, a campaign that account saved through the product.
 */
export async function seedCampaignHistory(
  input: Readonly<{ email: string; templateCampaignRef: string }>,
): Promise<SeededCampaignHistory> {
  const stored = await seedReviewAccountCampaigns({
    connectionString: await reviewDatabaseUrl(),
    email: input.email,
    templateCampaignRef: input.templateCampaignRef,
    build: ({ account, template }) => buildCampaignHistory({ account, template }),
  });
  const named = (label: HistoryLabel): SeededCampaignPages => {
    const campaign = stored.find((candidate) => candidate.label === label);
    if (campaign === undefined) throw new Error(`The ${label} campaign was not stored`);
    return pagesOf(campaign.campaignRef);
  };
  return Object.freeze({
    earlierFlow: named(HISTORY_LABELS.earlierFlow),
    newerVersion: named(HISTORY_LABELS.newerVersion),
    adRetired: named(HISTORY_LABELS.adRetired),
  });
}
