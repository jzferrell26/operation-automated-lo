import { handleWebinarAdRead } from "../../../../../../server/webinar-ad-read.js";
export async function GET(
  request: Request,
  context: Readonly<{ params: Promise<{ campaignRef: string; campaignVersionRef: string }> }>,
) {
  return handleWebinarAdRead(request, await context.params);
}
