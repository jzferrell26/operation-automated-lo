import { FIRST_PARTY_SESSION_COOKIE, createSessionBoundCsrfToken } from "@oalo/auth";
import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import { POST as signInPost } from "../app/api/review/session/route.js";
import { POST as signOutPost } from "../app/api/review/session/sign-out/route.js";
import { OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import {
  AUDIT_TABLE,
  REVIEW_HOST,
  REVIEW_ORIGIN,
  applyRouteEnvironment,
  countRows,
  createRouteTestPool,
  csrfSecretFor,
  routeEnvironment,
  seedActor,
  seedActorAt,
  seedLocation,
  seedLocationWithoutInstallation,
  signInRequest,
  type RoutePostgresEnvironment,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";

/**
 * PRD-005b 005B-AC-011, 012, 013, 014, 015, 016, 019, and 020, driven through the exported route
 * handlers against a disposable Postgres with the real composition.
 *
 * The session this suite mints is minted the way an operator mints one: the browser sends a
 * persona name and the operator's secret, and the server does everything else. Nothing here
 * inserts a session row directly, so what is proven is the issuance path itself.
 */

const SIGN_IN_SECRET = "review-sign-in-secret-fixture-0123456789";
const WRONG_SECRET_SAME_LENGTH = "review-sign-in-secret-fixture-9876543210";
const WRONG_SECRET_OTHER_LENGTH = "review-sign-in-secret-fixture-0123456789-longer";

let pool: PostgresDatabasePool;
let environment: RoutePostgresEnvironment;
let restoreEnvironment: () => void;
let reviewLocation: SeededLocation;
let outsiderLocation: SeededLocation;
let csrfServerSecret: Uint8Array;

beforeAll(async () => {
  // The composition needs a database before the seeded ids exist, so the pool is built from the
  // bare environment first and the two location ids are installed once they are known.
  restoreEnvironment = applyRouteEnvironment(routeEnvironment());
  pool = createRouteTestPool();
  reviewLocation = await seedLocation(pool, "Review sign-in location");
  outsiderLocation = await seedLocation(pool, "Review sign-in outsider location");
  await seedActor(pool, reviewLocation, {
    displayName: "Review sign-in creator",
    bindingRole: "creator",
    sessionRole: "campaign_creator",
  });
  await seedActor(pool, reviewLocation, {
    displayName: "Review sign-in approver",
    bindingRole: "approver",
    sessionRole: "campaign_approver",
  });
  await seedActor(pool, outsiderLocation, {
    displayName: "Review sign-in outsider admin",
    bindingRole: "location_admin",
    sessionRole: "location_admin",
  });
  restoreEnvironment();
  environment = routeEnvironment({
    OALO_REVIEW_SIGNIN_SECRET: SIGN_IN_SECRET,
    OALO_REVIEW_LOCATION_ID: reviewLocation.locationId,
    OALO_REVIEW_OUTSIDER_LOCATION_ID: outsiderLocation.locationId,
  });
  restoreEnvironment = applyRouteEnvironment(environment);
  csrfServerSecret = csrfSecretFor(environment);
});

afterAll(async () => {
  await pool.close();
  restoreEnvironment();
});

/**
 * Runs one case against a different operator environment and puts the suite's own back afterwards.
 * Each swap rebuilds the composition, so the cases that need one say so explicitly rather than
 * every case paying for it.
 */
async function withEnvironment(
  overrides: Readonly<Record<string, string>>,
  work: () => Promise<void>,
): Promise<void> {
  restoreEnvironment();
  const restoreSwapped = applyRouteEnvironment(
    routeEnvironment({
      OALO_REVIEW_SIGNIN_SECRET: SIGN_IN_SECRET,
      OALO_REVIEW_LOCATION_ID: reviewLocation.locationId,
      OALO_REVIEW_OUTSIDER_LOCATION_ID: outsiderLocation.locationId,
      ...overrides,
    }),
  );
  try {
    await work();
  } finally {
    restoreSwapped();
    restoreEnvironment = applyRouteEnvironment(environment);
  }
}

function sessionCookieFrom(response: Response): string {
  const header = response.headers.get("set-cookie");
  expect(header).not.toBeNull();
  const value = /__Host-oalo_session=([A-Za-z0-9_-]+);/u.exec(header ?? "")?.[1];
  expect(value).toBeDefined();
  return `${FIRST_PARTY_SESSION_COOKIE}=${value ?? ""}`;
}

async function signIn(persona: string, secret: string = SIGN_IN_SECRET): Promise<Response> {
  return signInPost(signInRequest({ body: { persona, secret } }));
}

function preflightWith(cookie: string, sessionRef: string): Request {
  return new Request(`${REVIEW_ORIGIN}/api/campaigns/preflight`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      origin: REVIEW_ORIGIN,
      host: REVIEW_HOST,
      "x-csrf-token": createSessionBoundCsrfToken({
        serverSecret: csrfServerSecret,
        sessionId: sessionRef,
      }),
    },
    body: JSON.stringify(OPEN_HOUSE_DRAFT_INPUT),
  });
}

describe("POST /api/review/session", () => {
  it("mints a session whose cookie the campaign routes accept (005B-AC-012)", async () => {
    const response = await signIn("creator");

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${FIRST_PARTY_SESSION_COOKIE}=`);
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Max-Age=43200");

    const body = (await response.json()) as { sessionRef: string };
    expect(body.sessionRef).toMatch(/^session_[0-9a-f]{32}$/u);

    const preflight = await preflightPost(
      preflightWith(sessionCookieFrom(response), body.sessionRef),
    );
    expect(preflight.status).toBe(200);
  });

  it("never returns the session secret or its hash in the response body (005B-AC-016)", async () => {
    const response = await signIn("approver");
    const cookie = sessionCookieFrom(response);
    const secret = cookie.slice(`${FIRST_PARTY_SESSION_COOKIE}=`.length);
    const serialized = JSON.stringify(await response.json());

    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain(SIGN_IN_SECRET);
  });

  it.each([
    ["a wrong secret of the same length", () => signIn("creator", WRONG_SECRET_SAME_LENGTH)],
    ["a secret of a different length", () => signIn("creator", WRONG_SECRET_OTHER_LENGTH)],
    ["an unknown persona", () => signIn("administrator")],
    [
      "an unlisted origin",
      () =>
        signInPost(
          signInRequest({
            body: { persona: "creator", secret: SIGN_IN_SECRET },
            overrides: { origin: "https://attacker.example" },
          }),
        ),
    ],
    [
      "a wrong host",
      () =>
        signInPost(
          signInRequest({
            body: { persona: "creator", secret: SIGN_IN_SECRET },
            overrides: { host: "attacker.example" },
          }),
        ),
    ],
  ])("refuses %s with one generic 401 and no cookie (005B-AC-012)", async (_label, attempt) => {
    const response = await attempt();

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual({ error: "UNAUTHENTICATED" });
  });

  it.each([
    ["locationId", { locationId: "00000000-0000-4000-8000-000000000901" }],
    ["userId", { userId: "00000000-0000-4000-8000-000000000911" }],
    ["role", { role: "location_admin" }],
    ["installationRef", { installationRef: "installation_0123456789abcdef" }],
    ["roleVersion", { roleVersion: 2 }],
  ])("rejects a body carrying %s with 400 (005B-AC-014)", async (_label, extra) => {
    const response = await signInPost(
      signInRequest({ body: { persona: "creator", secret: SIGN_IN_SECRET, ...extra } }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  /**
   * 005B-AC-016. The location whose persona resolves but whose issuance is refused. The denied row
   * is written by `platform.issue_first_party_session` itself, which is the only writer of it.
   */
  it("writes exactly one denied audit row when issuance is refused at a known location", async () => {
    const deniedLocationId = await seedLocationWithoutInstallation(pool, "Review denied location");
    await seedActorAt(pool, deniedLocationId, {
      displayName: "Review denied creator",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    });
    await withEnvironment({ OALO_REVIEW_LOCATION_ID: deniedLocationId }, async () => {
      const before = await countRows(pool, AUDIT_TABLE, deniedLocationId);
      const response = await signIn("creator");
      const after = await countRows(pool, AUDIT_TABLE, deniedLocationId);

      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(after).toBe(before + 1);
    });
  });

  it("writes exactly one audit row for a successful issuance (005B-AC-016)", async () => {
    const before = await countRows(pool, AUDIT_TABLE, reviewLocation.locationId);
    const response = await signIn("creator");
    const after = await countRows(pool, AUDIT_TABLE, reviewLocation.locationId);

    expect(response.status).toBe(200);
    expect(after).toBe(before + 1);
  });

  /**
   * The unreachable connection string is the proof, not decoration: if production were refused
   * anywhere after the composition took a connection, this case would fail on the connection
   * rather than answer 403.
   */
  it("answers 403 in production before any database access (005B-AC-011, 020)", async () => {
    await withEnvironment(
      {
        OALO_ENVIRONMENT: "production",
        OALO_DATABASE_URL: "postgresql://nobody@127.0.0.1:1/oalo_test_unreachable",
      },
      async () => {
        const response = await signIn("creator");

        expect(response.status).toBe(403);
        expect(response.headers.get("set-cookie")).toBeNull();
      },
    );
  });

  it("answers 404 outside review mode (005B-AC-011, 020)", async () => {
    await withEnvironment(
      {
        OALO_REVIEW_SURFACE: "",
        OALO_DATABASE_URL: "postgresql://nobody@127.0.0.1:1/oalo_test_unreachable",
      },
      async () => {
        expect((await signIn("creator")).status).toBe(404);
      },
    );
  });

  it.each([
    ["OALO_REVIEW_SIGNIN_SECRET", { OALO_REVIEW_SIGNIN_SECRET: "too-short" }],
    ["OALO_REVIEW_LOCATION_ID", { OALO_REVIEW_LOCATION_ID: "not-a-uuid" }],
    ["OALO_REVIEW_OUTSIDER_LOCATION_ID", { OALO_REVIEW_OUTSIDER_LOCATION_ID: "" }],
  ])("answers 503 when %s is malformed (005B-AC-011)", async (_label, overrides) => {
    await withEnvironment(overrides, async () => {
      expect((await signIn("creator")).status).toBe(503);
    });
  });
});

describe("POST /api/review/session/sign-out", () => {
  function signOutRequest(
    cookie: string,
    sessionRef: string,
    overrides: Readonly<{ csrfToken?: string | null }> = {},
  ): Request {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      cookie,
      origin: REVIEW_ORIGIN,
      host: REVIEW_HOST,
    };
    const token =
      overrides.csrfToken === undefined
        ? createSessionBoundCsrfToken({ serverSecret: csrfServerSecret, sessionId: sessionRef })
        : overrides.csrfToken;
    if (token !== null) headers["x-csrf-token"] = token;
    return new Request(`${REVIEW_ORIGIN}/api/review/session/sign-out`, {
      method: "POST",
      headers,
      body: "{}",
    });
  }

  it("revokes the session, clears the cookie, and refuses the next request (005B-AC-015)", async () => {
    const minted = await signIn("creator");
    const cookie = sessionCookieFrom(minted);
    const { sessionRef } = (await minted.json()) as { sessionRef: string };

    const before = await countRows(pool, AUDIT_TABLE, reviewLocation.locationId);
    const signedOut = await signOutPost(signOutRequest(cookie, sessionRef));
    const after = await countRows(pool, AUDIT_TABLE, reviewLocation.locationId);

    expect(signedOut.status).toBe(200);
    expect(signedOut.headers.get("set-cookie")).toContain("Max-Age=0");
    // 005B-AC-016: exactly one revocation audit row.
    expect(after).toBe(before + 1);

    const afterSignOut = await preflightPost(preflightWith(cookie, sessionRef));
    expect(afterSignOut.status).toBe(401);
  });

  it("does not revoke when the CSRF token is absent (005B-AC-015)", async () => {
    const minted = await signIn("creator");
    const cookie = sessionCookieFrom(minted);
    const { sessionRef } = (await minted.json()) as { sessionRef: string };

    const refused = await signOutPost(signOutRequest(cookie, sessionRef, { csrfToken: null }));
    expect(refused.status).toBe(401);

    // The session still works, which is the proof that nothing was revoked.
    expect((await preflightPost(preflightWith(cookie, sessionRef))).status).toBe(200);
  });

  // The creator persona is the one used for the liveness probe below, because the probe is a
  // preflight and only a creator may create a draft.
  it("does not revoke when the CSRF token belongs to another session (005B-AC-015)", async () => {
    const minted = await signIn("creator");
    const cookie = sessionCookieFrom(minted);
    const { sessionRef } = (await minted.json()) as { sessionRef: string };

    const refused = await signOutPost(
      signOutRequest(cookie, sessionRef, {
        csrfToken: createSessionBoundCsrfToken({
          serverSecret: csrfServerSecret,
          sessionId: "session_00000000000000000000000000000001",
        }),
      }),
    );

    expect(refused.status).toBe(401);
    expect((await preflightPost(preflightWith(cookie, sessionRef))).status).toBe(200);
  });
});
