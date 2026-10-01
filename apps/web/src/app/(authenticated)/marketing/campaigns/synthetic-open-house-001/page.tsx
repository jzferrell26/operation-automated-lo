import { notFound } from "next/navigation.js";

import { CampaignDetailScreen } from "../../../../../features/reporting/components/campaign-detail-screen.js";
import { loadAuthenticatedWorkspace } from "../../../../../server/authenticated-workspace-data.js";
import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";
import { ExampleCampaign } from "../../../../../features/dashboard-preview/example-campaign.js";

/**
 * The synthetic campaign detail renders the reporting fixture: a Meta connection reported as
 * `connected`, selected provider asset ids, an approval snapshot with a named approver, a budget,
 * and a schedule. Every one of those reads as observed provider state, so a signed-in workspace
 * does not have this page at all (PRD-008b 008B-AC-008). It used to answer there with a
 * not-connected screen for a campaign that was never the person's, and nothing links to it. The
 * demo and the local preview keep it.
 */
export default function SyntheticCampaignPage() {
  if (canRenderDashboardPreview()) return <ExampleCampaign />;
  const workspace = loadAuthenticatedWorkspace();

  if (workspace.mode === "review") notFound();

  return <CampaignDetailScreen reporting={workspace.reporting} />;
}
