import { CampaignDetailScreen } from "../../../../../features/reporting/components/campaign-detail-screen.js";
import { loadAuthenticatedWorkspace } from "../../../../../server/authenticated-workspace-data.js";

export default function SyntheticCampaignPage() {
  return <CampaignDetailScreen reporting={loadAuthenticatedWorkspace().reporting} />;
}
