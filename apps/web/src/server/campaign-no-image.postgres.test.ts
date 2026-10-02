import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as approvePost } from "../app/api/campaigns/approve/route.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import { compileOpenHouseDraft } from "./open-house-draft.test-support.js";
import {
  approvalPayload,
  browserRequest,
  closeApprovalSuite,
  currentRowVersion,
  openApprovalSuite,
  principalForSession,
  routeEnvironment,
  type ApprovalSuiteFixture,
  type IssuedSession,
  type PersistedDraft,
  type RoutePostgresEnvironment,
} from "./campaign-route-postgres-support.js";

/**
 * PRD-008b 008B-AC-002, against a disposable Postgres.
 *
 * A saved Open House Boost version records no property image, because the draft builder has no photo
 * input and the loan officer supplied none (D1). This proves the whole path holds for such a
 * version: it is stored with an empty image list, deterministic preflight raises neither image
 * finding, and an approver can sign off on it.
 *
 * PRD-009d. The create route now saves only library ads, so an open house version can no longer be
 * made through it. Versions saved before PRD-009 still exist on the hosted app (R-6), and this suite
 * stands for them: the version is compiled the way the open house builder compiled it and written
 * through the same persistence adapter the route used, under the creator's own session. The approval
 * still goes through the exported route handler with the headers a browser sends, and the stored
 * version is read back through the production read repository.
 */

const environment: RoutePostgresEnvironment = routeEnvironment();

let suite: ApprovalSuiteFixture;
let creatorSession: IssuedSession;
let approverSession: IssuedSession;
let csrfServerSecret: Uint8Array;

beforeAll(async () => {
  suite = await openApprovalSuite(environment, "No image version");
  ({ creatorSession, approverSession, csrfServerSecret } = suite);
});

afterAll(async () => {
  await closeApprovalSuite(suite);
});

async function createDraft(): Promise<PersistedDraft> {
  const principal = await principalForSession(creatorSession, environment);
  const adapter = createCampaignPersistenceAdapter(principal, environment);
  const compiled = await compileOpenHouseDraft(
    OPEN_HOUSE_DRAFT_INPUT,
    principal,
    environment,
    adapter.versionRepository,
  );
  await adapter.persistDraft(compiled.version, compiled.preflight);
  return Object.freeze({
    campaignRef: compiled.version.campaignRef,
    campaignVersionRef: compiled.version.campaignVersionRef,
    manifestHash: compiled.version.manifestHash,
    preflightResultHash: compiled.preflight.resultHash,
    rowVersion: await currentRowVersion(creatorSession, compiled.version.campaignRef, environment),
  });
}

/** The stored record, read the way a page render reads it: through the principal's own session. */
async function storedRecord(session: IssuedSession, campaignRef: string) {
  const principal = await principalForSession(session, environment);
  const record = await createCampaignPersistenceAdapter(
    principal,
    environment,
  ).readRepository.getByCampaignRef(campaignRef);
  if (record === undefined) throw new Error(`No stored campaign ${campaignRef} for this session`);
  return record;
}

describe("a saved Open House Boost version with no property image", () => {
  it("is stored with an empty image list and passes preflight with no image finding", async () => {
    const draft = await createDraft();

    const record = await storedRecord(creatorSession, draft.campaignRef);

    expect(record.version.manifest.images).toEqual([]);
    const codes = record.preflight.findings.map((finding) => finding.ruleCode);
    expect(codes).not.toContain("IMAGE_NOT_APPROVED");
    expect(codes).not.toContain("IMAGE_QUALITY_LOW");
    expect(record.preflight.blocking).toBe(false);
    expect(record.state).toBe("awaiting_approval");
  });

  it("can be approved by a campaign approver", async () => {
    const draft = await createDraft();

    const response = await approvePost(
      browserRequest({
        path: "/api/campaigns/approve",
        body: approvalPayload(draft),
        session: approverSession,
        csrfServerSecret,
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      state: string;
      decision: string;
      duplicate: boolean;
    };
    expect(body.state).toBe("approved");
    expect(body.decision).toBe("approved");
    expect(body.duplicate).toBe(false);

    const record = await storedRecord(approverSession, draft.campaignRef);
    expect(record.state).toBe("approved");
    expect(record.approval?.decision).toBe("approved");
    // The decision bound the exact version it was shown, and that version holds no image.
    expect(record.version.manifest.images).toEqual([]);
  });
});
