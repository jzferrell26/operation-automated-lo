import { handlePropertyCampaignSave } from "../../../../server/property-campaign-handler.js";

export async function POST(request: Request) {
  return handlePropertyCampaignSave(request);
}
