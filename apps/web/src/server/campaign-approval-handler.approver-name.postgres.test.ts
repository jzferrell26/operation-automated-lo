import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { executeHumanCampaignApproval } from "@oalo/application";

import { POST as approvePost } from "../app/api/campaigns/approve/route.js";
import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import { createLibraryAdCatalogPort } from "../features/ads-library/server/approval-catalog-port.js";
import { ADS_LIBRARY_SAMPLES_FLAG } from "../features/ads-library/server/catalog-loader.js";
import { LIBRARY_AD_SAVE_INPUT, OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import {
  approvalPayload,
  browserRequest,
  closeApprovalSuite,
  createDraftThroughPreflight,
  currentRowVersion,
  openApprovalSuite,
  principalForSession,
  routeEnvironment,
  tableCountsFor,
  type ApprovalSuiteFixture,
  type IssuedSession,
  type PersistedDraft,
  type RoutePostgresEnvironment,
} from "./campaign-route-postgres-support.js";
import { loadCampaignPage } from "./campaign-workspace-reads.js";
import { compileOpenHouseDraft } from "./open-house-draft.test-support.js";

/**
 * PRD-009e D2, 009E-AC-004, against a disposable Postgres.
 *
 * The approval route records the decider's own session display name in the decision's evidence,
 * read through `platform.resolve_session_display`, which is a scoped function and not a grant on
 * `platform.app_users`; the seeding harness names the approver "<label> approver", and that is the
 * name the decision must carry. A decision recorded without a name (every decision made before
 * PRD-009) reads back as a role alone, and a request that posts a name is refused with 400.
 *
 * The pgTAP assertion that `app_runtime` cannot select `platform.app_users`
 * (`supabase/tests/first_party_sessions.pgtap.sql:299-300`) is unchanged, and this lane adds no
 * migration.
 */

const environment: RoutePostgresEnvironment = routeEnvironment({
  [ADS_LIBRARY_SAMPLES_FLAG]: "enabled",
});

const LABEL = "Approver name";
const APPROVER_NAME = `${LABEL} approver`;
const CREATOR_NAME = `${LABEL} creator`;

let suite: ApprovalSuiteFixture;
let creatorSession: IssuedSession;
let approverSession: IssuedSession;
let csrfServerSecret: Uint8Array;

beforeAll(async () => {
  suite = await openApprovalSuite(environment, LABEL);
  ({ creatorSession, approverSession, csrfServerSecret } = suite);
});

afterAll(async () => {
  await closeApprovalSuite(suite);
});

async function createDraft(): Promise<PersistedDraft> {
  return createDraftThroughPreflight({
    preflight: preflightPost,
    session: creatorSession,
    csrfServerSecret,
    environment,
    body: LIBRARY_AD_SAVE_INPUT,
  });
}

function approvalRequest(body: unknown): Request {
  return browserRequest({
    path: "/api/campaigns/approve",
    body,
    session: approverSession,
    csrfServerSecret,
  });
}

/** The stored decision, read the way a page render reads it: through the approver's own session. */
async function storedApproval(campaignRef: string) {
  const principal = await principalForSession(approverSession, environment);
  const record = await createCampaignPersistenceAdapter(
    principal,
    environment,
  ).readRepository.getByCampaignRef(campaignRef);
  return record?.approval;
}

describe("the approval route records the decider's own display name (009E-AC-004)", () => {
  it("approves as a seeded approver and reads back their own display name, beside their role", async () => {
    const draft = await createDraft();

    const response = await approvePost(approvalRequest(approvalPayload(draft)));

    expect(response.status).toBe(200);
    const approval = await storedApproval(draft.campaignRef);
    expect(approval?.decision).toBe("approved");
    expect(approval?.actorRole).toBe("approver");
    expect(approval?.snapshot.approverDisplayName).toBe(APPROVER_NAME);
    expect(approval?.snapshot.approverDisplayName).not.toBe(CREATOR_NAME);
  });

  it("carries the name onto the campaign page's approval, beside the role", async () => {
    const draft = await createDraft();
    await approvePost(approvalRequest(approvalPayload(draft)));

    const loaded = await loadCampaignPage(
      await principalForSession(approverSession, environment),
      draft.campaignRef,
      undefined,
      environment,
    );

    expect(loaded?.kind).toBe("page");
    if (loaded?.kind !== "page") return;
    expect(loaded.page.decision).toMatchObject({
      decision: "approved",
      actorRole: "approver",
      approverDisplayName: APPROVER_NAME,
    });
  });

  it("records the name of a person who sent a version back, too", async () => {
    const draft = await createDraft();

    const response = await approvePost(approvalRequest(approvalPayload(draft, "rejected")));

    expect(response.status).toBe(200);
    const approval = await storedApproval(draft.campaignRef);
    expect(approval?.decision).toBe("rejected");
    expect(approval?.snapshot.approverDisplayName).toBe(APPROVER_NAME);
  });

  it("records the name on a version saved before PRD-009 as well", async () => {
    const principal = await principalForSession(creatorSession, environment);
    const adapter = createCampaignPersistenceAdapter(principal, environment);
    const compiled = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      principal,
      environment,
      adapter.versionRepository,
    );
    await adapter.persistDraft(compiled.version, compiled.preflight);
    const draft: PersistedDraft = {
      campaignRef: compiled.version.campaignRef,
      campaignVersionRef: compiled.version.campaignVersionRef,
      manifestHash: compiled.version.manifestHash,
      preflightResultHash: compiled.preflight.resultHash,
      rowVersion: await currentRowVersion(
        creatorSession,
        compiled.version.campaignRef,
        environment,
      ),
    };

    const response = await approvePost(approvalRequest(approvalPayload(draft)));

    expect(response.status).toBe(200);
    expect((await storedApproval(draft.campaignRef))?.snapshot.approverDisplayName).toBe(
      APPROVER_NAME,
    );
  });

  it("reads a decision recorded without a name as a role alone", async () => {
    const draft = await createDraft();
    const principal = await principalForSession(approverSession, environment);
    const adapter = createCampaignPersistenceAdapter(principal, environment);

    // The command as it was called before PRD-009: a decision with no name to record.
    const result = await executeHumanCampaignApproval(
      {
        campaignRef: draft.campaignRef,
        decision: "approved",
        decidedAt: new Date(),
        ipAuditHash: "a".repeat(64),
        correlationRef: "correlation_approvername_without001",
        approverDisplayName: undefined,
        expectedRowVersion: draft.rowVersion,
      },
      principal,
      adapter.approvalRepository,
      createLibraryAdCatalogPort(environment),
    );

    expect(result.kind).toBe("committed");
    const approval = await storedApproval(draft.campaignRef);
    expect(approval?.snapshot).not.toHaveProperty("approverDisplayName");
    const loaded = await loadCampaignPage(principal, draft.campaignRef, undefined, environment);
    if (loaded?.kind !== "page") throw new Error("The campaign page was not built.");
    expect(loaded.page.decision?.actorRole).toBe("approver");
    expect(loaded.page.decision).not.toHaveProperty("approverDisplayName");
  });

  it("refuses a request that posts a name with 400, because the name comes only from the session", async () => {
    const draft = await createDraft();
    const before = await tableCountsFor(suite.pool, suite.location.locationId);

    const response = await approvePost(
      approvalRequest({ ...approvalPayload(draft), approverDisplayName: "Somebody Else" }),
    );

    expect(response.status).toBe(400);
    expect(await tableCountsFor(suite.pool, suite.location.locationId)).toEqual(before);
    expect(await storedApproval(draft.campaignRef)).toBeUndefined();
  });
});
