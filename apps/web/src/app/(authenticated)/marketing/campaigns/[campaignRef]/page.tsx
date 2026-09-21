import { headers } from "next/headers.js";
import { notFound, redirect } from "next/navigation.js";

import { PersistedCampaignScreen } from "../../../../../features/campaigns/components/persisted-campaign-screen.js";
import { AuthenticatedWorkspaceUnavailableError } from "../../../../../server/authenticated-workspace-data.js";
import { CampaignWorkspaceStoreUnavailableError } from "../../../../../server/campaign-persistence-runtime.js";
import { readWorkspaceCampaignForRequest } from "../../../../../server/campaign-workspace-reads.js";
import { SIGN_IN_PATH } from "../../../../../server/runtime-authentication.js";

export default async function CampaignPage({
  params,
}: Readonly<{ params: Promise<{ campaignRef: string }> }>) {
  const { campaignRef } = await params;
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns", { headers: incoming });
  let read: Awaited<ReturnType<typeof readWorkspaceCampaignForRequest>>;
  try {
    read = await readWorkspaceCampaignForRequest(request, campaignRef, process.env);
  } catch (error) {
    // A deployment that cannot serve this read is a failure, not a missing campaign: both of these
    // reach the route error boundary rather than becoming a page that says the campaign is gone.
    if (
      error instanceof CampaignWorkspaceStoreUnavailableError ||
      error instanceof AuthenticatedWorkspaceUnavailableError
    ) {
      throw error;
    }
    notFound();
  }
  // 005A-AC-010. Not signed in is not the same answer as this campaign does not exist.
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  if (read.campaign === undefined) notFound();
  return <PersistedCampaignScreen campaign={read.campaign} />;
}
