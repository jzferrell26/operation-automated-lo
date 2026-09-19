import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { OverviewScreen } from "../../../features/overview/components/overview-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";
import { readWorkspaceCampaignsForRequest } from "../../../server/campaign-workspace-reads.js";
import { REVIEW_SIGN_IN_PATH } from "../../../server/runtime-authentication.js";

export default async function OverviewPage() {
  const workspace = loadAuthenticatedWorkspace();
  const incoming = await headers();
  const request = new Request("https://oalo.local/overview", { headers: incoming });
  const read = await readWorkspaceCampaignsForRequest(request, process.env);
  // 005A-AC-010. An unauthenticated review visitor never sees an empty tenant list.
  if (!read.authenticated) redirect(REVIEW_SIGN_IN_PATH);
  return (
    <OverviewScreen
      overview={workspace.ui.overview}
      session={workspace.ui.session}
      workspaceCampaigns={read.campaigns}
      workspaceMode={workspace.mode}
    />
  );
}
