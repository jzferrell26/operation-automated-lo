/**
 * Route-level Postgres proof for PRD-005c's correlation boundary and retry idempotency
 * (005C-AC-007, 009, 011, 012), authored per the raid contract. Every case below is `it.todo`,
 * not a real assertion, because it depends on two things this lane does not own and cannot build
 * without violating a standing security gate:
 *
 * 1. A seeded review tenant (a location plus a creator and an approver). Only
 *    `packages/db/test/campaign-integration-support.mjs` is a sanctioned holder of the
 *    elevated schema-owning database role that seeding requires (the repository's
 *    database-privilege-escalation security test fails any other shipped `apps/**` or
 *    `packages/*∕src` file that assumes it). Seeding a review tenant is 005b's
 *    `tooling/scripts/database/seed-review-location.mjs` (see `EXECUTION_LEDGER.md` lane 1b).
 * 2. A way to read back the stored `correlation_id` on `integration.command_executions` and
 *    `audit.events` rows without the same elevation, since the tenant runtime role is not
 *    granted `select` on those tables in the foundation migration. 005a/005b need to expose
 *    that, or these cases
 *    need to move into `packages/db/test/*.integration.test.mjs`, which already holds the
 *    sanctioned seeding pattern and could exercise `executeHumanCampaignApproval` directly
 *    against the Postgres repositories instead of through the HTTP handler.
 *
 * `correlationReferenceForRequest`, `handleCampaignApproval`, and the D5 retry reorder are
 * already unit-proven in `correlation-boundary.unit.test.ts` and
 * `campaign-approval-handler.unit.test.ts` against the synthetic filesystem adapter; what is
 * missing here is the real-Postgres round trip, which is why this file stays OPEN, not DONE.
 */
import { describe, it } from "vitest";

import { CORRELATION_HEADER_MATRIX } from "./campaign-command-test-support.js";

describe("campaign approval handler correlation matrix (real Postgres)", () => {
  for (const [label] of CORRELATION_HEADER_MATRIX) {
    // 005C-AC-007: every header shape in the matrix yields a committed approval and a stored,
    // opaque-contract-compliant correlation_id on both the command execution and audit rows.
    it.todo(`commits with a valid stored correlation_id for ${label}`);
  }

  // 005C-AC-009: a denied attempt still records the canonical reference, once, on audit.events.
  it.todo("records exactly one denied audit row keyed by the canonical correlation reference");

  // 005C-AC-011: the byte-identical browser retry (same expectedRowVersion the browser read
  // pre-approval) is idempotent: 200 duplicate:false, then 200 duplicate:true with the same
  // approvalRef, and exactly one approval decision, command execution, and success audit row.
  it.todo("treats a byte-identical retry as the duplicate, not a second commit");

  // 005C-AC-012: negative retry cases stay conflicts or forbidden, never a false duplicate.
  it.todo("returns 409 for a retry with a stale expectedCampaignVersionRef");
  it.todo(
    "returns 409 when a different approver repeats the same decision on an approved campaign",
  );
  it.todo("returns 409 for a decision flip (rejected) after an approval");
  it.todo("returns 403 for a creator's retry");
});
