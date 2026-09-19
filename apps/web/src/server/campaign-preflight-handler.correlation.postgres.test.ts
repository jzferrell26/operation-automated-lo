/**
 * Route-level Postgres proof for PRD-005c's correlation boundary on the preflight route
 * (005C-AC-008), authored per the raid contract. See the sibling
 * `campaign-approval-handler.correlation.postgres.test.ts` for the full rationale: every case
 * here is `it.todo`, not a real assertion, because it needs a seeded review tenant that only
 * `packages/db/test/campaign-integration-support.mjs`'s sanctioned elevated database role can
 * create (the repository's database-privilege-escalation security test refuses that capability
 * anywhere under `apps/**`), and that seeding is 005b's
 * `tooling/scripts/database/seed-review-location.mjs`, not this lane's.
 *
 * `correlationReferenceForRequest` and `handleCampaignPreflight`'s header wiring are already
 * unit-proven in `correlation-boundary.unit.test.ts` and
 * `campaign-preflight-handler.unit.test.ts` against the synthetic filesystem adapter; what is
 * missing here is the real-Postgres round trip.
 */
import { describe, it } from "vitest";

import { CORRELATION_HEADER_MATRIX } from "./campaign-command-test-support.js";

describe("campaign preflight handler correlation matrix (real Postgres)", () => {
  // 005C-AC-008: the same x-correlation-id matrix as 005C-AC-007, run against the preflight
  // route with a creator session, yields 200 with the canonical `x-oalo-correlation-ref` for
  // every case.
  for (const [label] of CORRELATION_HEADER_MATRIX) {
    it.todo(`persists with a canonical response reference for ${label}`);
  }
});
