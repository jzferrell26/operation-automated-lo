import { handleFunnelPhoto } from "../../../../server/funnel-http.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleFunnelPhoto(request);
}
