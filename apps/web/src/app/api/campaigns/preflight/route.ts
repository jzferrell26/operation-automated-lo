import { handleCampaignPreflight } from "../../../../server/campaign-preflight-handler.js";

export async function POST(request: Request) {
  return handleCampaignPreflight(request);
}
