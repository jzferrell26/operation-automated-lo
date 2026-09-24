import { headers } from "next/headers.js";

import { OpenHouseDraftBuilder } from "../../../../../features/campaigns/components/open-house-draft-builder.js";
import { readSetupPreferencesForRequest } from "../../../../../server/setup-preferences.js";
import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";
import { authenticatedWorkspaceMode } from "../../../../../server/authenticated-workspace-data.js";
import {
  readWorkspacePreferences,
  workspacePrincipal,
} from "../../../../../server/workspace-preferences.js";
import { campaignDatabasePool } from "../../../../../server/campaign-persistence-runtime.js";
import { UnauthenticatedPrincipalError } from "../../../../../server/authenticated-principal.js";

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
  if (authenticatedWorkspaceMode() === "review") {
    try {
      const principal = await workspacePrincipal(request);
      const saved = await readWorkspacePreferences(principal, campaignDatabasePool());
      return (
        <OpenHouseDraftBuilder
          profile={preferences.profile}
          savedPartners={saved.partners?.value.items ?? []}
        />
      );
    } catch (error) {
      // The existing signed-out create page contains no personal data. Its mutation
      // endpoint still requires authentication before anything can be saved.
      if (!(error instanceof UnauthenticatedPrincipalError)) throw error;
    }
  }
  return <OpenHouseDraftBuilder profile={preferences.profile} />;
}
