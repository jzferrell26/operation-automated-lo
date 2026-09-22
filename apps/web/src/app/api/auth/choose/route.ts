import { after } from "next/server.js";

import {
  handleChooseWorkspace,
  scheduleThroughNextAfter,
} from "../../../../server/password-authentication-handler.js";
import { resolveRuntimeCampaignCommandPorts } from "../../../../server/runtime-authentication.js";

/**
 * PRD-006a D5. The route is the thin edge: it reads `process.env`, which is what it reads in
 * production, and hands the request to the exported handler.
 */
export async function POST(request: Request) {
  // `after` is exported by `next/server` on the pinned Next 16.3.3, confirmed against the
  // installed package. It runs the email send once the response is committed, so response time
  // never depends on whether an account exists.
  return handleChooseWorkspace(
    request,
    process.env,
    resolveRuntimeCampaignCommandPorts(process.env),
    {
      afterResponse: scheduleThroughNextAfter(after),
    },
  );
}
