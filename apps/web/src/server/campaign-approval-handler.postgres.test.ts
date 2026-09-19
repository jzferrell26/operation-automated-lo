import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as approvePost } from "../app/api/campaigns/approve/route.js";
import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import { OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import {
  approvalPayload,
  browserRequest,
  closeApprovalSuite,
  createDraftThroughPreflight,
  grantBinding,
  issueSession,
  openApprovalSuite,
  revokeBinding,
  revokeSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  tableCountsFor,
  type ApprovalSuiteFixture,
  type BrowserRequestOverrides,
  type IssuedSession,
  type PersistedDraft,
  type RoutePostgresEnvironment,
  type SeededActor,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";

/**
 * PRD-005a 005A-AC-013 and the approve half of 005A-AC-014, against a disposable Postgres.
 *
 * Every request goes through the exported `POST` in
 * `apps/web/src/app/api/campaigns/approve/route.ts` with the headers a browser actually sends, so
 * the route wiring is part of what is proven.
 *
 * Every negative case asserts that the campaign, command, approval, and audit tables are unchanged,
 * because a refusal that still wrote a row is not a refusal. The one exception is the creator's
 * forbidden approval, which the command specifies writes exactly one denied-attempt row.
 */

const environment: RoutePostgresEnvironment = routeEnvironment();

let suite: ApprovalSuiteFixture;
let pool: PostgresDatabasePool;
let location: SeededLocation;
let approver: SeededActor;
let creatorSession: IssuedSession;
let approverSession: IssuedSession;
let csrfServerSecret: Uint8Array;

beforeAll(async () => {
  suite = await openApprovalSuite(environment, "Route approval");
  ({ pool, location, approver, creatorSession, approverSession, csrfServerSecret } = suite);
});

afterAll(async () => {
  await closeApprovalSuite(suite);
});

function approvalRequest(
  session: IssuedSession,
  body: unknown,
  overrides: BrowserRequestOverrides = {},
): Request {
  return browserRequest({
    path: "/api/campaigns/approve",
    body,
    session,
    csrfServerSecret,
    overrides,
  });
}

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

async function tableCounts() {
  return tableCountsFor(pool, location.locationId);
}

describe("POST /api/campaigns/approve with a real first-party session", () => {
  it("commits an authorized approval and returns the idempotent duplicate on an identical retry", async () => {
    const draft = await createDraft();

    const first = await approvePost(approvalRequest(approverSession, approvalBody(draft)));
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { state: string; duplicate: boolean };
    expect(firstBody.state).toBe("approved");
    expect(firstBody.duplicate).toBe(false);

    const afterFirst = await tableCounts();

    // 005A-AC-014 approve half: the identical retry carries the pre-approval row version.
    const retry = await approvePost(approvalRequest(approverSession, approvalBody(draft)));
    expect(retry.status).toBe(200);
    const retryBody = (await retry.json()) as { state: string; duplicate: boolean };
    expect(retryBody.duplicate).toBe(true);
    expect(retryBody.state).toBe("approved");

    expect(await tableCounts()).toEqual(afterFirst);
  });

  it("forbids a creator from approving and writes exactly one denied-attempt row", async () => {
    const draft = await createDraft();
    const before = await tableCounts();

    const response = await approvePost(approvalRequest(creatorSession, approvalBody(draft)));

    expect(response.status).toBe(403);
    const after = await tableCounts();
    expect(after.approvals).toBe(before.approvals);
    expect(after.audit).toBe(before.audit + 1);
  });

  it("answers not found for a campaign reference outside the session's location", async () => {
    const outsiderLocation = await seedLocation(pool, "Route approval outsider location");
    const outsiderAdmin = await seedActor(pool, outsiderLocation, {
      displayName: "Route approval outsider admin",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    });
    const outsiderSession = await issueSession(pool, outsiderLocation, outsiderAdmin);
    const draft = await createDraft();
    const before = await tableCounts();

    const response = await approvePost(approvalRequest(outsiderSession, approvalBody(draft)));

    expect(response.status).toBe(404);
    expect(await tableCounts()).toEqual(before);
  });

  it.each([
    ["no session", { cookie: "", csrfToken: null } as BrowserRequestOverrides],
    ["an unlisted origin", { origin: "https://attacker.example" } as BrowserRequestOverrides],
    ["a wrong host", { host: "attacker.example" } as BrowserRequestOverrides],
    ["no CSRF token", { csrfToken: null } as BrowserRequestOverrides],
    [
      "a CSRF token bound to a different session",
      { csrfToken: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" } as BrowserRequestOverrides,
    ],
  ])("refuses an approval with %s and writes nothing", async (_label, overrides) => {
    const draft = await createDraft();
    const before = await tableCounts();

    const response = await approvePost(
      approvalRequest(approverSession, approvalBody(draft), overrides),
    );

    expect(response.status).toBe(401);
    expect(await tableCounts()).toEqual(before);
  });

  it("refuses a revoked session and writes nothing", async () => {
    const draft = await createDraft();
    const revoked = await issueSession(pool, location, approver);
    await revokeSession(pool, revoked);
    const before = await tableCounts();

    expect((await approvePost(approvalRequest(revoked, approvalBody(draft)))).status).toBe(401);
    expect(await tableCounts()).toEqual(before);
  });

  it("refuses a session past its expiry and writes nothing", async () => {
    const draft = await createDraft();
    const shortLived = await issueSession(pool, location, approver, 1);
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    const before = await tableCounts();

    expect((await approvePost(approvalRequest(shortLived, approvalBody(draft)))).status).toBe(401);
    expect(await tableCounts()).toEqual(before);
  });

  it("refuses a session whose binding was revoked and re-granted, and writes nothing", async () => {
    const draft = await createDraft();
    const stale = await issueSession(pool, location, approver);
    await revokeBinding(pool, location, approver);
    await grantBinding(pool, location, approver);
    const before = await tableCounts();

    expect((await approvePost(approvalRequest(stale, approvalBody(draft)))).status).toBe(401);
    expect(await tableCounts()).toEqual(before);

    approverSession = await issueSession(pool, location, approver);
  });
});
