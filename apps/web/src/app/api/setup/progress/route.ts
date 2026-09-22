import { handleSetupProgress } from "../../../../server/setup-preferences.js";

/**
 * PRD-006c D4. The thin edge: it reads `process.env`, which is what it reads in production, and
 * hands the request to the exported handler. `GET` is not exposed; the authenticated layout reads
 * progress server-side and passes it to the provider.
 */
export async function POST(request: Request) {
  return handleSetupProgress(request);
}
