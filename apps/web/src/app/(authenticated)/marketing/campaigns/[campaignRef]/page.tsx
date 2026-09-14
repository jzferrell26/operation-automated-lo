import { notFound } from "next/navigation.js";

import { PersistedCampaignScreen } from "../../../../../features/campaigns/components/persisted-campaign-screen.js";
import { loadLocalCampaign } from "../../../../../server/local-campaign-store.js";

export default async function CampaignPage({
  params,
}: Readonly<{ params: Promise<{ campaignRef: string }> }>) {
  const { campaignRef } = await params;
  const campaign = await loadLocalCampaign(campaignRef);
  if (campaign === undefined) notFound();
  return <PersistedCampaignScreen campaign={campaign} />;
}

