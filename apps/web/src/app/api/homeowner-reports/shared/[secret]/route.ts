import { handleSharedHomeReport } from "../../../../../server/homeowners/http.js";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ secret: string }> }) {
  return handleSharedHomeReport(request, (await params).secret);
}
export const POST = GET;
