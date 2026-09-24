import { headers } from "next/headers.js";

import { OpenHouseDraftBuilder } from "../../../../../features/campaigns/components/open-house-draft-builder.js";
import { readSetupPreferencesForRequest } from "../../../../../server/setup-preferences.js";
import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";

export const dynamic = "force-dynamic";

/**
 * PRD-006c D3's prefill rule. The profile is read on the server and handed to the builder, so the
 * create screen never makes a request of its own to find out who the user is, and the first paint
 * already carries the user's own Realtor name rather than a demo default that a later render would
 * replace.
 */
export default async function NewCampaignPage() {
  if (canRenderDashboardPreview()) return <OpenHouseDraftBuilder />;
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns/new", { headers: incoming });
  const preferences = await readSetupPreferencesForRequest(request, process.env);
  return <OpenHouseDraftBuilder profile={preferences.profile} />;
}
