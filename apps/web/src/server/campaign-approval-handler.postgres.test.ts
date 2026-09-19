import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as approvePost } from "../app/api/campaigns/approve/route.js";
import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import { OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import {
  browserRequest,
  countRows,
  createRouteTestPool,
  revokeSession,
  grantBinding,
  issueSession,
  revokeBinding,
  routeEnvironment,
  seedActor,
  seedLocation,
  type BrowserRequestOverrides,
  type IssuedSession,
  type RoutePostgresEnvironment,
  type SeededActor,
  type SeededLocation,
  csrfSecretFor,
} from "./campaign-route-postgres-support.js";
import { resetRuntimeAuthenticationForTests } from "./runtime-authentication.js";

/**
 * PRD-005a 005A-AC-013 and the approve half of 005A-AC-014, against a disposable Postgres.
 *
 * Authored in Wave 1; run in Wave 2, after PRD-005b's migration and `security definer` functions
 * merge and `vitest.config.ts` gains the `web-postgres` project.
 *
 * Every negative case asserts that the campaign, command, approval, and audit tables are unchanged,
 * because a refusal that still wrote a row is not a refusal. The one exception is the creator's
 * forbidden approval, which the command specifies writes exactly one denied-attempt row.
 */

const environment: RoutePostgresEnvironment = routeEnvironment();

interface PersistedDraft {
  readonly campaignRef: string;
  readonly campaignVersionRef: string;
  readonly manifestHash: string;
  readonly preflightResultHash: string;
  readonly rowVersion: number;
}

let pool: PostgresDatabasePool;
let location: SeededLocation;
let creator: SeededActor;
let approver: SeededActor;
let creatorSession: IssuedSession;
let approverSession: IssuedSession;
let csrfServerSecret: Uint8Array;

beforeAll(async () => {
  resetRuntimeAuthenticationForTests();
  pool = createRouteTestPool();
  csrfServerSecret = csrfSecretFor(environment);
  location = await seedLocation(pool, "Route approval location");
  creator = await seedActor(pool, location, {
    displayName: "Route approval creator",
    bindingRole: "creator",
    sessionRole: "campaign_creator",
  });
  approver = await seedActor(pool, location, {
    displayName: "Route approval approver",
    bindingRole: "approver",
    sessionRole: "campaign_approver",
  });
  creatorSession = await issueSession(pool, location, creator);
  approverSession = await issueSession(pool, location, approver);
});

afterAll(async () => {
  resetRuntimeAuthenticationForTests();
  await pool.close();
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
  const response = await preflightPost(
    browserRequest({
      path: "/api/campaigns/preflight",
      body: OPEN_HOUSE_DRAFT_INPUT,
      session: creatorSession,
      csrfServerSecret,
    }),
  );
  expect(response.status).toBe(200);
  const body = (await response.json()) as Omit<PersistedDraft, "rowVersion">;
  return { ...body, rowVersion: 1 };
}

function approvalBody(draft: PersistedDraft) {
  return {
    campaignRef: draft.campaignRef,
    decision: "approved" as const,
    expectedCampaignVersionRef: draft.campaignVersionRef,
    expectedManifestHash: draft.manifestHash,
    expectedPreflightResultHash: draft.preflightResultHash,
    expectedRowVersion: draft.rowVersion,
  };
}

async function tableCounts() {
  return {
    campaigns: await countRows(pool, "campaign.campaigns", location.locationId),
    commands: await countRows(pool, "campaign.campaign_commands", location.locationId),
    approvals: await countRows(pool, "campaign.campaign_approvals", location.locationId),
    audit: await countRows(pool, "audit.events", location.locationId),
  };
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
