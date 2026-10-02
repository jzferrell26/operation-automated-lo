import type { Metadata } from "next";
import { headers } from "next/headers.js";
import { notFound, redirect } from "next/navigation.js";
import { cache } from "react";

import { PAGE_TITLES } from "../../../../../copy/page-titles.js";
import { PersistedCampaignScreen } from "../../../../../features/campaigns/components/persisted-campaign-screen.js";
import { AuthenticatedWorkspaceUnavailableError } from "../../../../../server/authenticated-workspace-data.js";
import { CampaignWorkspaceStoreUnavailableError } from "../../../../../server/campaign-persistence-runtime.js";
import { readWorkspaceCampaignForRequest } from "../../../../../server/campaign-workspace-reads.js";
import { SIGN_IN_PATH } from "../../../../../server/runtime-authentication.js";

/**
 * The one read a campaign route makes. It is cached for the request, so the page and its title
 * (`campaignRouteMetadata`) share one read of the campaign instead of making two.
 */
const readCampaignOnce = cache(async (campaignRef: string, versionNo: number | undefined) => {
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns", { headers: incoming });
  return readWorkspaceCampaignForRequest(request, campaignRef, process.env, versionNo);
});

/**
 * Writing review W-13. A campaign page is titled by its ad's name, which is its heading: the library
 * ad's name, or the saved headline of a campaign made before PRD-009. Anything the read cannot say
 * (no session, no such campaign, a store that is down) falls back to "Campaign" and leaves the
 * answer to the page itself, which makes the same read and answers it properly.
 */
export async function campaignRouteMetadata(
  campaignRef: string,
  versionNo?: number,
): Promise<Metadata> {
  try {
    const loaded = (await readCampaignOnce(campaignRef, versionNo)).campaign;
    if (loaded?.kind === "page") {
      const { page } = loaded;
      return { title: page.kind === "library-ad" ? page.name : page.headline };
    }
  } catch {
    // The page's own read, which is the same cached read, throws the same error and answers it.
  }
  return { title: PAGE_TITLES.campaign };
}

/**
 * PRD-009e 009E-AC-005. The read both campaign routes make, and what each answer of it becomes: the
 * newest version at the campaign address, and an older one at its own. An unknown reference, a
 * version the campaign never had, and a campaign in another location all answer "not found".
 */
export async function renderCampaignRoute(campaignRef: string, versionNo?: number) {
  let read: Awaited<ReturnType<typeof readWorkspaceCampaignForRequest>>;
  try {
    read = await readCampaignOnce(campaignRef, versionNo);
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
  if (read.campaign.kind === "redirect") redirect(read.campaign.href);
  return <PersistedCampaignScreen page={read.campaign.page} />;
}
