import { DashboardPreviewCampaign } from "../../../../../features/dashboard-preview/dashboard-screen.js";
import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";
import { renderCampaignRoute } from "./campaign-route.js";

/**
 * PRD-009e. The campaign page for the newest version of a campaign. An unknown reference, and a
 * campaign in another location, both answer "not found" (009E-AC-005).
 */
export default async function CampaignPage({
  params,
}: Readonly<{ params: Promise<{ campaignRef: string }> }>) {
  const { campaignRef } = await params;
  if (canRenderDashboardPreview()) return <DashboardPreviewCampaign campaignRef={campaignRef} />;
  return renderCampaignRoute(campaignRef);
}
