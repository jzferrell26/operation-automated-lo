import { handleWebinarAdArt } from "../../../../../../../server/webinar-ad-read.js";
export async function GET(
  request: Request,
  context: Readonly<{
    params: Promise<{ campaignRef: string; campaignVersionRef: string; shape: string }>;
  }>,
) {
  return handleWebinarAdArt(request, await context.params);
}
