import type { AuthenticatedPrincipal } from "@oalo/application";
import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST } from "../app/api/campaigns/preflight/route.js";
import { resolveAuthenticatedReadPrincipal } from "./authenticated-principal.js";
import { OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import {
  browserRequest,
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
import { loadWorkspaceCampaign } from "./campaign-workspace-reads.js";
import {
  resetRuntimeAuthenticationForTests,
  resolveRuntimeCampaignCommandPorts,
} from "./runtime-authentication.js";

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
let csrfServerSecret: Uint8Array;

beforeAll(async () => {
  resetRuntimeAuthenticationForTests();
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
  creatorSession = await issueSession(pool, location, creator);
  outsiderSession = await issueSession(pool, outsiderLocation, outsiderAdmin);
});

afterAll(async () => {
  resetRuntimeAuthenticationForTests();
  await pool.close();
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

  it("refuses a request that carries no session", async () => {
    const response = await POST(preflightRequest(creatorSession, { cookie: "", csrfToken: null }));

    expect(response.status).toBe(401);
  });

  it("refuses a revoked session", async () => {
    const revoked = await issueSession(pool, location, creator);
    await revokeSession(pool, revoked);

    expect((await POST(preflightRequest(revoked))).status).toBe(401);
  });

  it("refuses a session past its expiry", async () => {
    const shortLived = await issueSession(pool, location, creator, 1);
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    expect((await POST(preflightRequest(shortLived))).status).toBe(401);
  });

  it("refuses a session minted under a binding that was revoked and re-granted", async () => {
    const stale = await issueSession(pool, location, creator);
    await revokeBinding(pool, location, creator);
    await grantBinding(pool, location, creator);

    expect((await POST(preflightRequest(stale))).status).toBe(401);
    await revokeBinding(pool, location, creator);
    await grantBinding(pool, location, creator);
    creatorSession = await issueSession(pool, location, creator);
  });

  it.each([
    ["an unlisted origin", { origin: "https://attacker.example" } as BrowserRequestOverrides],
    ["a wrong host", { host: "attacker.example" } as BrowserRequestOverrides],
    ["no CSRF token", { csrfToken: null } as BrowserRequestOverrides],
    [
      "a CSRF token bound to a different session",
      { csrfToken: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" } as BrowserRequestOverrides,
    ],
  ])("refuses a mutation with %s", async (_label, overrides) => {
    expect((await POST(preflightRequest(creatorSession, overrides))).status).toBe(401);
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
});
