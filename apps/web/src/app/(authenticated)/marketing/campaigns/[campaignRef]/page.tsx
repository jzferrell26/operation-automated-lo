import { headers } from "next/headers.js";
import { notFound, redirect } from "next/navigation.js";

import { PersistedCampaignScreen } from "../../../../../features/campaigns/components/persisted-campaign-screen.js";
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
    if (error instanceof CampaignWorkspaceStoreUnavailableError) throw error;
    notFound();
  }
  // 005A-AC-010. Not signed in is not the same answer as this campaign does not exist.
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  if (read.campaign === undefined) notFound();
  return <PersistedCampaignScreen campaign={read.campaign} />;
}
