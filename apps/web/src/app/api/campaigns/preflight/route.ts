import { ZodError } from "zod";

import { compileOpenHouseDraft } from "../../../../server/open-house-draft.js";
import { persistLocalCampaign } from "../../../../server/local-campaign-store.js";

export async function POST(request: Request) {
  try {
    const input: unknown = await request.json();
    const result = await compileOpenHouseDraft(input);
    const campaign = await persistLocalCampaign(result.version, result.preflight);
    return Response.json(
      {
        ...result,
        state: campaign.state,
        detailHref: `/marketing/campaigns/${result.version.campaignRef}`,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "INVALID_CAMPAIGN_DRAFT", issues: error.issues },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Campaign preflight failed";
    return Response.json({ error: "CAMPAIGN_PREFLIGHT_FAILED", message }, { status: 400 });
  }
}
