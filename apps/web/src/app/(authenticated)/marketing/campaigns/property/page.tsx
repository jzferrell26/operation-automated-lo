import type { Metadata } from "next";
import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { PROPERTY_CAMPAIGN_COPY } from "../../../../../copy/property-campaign-messages.js";
import { PropertyCampaignForm } from "../../../../../features/property-campaigns/property-campaign-form.js";
import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";
import {
  READ_ONLY_PROPERTY_FORM,
  readPropertyCampaignPage,
} from "../../../../../server/property-campaign-page.js";
import { SIGN_IN_PATH } from "../../../../../server/runtime-authentication.js";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: PROPERTY_CAMPAIGN_COPY.title };

export default async function PropertyCampaignPage() {
  if (canRenderDashboardPreview()) {
    return <PropertyCampaignForm data={READ_ONLY_PROPERTY_FORM} />;
  }
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns/property", {
    headers: incoming,
  });
  const read = await readPropertyCampaignPage(request);
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  return <PropertyCampaignForm data={read.data} />;
}
