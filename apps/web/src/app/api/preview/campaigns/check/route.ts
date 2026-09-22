import { handleDashboardPreviewCheck } from "../../../../../server/dashboard-preview-handler.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> {
  return handleDashboardPreviewCheck(request);
}
