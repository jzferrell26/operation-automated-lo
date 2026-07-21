import { CampaignDetailScreen } from "../../../../../features/reporting/components/campaign-detail-screen.js";
import { loadSyntheticReporting } from "../../../../../features/reporting/model/synthetic-reporting.js";

export default function SyntheticCampaignPage() {
  return <CampaignDetailScreen reporting={loadSyntheticReporting()} />;
}
