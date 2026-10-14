import { handleFinancingMediaRead } from "../../../../../../../server/financing-media-http.js";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ mediaRef: string }> }) {
  return handleFinancingMediaRead(request, (await context.params).mediaRef);
}
