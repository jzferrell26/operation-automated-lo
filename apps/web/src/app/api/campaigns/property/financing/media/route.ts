import { handleFinancingMediaUpload } from "../../../../../../server/financing-media-http.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleFinancingMediaUpload(request);
}
