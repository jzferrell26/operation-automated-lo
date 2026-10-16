import { handlePublisherStatus } from "../../../../../../server/webinar-publisher-status.js";

export async function GET(
  request: Request,
  context: Readonly<{ params: Promise<{ operationRef: string }> }>,
) {
  return handlePublisherStatus(request, await context.params);
}
