import type { AuthenticatedPrincipal } from "@oalo/application";
import { createSessionBoundCsrfToken } from "@oalo/auth";
import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST } from "../app/api/campaigns/preflight/route.js";
import { resolveAuthenticatedReadPrincipal } from "./authenticated-principal.js";
import { OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import {
  applyRouteEnvironment,
  browserRequest,
  currentRowVersion,
  createRouteTestPool,
  revokeSession,
  grantBinding,
  issueSession,
  revokeBinding,
  routeEnvironment,
  seedActor,
  seedLocation,
  tableCountsFor,
  type BrowserRequestOverrides,
  type IssuedSession,
  type RoutePostgresEnvironment,
  type SeededActor,
  type SeededLocation,
  csrfSecretFor,
} from "./campaign-route-postgres-support.js";
import { loadWorkspaceCampaign } from "./campaign-workspace-reads.js";
import {
  resetRuntimeAuthenticationForTests,
  resolveRuntimeCampaignCommandPorts,
} from "./runtime-authentication.js";
import { POST as approvePost } from "../app/api/campaigns/approve/route.js";

/**
 * PRD-005a 005A-AC-013 and the create half of 005A-AC-014, against a disposable Postgres.
 *
 * Authored in Wave 1; run in Wave 2, after PRD-005b's migration and `security definer` functions
 * merge and `vitest.config.ts` gains the `web-postgres` project. Every request below is built the
 * way a browser builds one and goes through the exported `POST` in
 * `apps/web/src/app/api/campaigns/preflight/route.ts` rather than the handler helper, so the route
 * wiring is part of what is proven.
 */

const environment: RoutePostgresEnvironment = routeEnvironment();

let pool: PostgresDatabasePool;
let location: SeededLocation;
let outsiderLocation: SeededLocation;
let creator: SeededActor;
let outsiderAdmin: SeededActor;
let creatorSession: IssuedSession;
let outsiderSession: IssuedSession;
let approver: SeededActor;
let approverSession: IssuedSession;
let csrfServerSecret: Uint8Array;
let restoreEnvironment: () => void;

beforeAll(async () => {
  restoreEnvironment = applyRouteEnvironment(environment);
  pool = createRouteTestPool();
  csrfServerSecret = csrfSecretFor(environment);
  location = await seedLocation(pool, "Route preflight location");
  outsiderLocation = await seedLocation(pool, "Route preflight outsider location");
  creator = await seedActor(pool, location, {
    displayName: "Route preflight creator",
    bindingRole: "creator",
    sessionRole: "campaign_creator",
  });
  outsiderAdmin = await seedActor(pool, outsiderLocation, {
    displayName: "Route preflight outsider admin",
    bindingRole: "location_admin",
    sessionRole: "location_admin",
  });
  approver = await seedActor(pool, location, {
    displayName: "Route preflight approver",
    bindingRole: "approver",
    sessionRole: "campaign_approver",
  });
  creatorSession = await issueSession(pool, location, creator);
  approverSession = await issueSession(pool, location, approver);
  outsiderSession = await issueSession(pool, outsiderLocation, outsiderAdmin);
});

afterAll(async () => {
  await pool.close();
  restoreEnvironment();
});

function preflightRequest(
  session: IssuedSession,
  overrides: BrowserRequestOverrides = {},
): Request {
  return browserRequest({
    path: "/api/campaigns/preflight",
    body: OPEN_HOUSE_DRAFT_INPUT,
    session,
    csrfServerSecret,
    overrides,
  });
}

/**
 * 005A-AC-013. The campaign, command, approval, and audit counts for this suite's location, in
 * one call, so a negative case cannot prove three of the four and forget the fourth. Every
 * refusal below is bracketed by this: a refusal that still wrote a row is not a refusal.
 */
async function tableCounts() {
  return tableCountsFor(pool, location.locationId);
}

/** Resolves a principal the way a page render does, through the production resolver. */
async function principalFromSession(
  session: IssuedSession,
): Promise<Readonly<AuthenticatedPrincipal>> {
  return resolveAuthenticatedReadPrincipal(
    new Request(`${environment.OALO_APP_URL}/marketing/campaigns`, {
      headers: { cookie: session.cookieHeader },
    }),
    environment,
    resolveRuntimeCampaignCommandPorts(environment),
  );
}

describe("POST /api/campaigns/preflight with a real first-party session", () => {
  it("persists for the session's location and reads back after a fresh principal resolve", async () => {
    const response = await POST(preflightRequest(creatorSession));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { campaignRef: string; state: string };

    const readBack = await loadWorkspaceCampaign(
      await principalFromSession(creatorSession),
      body.campaignRef,
      environment,
    );
    expect(readBack?.campaignRef).toBe(body.campaignRef);
    expect(readBack?.state).toBe(body.state);
  });

  it("refuses a request that carries no session and writes nothing", async () => {
    const before = await tableCounts();

    const response = await POST(preflightRequest(creatorSession, { cookie: "", csrfToken: null }));

    expect(response.status).toBe(401);
    expect(await tableCounts()).toEqual(before);
  });

  it("refuses a revoked session and writes nothing", async () => {
    const revoked = await issueSession(pool, location, creator);
    await revokeSession(pool, revoked);
    const before = await tableCounts();

    expect((await POST(preflightRequest(revoked))).status).toBe(401);
    expect(await tableCounts()).toEqual(before);
  });

  it("refuses a session past its expiry and writes nothing", async () => {
    const shortLived = await issueSession(pool, location, creator, 1);
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    const before = await tableCounts();

    expect((await POST(preflightRequest(shortLived))).status).toBe(401);
    expect(await tableCounts()).toEqual(before);
  });

  it("refuses a session minted under a binding that was revoked and re-granted", async () => {
    const stale = await issueSession(pool, location, creator);
    await revokeBinding(pool, location, creator);
    await grantBinding(pool, location, creator);
    const before = await tableCounts();

    expect((await POST(preflightRequest(stale))).status).toBe(401);
    expect(await tableCounts()).toEqual(before);

    await revokeBinding(pool, location, creator);
    await grantBinding(pool, location, creator);
    creatorSession = await issueSession(pool, location, creator);
  });

  it.each([
    ["an unlisted origin", { origin: "https://attacker.example" } as BrowserRequestOverrides],
    ["a wrong host", { host: "attacker.example" } as BrowserRequestOverrides],
    ["no CSRF token", { csrfToken: null } as BrowserRequestOverrides],
    [
      "a forged CSRF token",
      { csrfToken: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" } as BrowserRequestOverrides,
    ],
  ])("refuses a mutation with %s and writes nothing", async (_label, overrides) => {
    const before = await tableCounts();

    expect((await POST(preflightRequest(creatorSession, overrides))).status).toBe(401);
    expect(await tableCounts()).toEqual(before);
  });

  /**
   * 005A-AC-004. A token the deployment itself minted, from the real server secret, for a real
   * live session that is not the one in the cookie. The forged token above only proves the HMAC
   * is checked; this proves the session identifier inside it is part of what is checked, which is
   * the whole point of binding the token to a session.
   */
  it("refuses a CSRF token bound to a different live session and writes nothing", async () => {
    const otherSessionToken = createSessionBoundCsrfToken({
      serverSecret: csrfServerSecret,
      sessionId: approverSession.sessionRef,
    });
    const before = await tableCounts();

    const response = await POST(preflightRequest(creatorSession, { csrfToken: otherSessionToken }));

    expect(response.status).toBe(401);
    expect(await tableCounts()).toEqual(before);
  });

  it("keeps an outsider session's write inside the outsider location", async () => {
    const response = await POST(preflightRequest(outsiderSession));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { campaignRef: string };

    expect(
      await loadWorkspaceCampaign(
        await principalFromSession(creatorSession),
        body.campaignRef,
        environment,
      ),
    ).toBeUndefined();
  });

  /**
   * 005A-AC-014 in full. The composition cache is cleared between the write and the read, so the
   * second half resolves a fresh principal over a fresh pool from the same cookie the browser
   * still holds. Nothing is carried across in memory: what is read back is what Postgres kept.
   */
  it("reads the same version, preflight, and state back after the pool is rebuilt, then approves", async () => {
    const created = await POST(preflightRequest(creatorSession));
    expect(created.status).toBe(200);
    const draft = (await created.json()) as {
      campaignRef: string;
      campaignVersionRef: string;
      preflightResultHash: string;
      manifestHash: string;
      state: string;
    };

    resetRuntimeAuthenticationForTests();

    const reloaded = await loadWorkspaceCampaign(
      await principalFromSession(creatorSession),
      draft.campaignRef,
      environment,
    );
    expect(reloaded?.campaignVersionRef).toBe(draft.campaignVersionRef);
    expect(reloaded?.preflight.resultHash).toBe(draft.preflightResultHash);
    expect(reloaded?.manifestHash).toBe(draft.manifestHash);
    expect(reloaded?.state).toBe(draft.state);

    const approved = await approvePost(
      browserRequest({
        path: "/api/campaigns/approve",
        body: {
          campaignRef: draft.campaignRef,
          decision: "approved",
          expectedCampaignVersionRef: draft.campaignVersionRef,
          expectedManifestHash: draft.manifestHash,
          expectedPreflightResultHash: draft.preflightResultHash,
          expectedRowVersion: await currentRowVersion(
            creatorSession,
            draft.campaignRef,
            environment,
          ),
        },
        session: approverSession,
        csrfServerSecret,
      }),
    );
    expect(approved.status).toBe(200);

    resetRuntimeAuthenticationForTests();

    const afterApproval = await loadWorkspaceCampaign(
      await principalFromSession(creatorSession),
      draft.campaignRef,
      environment,
    );
    expect(afterApproval?.state).toBe("approved");
  });
});
