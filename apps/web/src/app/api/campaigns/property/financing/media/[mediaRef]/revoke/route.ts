import { handleFinancingMediaRevoke } from "../../../../../../../../server/financing-media-http.js";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ mediaRef: string }> }) {
  return handleFinancingMediaRevoke(request, (await context.params).mediaRef);
}
