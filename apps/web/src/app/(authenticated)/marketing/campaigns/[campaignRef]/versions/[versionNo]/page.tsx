import { headers } from "next/headers.js";
import { notFound, redirect } from "next/navigation.js";

import { PersistedCampaignScreen } from "../../../../../../../features/campaigns/components/persisted-campaign-screen.js";
import { AuthenticatedWorkspaceUnavailableError } from "../../../../../../../server/authenticated-workspace-data.js";
import { CampaignWorkspaceStoreUnavailableError } from "../../../../../../../server/campaign-persistence-runtime.js";
import { readWorkspaceCampaignForRequest } from "../../../../../../../server/campaign-workspace-reads.js";
import { canRenderDashboardPreview } from "../../../../../../../server/dashboard-preview.js";
import { SIGN_IN_PATH } from "../../../../../../../server/runtime-authentication.js";

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
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns", { headers: incoming });
  let read: Awaited<ReturnType<typeof readWorkspaceCampaignForRequest>>;
  try {
    read = await readWorkspaceCampaignForRequest(request, campaignRef, process.env, Number(typed));
  } catch (error) {
    if (
      error instanceof CampaignWorkspaceStoreUnavailableError ||
      error instanceof AuthenticatedWorkspaceUnavailableError
    ) {
      throw error;
    }
    notFound();
  }
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  if (read.campaign === undefined) notFound();
  if (read.campaign.kind === "redirect") redirect(read.campaign.href);
  return <PersistedCampaignScreen page={read.campaign.page} />;
}
