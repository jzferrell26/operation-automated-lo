import { headers } from "next/headers.js";
import { notFound, redirect } from "next/navigation.js";

import { PersistedCampaignScreen } from "../../../../../features/campaigns/components/persisted-campaign-screen.js";
import { DashboardPreviewCampaign } from "../../../../../features/dashboard-preview/dashboard-screen.js";
import { AuthenticatedWorkspaceUnavailableError } from "../../../../../server/authenticated-workspace-data.js";
import { CampaignWorkspaceStoreUnavailableError } from "../../../../../server/campaign-persistence-runtime.js";
import { readWorkspaceCampaignForRequest } from "../../../../../server/campaign-workspace-reads.js";
import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";
import { SIGN_IN_PATH } from "../../../../../server/runtime-authentication.js";

/**
 * PRD-009e. The campaign page for the newest version of a campaign. An unknown reference, and a
 * campaign in another location, both answer "not found" (009E-AC-005).
 */
export default async function CampaignPage({
  params,
}: Readonly<{ params: Promise<{ campaignRef: string }> }>) {
  const { campaignRef } = await params;
  if (canRenderDashboardPreview()) return <DashboardPreviewCampaign campaignRef={campaignRef} />;
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns", { headers: incoming });
  let read: Awaited<ReturnType<typeof readWorkspaceCampaignForRequest>>;
  try {
    read = await readWorkspaceCampaignForRequest(request, campaignRef, process.env);
  } catch (error) {
    // A deployment that cannot serve this read is a failure, not a missing campaign: both of these
    // reach the route error boundary rather than becoming a page that says the campaign is gone.
    if (
      error instanceof CampaignWorkspaceStoreUnavailableError ||
      error instanceof AuthenticatedWorkspaceUnavailableError
    ) {
      throw error;
    }
    notFound();
  }
  // 005A-AC-010. Not signed in is not the same answer as this campaign does not exist.
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  if (read.campaign === undefined) notFound();
  if (read.campaign.kind === "redirect") redirect(read.campaign.href);
  return <PersistedCampaignScreen page={read.campaign.page} />;
}
