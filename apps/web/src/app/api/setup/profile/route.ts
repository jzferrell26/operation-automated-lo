import { handleSetupProfile } from "../../../../server/setup-preferences.js";

/**
 * PRD-006c D4. The thin edge for the profile the first two steps collect. `GET` is not exposed:
 * the profile is the user's own data, and the authenticated layout already reads it server-side.
 */
export async function POST(request: Request) {
  return handleSetupProfile(request);
}
