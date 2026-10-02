import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";
import { SIGN_IN_PATH } from "../../../../../server/runtime-authentication.js";
import { AdsLibraryScreen } from "./ads-library-screen.js";
import {
  loadPreviewAdsLibraryPage,
  readAdsLibraryPageForRequest,
} from "./ads-library-page-data.js";

/**
 * PRD-009c part 2, 009C-AC-010. The "Ads library" tab at `/marketing/campaigns/library`.
 *
 * It is read on every request. Whether sample ads are shown is decided by the sample guard's raw
 * environment values (009c D3), so the answer must come from the running process and never from a
 * page a build rendered ahead of time.
 *
 * Like "Launch an ad" it shows the signed-in person's own brand on every ad, so it is a page for a
 * session: a visitor with none is sent to sign in. The dashboard preview has no session and an empty
 * library, and shows that.
 */
export const dynamic = "force-dynamic";

type SearchParams = Promise<Readonly<Record<string, string | string[] | undefined>>>;

export default async function AdsLibraryPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const search = await searchParams;
  if (canRenderDashboardPreview()) {
    return <AdsLibraryScreen data={await loadPreviewAdsLibraryPage(search)} />;
  }
  const incoming = await headers();
  const request = new Request("https://oalo.local/marketing/campaigns/library", {
    headers: incoming,
  });
  const read = await readAdsLibraryPageForRequest(request, search, process.env);
  if (!read.authenticated) redirect(SIGN_IN_PATH);
  return <AdsLibraryScreen data={read.data} />;
}
