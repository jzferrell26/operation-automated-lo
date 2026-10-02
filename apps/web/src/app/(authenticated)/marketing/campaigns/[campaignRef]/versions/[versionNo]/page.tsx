import { notFound } from "next/navigation.js";

import { canRenderDashboardPreview } from "../../../../../../../server/dashboard-preview.js";
import { renderCampaignRoute } from "../../campaign-route.js";

/** A version number is a positive integer of at most six digits, with no sign, point, or leading zero. */
const VERSION_NUMBER = /^[1-9][0-9]{0,5}$/u;

/**
 * PRD-009e D3 and 009E-AC-005. An older version of a campaign, opened read-only at an address of its
 * own: no approve, launch, or "Make a new version" control. Its version number must be a positive
 * integer, and a number that is not, a version the campaign never had, and every version of a
 * campaign in another location all answer "not found", exactly as an unknown reference does.
 */
export default async function CampaignVersionPage({
  params,
}: Readonly<{ params: Promise<{ campaignRef: string; versionNo: string }> }>) {
  const { campaignRef, versionNo: typed } = await params;
  if (!VERSION_NUMBER.test(typed)) notFound();
  // The demo preview keeps no version history, so there is nothing at this address to show.
  if (canRenderDashboardPreview()) notFound();
  return renderCampaignRoute(campaignRef, Number(typed));
}
