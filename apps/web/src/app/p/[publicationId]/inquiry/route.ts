import { handlePublicFinancingRequest } from "../../../../server/financing-release-public-runtime.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(
  request: Request,
  { params }: Readonly<{ params: Promise<{ publicationId: string }> }>,
) {
  const values = await params;
  return handlePublicFinancingRequest(request, values.publicationId, "/inquiry");
}
export const POST = handle;
