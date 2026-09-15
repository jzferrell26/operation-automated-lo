import { headers } from "next/headers.js";
import { notFound } from "next/navigation.js";

import { PersistedCampaignScreen } from "../../../../../features/campaigns/components/persisted-campaign-screen.js";
import {
  createDefaultCampaignCommandPorts,
  resolveAuthenticatedReadPrincipal,
} from "../../../../../server/authenticated-principal.js";
import { principalMayApprove } from "../../../../../server/campaign-approval-handler.js";
import { loadLocalCampaign } from "../../../../../server/local-campaign-store.js";

export default async function CampaignPage({
  params,
}: Readonly<{ params: Promise<{ campaignRef: string }> }>) {
  const { campaignRef } = await params;
  const campaign = await loadLocalCampaign(campaignRef);
  if (campaign === undefined) notFound();
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns", { headers: incoming });
  let canApprove = false;
  try {
    const principal = await resolveAuthenticatedReadPrincipal(
      request,
      process.env,
      createDefaultCampaignCommandPorts(),
    );
    canApprove =
      principalMayApprove(principal) &&
      principal.locationRef === campaign.version.locationRef &&
      campaign.state === "awaiting_approval" &&
      !campaign.preflight.blocking;
  } catch {
    canApprove = false;
  }
  return <PersistedCampaignScreen campaign={campaign} canApprove={canApprove} />;
}
