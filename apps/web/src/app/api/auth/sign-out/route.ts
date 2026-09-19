import { handleSignOut } from "../../../../server/password-authentication-handler.js";

/**
 * PRD-006a D5. The route is the thin edge: it reads `process.env`, which is what it reads in
 * production, and hands the request to the exported handler.
 */
export async function POST(request: Request) {
  return handleSignOut(request);
}
