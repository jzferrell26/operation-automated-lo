import { handlePublicFinancingRequest } from "../../../server/financing-release-public-runtime.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(
  request: Request,
  { params }: Readonly<{ params: Promise<{ publicationId: string }> }>,
) {
  const values = await params;
  return handlePublicFinancingRequest(request, values.publicationId, "");
}
export const GET = handle;
export const HEAD = handle;
