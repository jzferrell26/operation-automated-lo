import type { Metadata } from "next";

import { PAGE_TITLES } from "../../../../../copy/page-titles.js";
import { DashboardPreviewCampaign } from "../../../../../features/dashboard-preview/dashboard-screen.js";
import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";
import { campaignRouteMetadata, renderCampaignRoute } from "./campaign-route.js";

/** Writing review W-13: the tab names the ad, as the page's heading does. */
export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ campaignRef: string }> }>): Promise<Metadata> {
  const { campaignRef } = await params;
  if (canRenderDashboardPreview()) return { title: PAGE_TITLES.campaign };
  return campaignRouteMetadata(campaignRef);
}

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
