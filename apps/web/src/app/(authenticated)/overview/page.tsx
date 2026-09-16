import { headers } from "next/headers.js";

import { OverviewScreen } from "../../../features/overview/components/overview-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";
import { loadWorkspaceCampaignsForRequest } from "../../../server/campaign-workspace-reads.js";

export default async function OverviewPage() {
  const workspace = loadAuthenticatedWorkspace();
  const incoming = await headers();
  const request = new Request("https://oalo.local/overview", { headers: incoming });
  const workspaceCampaigns = await loadWorkspaceCampaignsForRequest(request, process.env);
  return (
    <OverviewScreen
      overview={workspace.ui.overview}
      session={workspace.ui.session}
      workspaceCampaigns={workspaceCampaigns}
      workspaceMode={workspace.mode}
    />
  );
}
