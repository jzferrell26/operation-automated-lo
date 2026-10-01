import { after } from "next/server.js";

import {
  handlePasswordSignIn,
  scheduleThroughNextAfter,
} from "../../../../server/password-authentication-handler.js";
import { resolveRuntimeCampaignCommandPorts } from "../../../../server/runtime-authentication.js";

/**
 * PRD-006a D5. The route is the thin edge: it reads `process.env`, which is what it reads in
 * production, and hands the request to the exported handler.
 */
export async function POST(request: Request) {
  // `after` is exported by `next/server` on the pinned Next release, confirmed against the
  // installed package. Sign-in schedules nothing after the response today; the scheduler is
  // installed as on the other auth routes that use one. What keeps sign-in's response time
  // independent of whether an account exists is in the handler: every refusal awaits the same
  // database work before answering (M-1, `handlePasswordSignIn`).
  return handlePasswordSignIn(
    request,
    process.env,
    resolveRuntimeCampaignCommandPorts(process.env),
    {
      afterResponse: scheduleThroughNextAfter(after),
    },
  );
}
