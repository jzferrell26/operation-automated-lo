import { handleWebinarAdContext } from "../../../../../server/webinar-ad-http.js";
export async function GET(request: Request) {
  return handleWebinarAdContext(request);
}
