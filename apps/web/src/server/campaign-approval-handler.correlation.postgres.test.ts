import { CorrelationReferenceSchema } from "@oalo/contracts";
import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as approvePost } from "../app/api/campaigns/approve/route.js";
import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import {
  CORRELATION_HEADER_MATRIX,
  OPEN_HOUSE_DRAFT_INPUT,
} from "./campaign-command-test-support.js";
import {
  AUDIT_TABLE,
  COMMAND_TABLE,
  approvalPayload,
  browserRequest,
  closeApprovalSuite,
  createDraftThroughPreflight,
  issueSession,
  openApprovalSuite,
  routeEnvironment,
  seedActor,
  storedCorrelationIds,
  tableCountsFor,
  type ApprovalSuiteFixture,
  type IssuedSession,
  type PersistedDraft,
  type RoutePostgresEnvironment,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";
import { CORRELATION_REFERENCE_HEADER, TRACING_ID_HEADER } from "./correlation-boundary.js";

/**
 * PRD-005c 005C-AC-007, 009, 011, and 012, through the exported approve route against real
 * Postgres with a real first-party session.
 *
 * The shape of the inbound `x-correlation-id` header is the variable. The HTTP outcome must not
 * depend on it, and whatever reaches a correlation column must satisfy the opaque contract no
 * matter what arrived, because the header is caller-controlled and the column is not.
 */

const environment: RoutePostgresEnvironment = routeEnvironment();

let suite: ApprovalSuiteFixture;
let pool: PostgresDatabasePool;
let location: SeededLocation;
let creatorSession: IssuedSession;
let approverSession: IssuedSession;
let secondApproverSession: IssuedSession;
let csrfServerSecret: Uint8Array;

beforeAll(async () => {
  suite = await openApprovalSuite(environment, "Correlation approval");
  ({ pool, location, creatorSession, approverSession, csrfServerSecret } = suite);
  const secondApprover = await seedActor(pool, location, {
    displayName: "Correlation approval second approver",
    bindingRole: "approver",
    sessionRole: "campaign_approver",
  });
  secondApproverSession = await issueSession(pool, location, secondApprover);
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
    body: OPEN_HOUSE_DRAFT_INPUT,
  });
}

const approvalBody = approvalPayload;

function approvalRequest(session: IssuedSession, body: unknown, correlationId?: string): Request {
  return browserRequest({
    path: "/api/campaigns/approve",
    body,
    session,
    csrfServerSecret,
    ...(correlationId === undefined ? {} : { correlationId }),
  });
}

async function expectAllStoredReferencesAreOpaque(table: string): Promise<void> {
  const stored = await storedCorrelationIds(pool, table, location.locationId);
  expect(stored.length).toBeGreaterThan(0);
  for (const reference of stored) {
    expect(CorrelationReferenceSchema.safeParse(reference).success).toBe(true);
  }
}

describe("campaign approval handler correlation matrix (real Postgres)", () => {
  // 005C-AC-007.
  it.each(CORRELATION_HEADER_MATRIX)(
    "commits with a valid stored correlation reference for %s",
    async (_label, header) => {
      const draft = await createDraft();

      const response = await approvePost(
        approvalRequest(approverSession, approvalBody(draft), header),
      );

      expect(response.status).toBe(200);
      const canonical = response.headers.get(CORRELATION_REFERENCE_HEADER);
      expect(canonical).not.toBeNull();
      expect(CorrelationReferenceSchema.safeParse(canonical).success).toBe(true);
      expect(canonical).toMatch(/^correlation_approve_[0-9a-f]{24}$/u);
      // The inbound value is echoed only when it was worth echoing, and never becomes the
      // canonical reference.
      const echoed = response.headers.get(TRACING_ID_HEADER);
      if (header !== undefined && header.length <= 300) {
        expect(echoed).toBe(header);
      } else {
        expect(echoed).toBeNull();
      }
      expect(canonical).not.toBe(header);

      await expectAllStoredReferencesAreOpaque(COMMAND_TABLE);
      await expectAllStoredReferencesAreOpaque(AUDIT_TABLE);
    },
  );

  // 005C-AC-009.
  it("records exactly one denied audit row keyed by the canonical correlation reference", async () => {
    const draft = await createDraft();
    const before = await tableCountsFor(pool, location.locationId);

    const response = await approvePost(
      approvalRequest(creatorSession, approvalBody(draft), "3fa85f64-5717-4562-b3fc-2c963f66afa6"),
    );

    expect(response.status).toBe(403);
    const canonical = response.headers.get(CORRELATION_REFERENCE_HEADER) ?? "";
    expect(CorrelationReferenceSchema.safeParse(canonical).success).toBe(true);

    const after = await tableCountsFor(pool, location.locationId);
    expect(after.audit).toBe(before.audit + 1);
    expect(after.approvals).toBe(before.approvals);
    expect(after.commands).toBe(before.commands);

    const stored = await storedCorrelationIds(pool, AUDIT_TABLE, location.locationId);
    expect(stored).toContain(canonical);
  });

  // 005C-AC-011.
  it("treats a byte-identical retry as the duplicate, not a second commit", async () => {
    const draft = await createDraft();
    const body = approvalBody(draft);
    const before = await tableCountsFor(pool, location.locationId);

    const first = await approvePost(approvalRequest(approverSession, body));
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { duplicate: boolean; approvalRef: string };
    expect(firstBody.duplicate).toBe(false);

    const retry = await approvePost(approvalRequest(approverSession, body));
    expect(retry.status).toBe(200);
    const retryBody = (await retry.json()) as { duplicate: boolean; approvalRef: string };
    expect(retryBody.duplicate).toBe(true);
    expect(retryBody.approvalRef).toBe(firstBody.approvalRef);

    const after = await tableCountsFor(pool, location.locationId);
    expect(after.approvals).toBe(before.approvals + 1);
    expect(after.commands).toBe(before.commands + 1);
    expect(after.audit).toBe(before.audit + 1);
  });

  // 005C-AC-012.
  it("returns 409 for a retry with a stale expectedCampaignVersionRef", async () => {
    const draft = await createDraft();
    expect((await approvePost(approvalRequest(approverSession, approvalBody(draft)))).status).toBe(
      200,
    );
    const before = await tableCountsFor(pool, location.locationId);

    const stale = await approvePost(
      approvalRequest(approverSession, {
        ...approvalBody(draft),
        expectedCampaignVersionRef: "version_0123456789abcdef",
      }),
    );

    expect(stale.status).toBe(409);
    expect(await tableCountsFor(pool, location.locationId)).toEqual(before);
  });

  /**
   * The duplicate branch is keyed on the actor as well as the decision (PRD-005c D5), so a second,
   * genuinely different approver repeating the same decision is a conflict rather than an
   * idempotent replay of someone else's approval.
   */
  it("returns 409 when a different approver repeats the decision on an approved campaign", async () => {
    const draft = await createDraft();
    expect((await approvePost(approvalRequest(approverSession, approvalBody(draft)))).status).toBe(
      200,
    );
    const before = await tableCountsFor(pool, location.locationId);

    const repeated = await approvePost(approvalRequest(secondApproverSession, approvalBody(draft)));

    expect(repeated.status).toBe(409);
    expect(await tableCountsFor(pool, location.locationId)).toEqual(before);
  });

  it("returns 409 for a decision flip to rejected after an approval", async () => {
    const draft = await createDraft();
    expect((await approvePost(approvalRequest(approverSession, approvalBody(draft)))).status).toBe(
      200,
    );
    const before = await tableCountsFor(pool, location.locationId);

    const flipped = await approvePost(
      approvalRequest(approverSession, approvalBody(draft, "rejected")),
    );

    expect(flipped.status).toBe(409);
    expect(await tableCountsFor(pool, location.locationId)).toEqual(before);
  });

  /**
   * A creator's retry is forbidden, and stays forbidden however many times it is sent. Each attempt
   * writes exactly one denied audit row and nothing else, so the refusal is recorded without ever
   * becoming a decision.
   */
  it("returns 403 for a creator's retry and writes only the denied audit rows", async () => {
    const draft = await createDraft();
    const before = await tableCountsFor(pool, location.locationId);

    const first = await approvePost(approvalRequest(creatorSession, approvalBody(draft)));
    const retry = await approvePost(approvalRequest(creatorSession, approvalBody(draft)));

    expect(first.status).toBe(403);
    expect(retry.status).toBe(403);
    const after = await tableCountsFor(pool, location.locationId);
    expect(after.approvals).toBe(before.approvals);
    expect(after.commands).toBe(before.commands);
    expect(after.campaigns).toBe(before.campaigns);
    expect(after.audit).toBe(before.audit + 2);
  });

  /**
   * Once the campaign is approved, the creator's attempt is a conflict rather than a forbidden
   * one: `executeHumanCampaignApproval` settles staleness and state before it consults the role
   * (`packages/application/src/campaign-approval-command.ts`), so the approved state answers
   * first. Both are refusals that write nothing, and pinning which one arrives keeps the ordering
   * from drifting unnoticed.
   */
  it("returns 409, not 403, when a creator attempts an already approved campaign", async () => {
    const draft = await createDraft();
    expect((await approvePost(approvalRequest(approverSession, approvalBody(draft)))).status).toBe(
      200,
    );
    const before = await tableCountsFor(pool, location.locationId);

    const conflicted = await approvePost(approvalRequest(creatorSession, approvalBody(draft)));

    expect(conflicted.status).toBe(409);
    expect(await tableCountsFor(pool, location.locationId)).toEqual(before);
  });
});
