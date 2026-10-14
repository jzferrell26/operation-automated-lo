import { handleWebinarAdPrepare } from "../../../../server/webinar-ad-http.js";
export async function POST(request: Request) {
  return handleWebinarAdPrepare(request);
}
