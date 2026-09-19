import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as profilePost } from "../app/api/setup/profile/route.js";
import { POST as progressPost } from "../app/api/setup/progress/route.js";
import {
  applyRouteEnvironment,
  browserRequest,
  createRouteTestPool,
  csrfSecretFor,
  issueSession,
  revokeSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  type IssuedSession,
  type RoutePostgresEnvironment,
  type SeededActor,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";
import { principalForSession } from "./campaign-route-postgres-support.js";
import { readSetupPreferences } from "./setup-preferences.js";

/**
 * PRD-006c 006C-AC-004, against a disposable PostgreSQL.
 *
 * Every request below is built the way a browser builds one and goes through the exported `POST`
 * in `apps/web/src/app/api/setup/{progress,profile}/route.ts` rather than the handler helper, so
 * the route wiring is part of what is proven.
 *
 * The negative cases are the point. A missing CSRF token, a foreign origin, a wrong host, and a
 * revoked session must each be refused, and a body carrying `locationId` or `userId` must be a 400
 * rather than a silently ignored field, because a field the server drops without complaint is a
 * field a caller will keep sending.
 */

const environment: RoutePostgresEnvironment = routeEnvironment();

let pool: PostgresDatabasePool;
let location: SeededLocation;
let otherLocation: SeededLocation;
let creator: SeededActor;
let otherAdmin: SeededActor;
let session: IssuedSession;
let otherSession: IssuedSession;
let csrfServerSecret: Uint8Array;
let restoreEnvironment: () => void;

const VALID_PROGRESS = Object.freeze({
  status: "in_progress" as const,
  currentStep: 3,
  completedSteps: [1, 2],
  restartedCount: 0,
});

const VALID_PROFILE = Object.freeze({
  displayName: "Dana Reyes",
  company: "Northgate Lending",
  realtorName: "Priya Nadeem",
});

beforeAll(async () => {
  restoreEnvironment = applyRouteEnvironment(environment);
  pool = createRouteTestPool();
  csrfServerSecret = csrfSecretFor(environment);
  location = await seedLocation(pool, "Setup preferences location");
  otherLocation = await seedLocation(pool, "Setup preferences other location");
  creator = await seedActor(pool, location, {
    displayName: "Setup preferences creator",
    bindingRole: "creator",
    sessionRole: "campaign_creator",
  });
  otherAdmin = await seedActor(pool, otherLocation, {
    displayName: "Setup preferences outsider",
    bindingRole: "location_admin",
    sessionRole: "location_admin",
  });
  session = await issueSession(pool, location, creator);
  otherSession = await issueSession(pool, otherLocation, otherAdmin);
});

afterAll(async () => {
  await pool.close();
  restoreEnvironment();
});

function progressRequest(body: unknown, overrides = {}) {
  return browserRequest({
    path: "/api/setup/progress",
    body,
    session,
    csrfServerSecret,
    overrides,
  });
}

function profileRequest(body: unknown, overrides = {}) {
  return browserRequest({
    path: "/api/setup/profile",
    body,
    session,
    csrfServerSecret,
    overrides,
  });
}

describe("setup preference routes", () => {
  it("stores progress for the signed-in person and reads it back", async () => {
    const response = await progressPost(progressRequest({ progress: VALID_PROGRESS }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ progress: VALID_PROGRESS });

    const stored = await readSetupPreferences(
      await principalForSession(session, environment),
      environment,
    );
    expect(stored.progress).toEqual(VALID_PROGRESS);
  });

  it("stores the profile and replaces it on a second write", async () => {
    expect((await profilePost(profileRequest({ profile: VALID_PROFILE }))).status).toBe(200);
    const revised = { ...VALID_PROFILE, company: "Northgate Lending Group" };
    expect((await profilePost(profileRequest({ profile: revised }))).status).toBe(200);

    const stored = await readSetupPreferences(
      await principalForSession(session, environment),
      environment,
    );
    expect(stored.profile).toEqual(revised);
  });

  it("never lets one workspace read another's preferences", async () => {
    const foreign = await readSetupPreferences(
      await principalForSession(otherSession, environment),
      environment,
    );
    expect(foreign.profile).toBeUndefined();
    expect(foreign.progress.status).toBe("not_started");
  });

  /**
   * The bodies are built inside the test rather than in the `it.each` table, because the table is
   * evaluated while the file is being collected and the seeded ids do not exist until `beforeAll`
   * has run.
   */
  it.each([
    ["locationId", () => ({ progress: VALID_PROGRESS, locationId: location.locationId })],
    ["userId", () => ({ progress: VALID_PROGRESS, userId: creator.actorId })],
    ["an undeclared field", () => ({ progress: { ...VALID_PROGRESS, tenant: "someone else" } })],
  ])("refuses a progress body carrying %s", async (_name, body) => {
    const response = await progressPost(progressRequest(body()));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "SETUP_PREFERENCE_INVALID" });
  });

  it.each([
    ["locationId", () => ({ profile: VALID_PROFILE, locationId: location.locationId })],
    ["userId", () => ({ profile: { ...VALID_PROFILE, userId: creator.actorId } })],
  ])("refuses a profile body carrying %s", async (_name, body) => {
    const response = await profilePost(profileRequest(body()));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "SETUP_PREFERENCE_INVALID" });
  });

  it("refuses a step outside the seven", async () => {
    const response = await progressPost(
      progressRequest({ progress: { ...VALID_PROGRESS, currentStep: 9 } }),
    );
    expect(response.status).toBe(400);
  });

  it("refuses a profile field longer than the schema allows", async () => {
    const response = await profilePost(
      profileRequest({ profile: { ...VALID_PROFILE, displayName: "x".repeat(200) } }),
    );
    expect(response.status).toBe(400);
  });

  it.each([
    ["no CSRF token", { csrfToken: null }],
    ["a foreign origin", { origin: "https://attacker.example" }],
    ["a wrong host", { host: "attacker.example" }],
    ["no session cookie", { cookie: "" }],
  ])("refuses a progress write with %s", async (_name, overrides) => {
    const response = await progressPost(progressRequest({ progress: VALID_PROGRESS }, overrides));
    expect(response.status).toBe(401);
  });

  it.each([
    ["no CSRF token", { csrfToken: null }],
    ["a foreign origin", { origin: "https://attacker.example" }],
  ])("refuses a profile write with %s", async (_name, overrides) => {
    const response = await profilePost(profileRequest({ profile: VALID_PROFILE }, overrides));
    expect(response.status).toBe(401);
  });

  it("refuses both routes once the session is revoked", async () => {
    const throwaway = await issueSession(pool, location, creator);
    await revokeSession(pool, throwaway);
    for (const [path, post] of [
      ["/api/setup/progress", progressPost],
      ["/api/setup/profile", profilePost],
    ] as const) {
      const response = await post(
        browserRequest({
          path,
          body: path.endsWith("progress")
            ? { progress: VALID_PROGRESS }
            : { profile: VALID_PROFILE },
          session: throwaway,
          csrfServerSecret,
        }),
      );
      expect(response.status, path).toBe(401);
    }
  });
});
