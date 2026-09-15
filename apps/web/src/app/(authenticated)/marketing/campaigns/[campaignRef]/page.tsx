import { headers } from "next/headers.js";
import { notFound } from "next/navigation.js";

import { PersistedCampaignScreen } from "../../../../../features/campaigns/components/persisted-campaign-screen.js";
import {
  createDefaultCampaignCommandPorts,
  resolveAuthenticatedReadPrincipal,
} from "../../../../../server/authenticated-principal.js";
import { CampaignWorkspaceStoreUnavailableError } from "../../../../../server/campaign-persistence-runtime.js";
import { loadWorkspaceCampaign } from "../../../../../server/campaign-workspace-reads.js";

export default async function CampaignPage({
  params,
}: Readonly<{ params: Promise<{ campaignRef: string }> }>) {
  const { campaignRef } = await params;
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns", { headers: incoming });
  try {
    const principal = await resolveAuthenticatedReadPrincipal(
      request,
      process.env,
      createDefaultCampaignCommandPorts(),
    );
    const campaign = await loadWorkspaceCampaign(principal, campaignRef, process.env);
    if (campaign === undefined) notFound();
    return <PersistedCampaignScreen campaign={campaign} />;
  } catch (error) {
    if (error instanceof CampaignWorkspaceStoreUnavailableError) throw error;
    notFound();
  }
}
