import { handlePropertyPackageGeneration } from "../../../../../server/property-package-http.js";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return handlePropertyPackageGeneration(request);
}
