import { CampaignDetailScreen } from "../../../../../features/reporting/components/campaign-detail-screen.js";
import {
  ReviewNotConnectedScreen,
  type ReviewNotConnectedRegion,
} from "../../../../../features/shell/components/review-not-connected-screen.js";
import { loadAuthenticatedWorkspace } from "../../../../../server/authenticated-workspace-data.js";

/**
 * The synthetic campaign detail renders the reporting fixture: a Meta connection reported as
 * `connected`, selected provider asset ids, an approval snapshot with a named approver, a budget,
 * and a schedule. Every one of those reads as observed provider state, so review mode names the
 * regions instead and reports each as not connected.
 */
const reviewCampaignRegions: readonly ReviewNotConnectedRegion[] = Object.freeze([
  ["meta_connection", "Meta connection"],
  ["selected_assets", "Selected Meta assets"],
  ["artifact_versions", "Artifact versions"],
  ["creative_originals", "Creative previews and originals"],
  ["campaign_history", "Campaign history"],
  ["approval_scope", "Approval scope"],
  ["launch_summary", "Launch summary"],
] as const satisfies readonly ReviewNotConnectedRegion[]);

const REVIEW_CAMPAIGN_REGION_SOURCE =
  "Not connected. Review surface has no campaign version, provider asset, or approval record.";

export default function SyntheticCampaignPage() {
  const workspace = loadAuthenticatedWorkspace();

  if (workspace.mode === "review") {
    return (
      <ReviewNotConnectedScreen
        eyebrow="Review surface"
        heading="This campaign is not connected"
        lead="No HighLevel or Meta connection exists on this deployment, so no campaign version, creative, approval, or launch plan can be shown here."
        regionSource={REVIEW_CAMPAIGN_REGION_SOURCE}
        regions={reviewCampaignRegions}
        regionsTitle="Campaign detail regions"
        regionsTitleId="review-campaign-title"
      />
    );
  }

  return <CampaignDetailScreen reporting={workspace.reporting} />;
}
