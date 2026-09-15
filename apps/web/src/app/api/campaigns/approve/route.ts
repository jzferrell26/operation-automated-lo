import { handleCampaignApproval } from "../../../../server/campaign-approval-handler.js";

export async function POST(request: Request) {
  return handleCampaignApproval(request);
}
