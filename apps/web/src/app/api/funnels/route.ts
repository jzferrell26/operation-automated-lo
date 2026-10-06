import { handleFunnelRead, handleFunnelSave } from "../../../server/funnel-http.js";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handleFunnelRead(request);
}
export async function POST(request: Request) {
  return handleFunnelSave(request);
}
