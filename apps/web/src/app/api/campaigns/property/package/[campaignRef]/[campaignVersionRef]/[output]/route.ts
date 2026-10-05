import { handlePropertyPackageOutput } from "../../../../../../../../server/property-package-http.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: Readonly<{
    params: Promise<Readonly<{ campaignRef: string; campaignVersionRef: string; output: string }>>;
  }>,
) {
  return handlePropertyPackageOutput(request, await context.params);
}
