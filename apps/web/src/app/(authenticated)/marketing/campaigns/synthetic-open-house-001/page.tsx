import { CampaignDetailScreen } from "../../../../../features/reporting/components/campaign-detail-screen.js";
import {
  ReviewNotConnectedScreen,
  type ReviewNotConnectedRegion,
} from "../../../../../features/shell/components/review-not-connected-screen.js";
import { loadAuthenticatedWorkspace } from "../../../../../server/authenticated-workspace-data.js";
import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";
import { ExampleCampaign } from "../../../../../features/dashboard-preview/example-campaign.js";

/**
 * The synthetic campaign detail renders the reporting fixture: a Meta connection reported as
 * `connected`, selected provider asset ids, an approval snapshot with a named approver, a budget,
 * and a schedule. Every one of those reads as observed provider state, so review mode names the
 * regions instead and reports each as not connected.
 */
const reviewCampaignRegions: readonly ReviewNotConnectedRegion[] = Object.freeze([
  ["meta_connection", "Your Meta connection"],
  ["selected_assets", "The Meta pages and accounts you picked"],
  ["artifact_versions", "Versions of this campaign"],
  ["creative_originals", "Artwork and downloads"],
  ["campaign_history", "What changed, and when"],
  ["approval_scope", "What the approval covers"],
  ["launch_summary", "The launch summary"],
] as const satisfies readonly ReviewNotConnectedRegion[]);

const REVIEW_CAMPAIGN_REGION_SOURCE =
  "HighLevel and Meta aren't connected, so there's no campaign, no ad, and no approval to show.";

export default function SyntheticCampaignPage() {
  if (canRenderDashboardPreview()) return <ExampleCampaign />;
  const workspace = loadAuthenticatedWorkspace();

  if (workspace.mode === "review") {
    return (
      <ReviewNotConnectedScreen
        eyebrow="Campaign"
        heading="This campaign isn't connected yet"
        lead="HighLevel and Meta aren't connected to this workspace, so there's no campaign, artwork, approval, or launch plan to show."
        regionSource={REVIEW_CAMPAIGN_REGION_SOURCE}
        regions={reviewCampaignRegions}
        regionsTitle="What you'll see here"
        regionsTitleId="review-campaign-title"
      />
    );
  }

  return <CampaignDetailScreen reporting={workspace.reporting} />;
}
