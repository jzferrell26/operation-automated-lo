import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { LaunchFlow } from "../../../../../features/campaigns/components/launch-flow.js";
import { LaunchReview } from "../../../../../features/campaigns/components/launch-review.js";
import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";
import {
  loadPreviewLaunchPage,
  readLaunchPageForRequest,
  type LaunchPageData,
} from "../../../../../server/launch-an-ad.js";
import { SIGN_IN_PATH } from "../../../../../server/runtime-authentication.js";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Readonly<Record<string, string | string[] | undefined>>>;

function LaunchPage({ data }: Readonly<{ data: LaunchPageData }>) {
  if (data.review !== undefined) {
    return <LaunchReview from={data.address.from} review={data.review} />;
  }
  return (
    <LaunchFlow
      // A different campaign or step 2 target is a different draft; the flow starts afresh for it.
      key={`${data.address.campaign ?? "new"}:${data.address.ad ?? ""}`}
      advertiser={data.advertiser}
      campaign={data.campaign}
      cards={data.cards}
      initial={data.address}
      rememberedPlaces={data.rememberedPlaces}
      today={data.today}
    />
  );
}

/**
 * PRD-009d D1 and 009D-AC-001. "Launch an ad": choose an ad, set it up, review and launch.
 *
 * The step is in the address. Steps 1 and 2 are one page that moves between them without losing
 * what was typed; step 3 reads the saved version named by the address, so a reload re-reads it.
 * The dashboard preview has no session and an empty library, so it shows step 1 saying so.
 */
export default async function NewCampaignPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const search = await searchParams;
  if (canRenderDashboardPreview()) {
    return <LaunchPage data={await loadPreviewLaunchPage(search)} />;
  }
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns/new", { headers: incoming });
  const read = await readLaunchPageForRequest(request, search, process.env);
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  return <LaunchPage data={read.data} />;
}
