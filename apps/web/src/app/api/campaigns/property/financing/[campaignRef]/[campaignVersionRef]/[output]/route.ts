import { handleFinancingOutput } from "../../../../../../../../server/financing-output.js";

export async function GET(
  request: Request,
  {
    params,
  }: Readonly<{
    params: Promise<{ campaignRef: string; campaignVersionRef: string; output: string }>;
  }>,
) {
  return handleFinancingOutput(request, await params);
}
