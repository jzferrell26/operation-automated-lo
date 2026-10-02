import { handleSampleArtRequest } from "../../../../../../../features/ads-library/server/sample-art-route.js";

/**
 * PRD-009c D2. Sample art by `(adId, version, shape)`: exactly three typed parts and no catch-all.
 * It answers 404 on every deployment, because the sample guard refuses there (009c D3).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ adId: string; version: string; shape: string }> },
): Promise<Response> {
  return handleSampleArtRequest(await params);
}
