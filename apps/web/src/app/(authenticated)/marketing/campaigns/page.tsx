import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { CampaignList } from "../../../../features/campaigns/components/campaign-list.js";
import { DashboardPreviewScreen } from "../../../../features/dashboard-preview/dashboard-screen.js";
import { readWorkspaceCampaignsForRequest } from "../../../../server/campaign-workspace-reads.js";
import { canRenderDashboardPreview } from "../../../../server/dashboard-preview.js";
import { SIGN_IN_PATH } from "../../../../server/runtime-authentication.js";

/**
 * PRD-009e 009E-AC-009 to 009E-AC-012. The Campaigns page: the tab strip, "Launch an ad", and every
 * campaign with its true status. The page only reads and hands the rows on; what each row says is
 * decided in `server/campaign-page-data.ts`.
 */
export default async function CampaignListPage() {
  if (canRenderDashboardPreview()) return <DashboardPreviewScreen view="campaigns" />;
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns", { headers: incoming });
  const read = await readWorkspaceCampaignsForRequest(request, process.env);
  // 005A-AC-010. "No campaigns in this location yet" is a tenant claim, so it needs a session.
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  return <CampaignList rows={read.campaigns} />;
}
