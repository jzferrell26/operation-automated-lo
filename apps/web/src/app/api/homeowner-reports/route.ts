import { handleHomeWorkspace } from "../../../server/homeowners/http.js";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handleHomeWorkspace(request);
}
export const POST = GET;
