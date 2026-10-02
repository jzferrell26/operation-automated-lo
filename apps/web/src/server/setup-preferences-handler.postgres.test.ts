import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
} from "@oalo/db";
import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as profilePost } from "../app/api/setup/profile/route.js";
import {
  applyRouteEnvironment,
  browserRequest,
  createRouteTestPool,
  csrfSecretFor,
  issueSession,
  principalForSession,
  revokeSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  type IssuedSession,
  type RoutePostgresEnvironment,
  type SeededActor,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";
import { readHome } from "./home-reads.js";
import { readSetupPreferences } from "./setup-preferences.js";

/**
 * PRD-006c 006C-AC-004, as PRD-009b D4 and 009B-AC-011 and 009B-AC-012 left it, against a
 * disposable PostgreSQL.
 *
 * `POST /api/setup/progress` is gone, so what is proven here is the profile route that stays, and
 * that the walkthrough's stored progress row is left alone. Every request below is built the way a
 * browser builds one and goes through the exported `POST` in `apps/web/src/app/api/setup/profile/
 * route.ts` rather than the handler helper, so the route wiring is part of what is proven.
 *
 * The negative cases are the point. A missing CSRF token, a foreign origin, a wrong host, and a
 * revoked session must each be refused, and a body carrying `locationId` or `userId` must be a 400
 * rather than a silently ignored field, because a field the server drops without complaint is a
 * field a caller will keep sending. The Realtor fields are the one thing the route accepts and
 * drops (009B-AC-012).
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

const VALID_PROFILE = Object.freeze({
  displayName: "Dana Reyes",
  company: "Northgate Lending",
  nmlsNumber: "1234567",
  phone: "555 0100",
});

/** The row the retired walkthrough stored, as it stored it. */
const RETIRED_PROGRESS = Object.freeze({
  status: "in_progress",
  currentStep: 3,
  completedSteps: [1, 2],
  restartedCount: 0,
});

const seedRetiredProgressContract = defineSqlContract<Readonly<{ key: string }>>({
  name: "test.seed-guided-setup-row",
  access: "write",
  text: `
    insert into platform.user_preferences (location_id, user_id, key, value)
    values ($1, $2, 'guided_setup.v1', $3::text::jsonb)
    returning key
  `,
  decode: (row) => Object.freeze({ key: (row as { key: string }).key }),
});

const readRetiredProgressContract = defineSqlContract<Readonly<{ value: unknown }>>({
  name: "test.read-guided-setup-row",
  access: "read",
  text: "select value from platform.user_preferences where user_id = $1 and key = 'guided_setup.v1'",
  decode: (row) => Object.freeze({ value: (row as { value: unknown }).value }),
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

function profileRequest(body: unknown, overrides = {}) {
  return browserRequest({
    path: "/api/setup/profile",
    body,
    session,
    csrfServerSecret,
    overrides,
  });
}

describe("the setup profile route (009B-AC-012)", () => {
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

  it("accepts the Realtor fields a walkthrough client still sends, and stores none of them", async () => {
    const response = await profilePost(
      profileRequest({
        profile: {
          ...VALID_PROFILE,
          realtorName: "Priya Nadeem",
          realtorBrokerage: "Northgate Realty",
        },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ profile: VALID_PROFILE });

    const stored = await readSetupPreferences(
      await principalForSession(session, environment),
      environment,
    );
    expect(stored.profile).toEqual(VALID_PROFILE);
    expect(JSON.stringify(stored.profile)).not.toMatch(/realtor/iu);
  });

  it("never lets one workspace read another's preferences", async () => {
    const foreign = await readSetupPreferences(
      await principalForSession(otherSession, environment),
      environment,
    );
    expect(foreign.profile).toBeUndefined();
  });

  it.each([
    ["locationId", () => ({ profile: VALID_PROFILE, locationId: location.locationId })],
    ["userId", () => ({ profile: { ...VALID_PROFILE, userId: creator.actorId } })],
  ])("refuses a profile body carrying %s", async (_name, body) => {
    const response = await profilePost(profileRequest(body()));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "SETUP_PREFERENCE_INVALID" });
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
  ])("refuses a profile write with %s", async (_name, overrides) => {
    const response = await profilePost(profileRequest({ profile: VALID_PROFILE }, overrides));
    expect(response.status).toBe(401);
  });

  it("refuses the route once the session is revoked", async () => {
    const throwaway = await issueSession(pool, location, creator);
    await revokeSession(pool, throwaway);
    const response = await profilePost(
      browserRequest({
        path: "/api/setup/profile",
        body: { profile: VALID_PROFILE },
        session: throwaway,
        csrfServerSecret,
      }),
    );
    expect(response.status).toBe(401);
  });
});

/**
 * 009B-AC-011. The walkthrough is gone and its stored progress is not: a `guided_setup.v1` row that
 * a person saved before this change stays in the database, untouched, and nothing in the product
 * reads it again (D4, non-goals).
 */
describe("the retired progress row (009B-AC-011)", () => {
  it("has no route any more", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    expect(existsSync(join(import.meta.dirname, "../app/api/setup/progress/route.ts"))).toBe(false);
  });

  it("stays in the database, unchanged, after the profile is written and Home and the profile are read", async () => {
    const principal = await principalForSession(session, environment);
    await withTenantTransaction(
      pool,
      createPrincipalBoundTenantContextAuthority(
        principal,
        "correlation_setup_seed_retired_progress",
      ),
      (transaction) =>
        transaction.write(seedRetiredProgressContract, [
          principal.locationId,
          principal.actorId,
          JSON.stringify(RETIRED_PROGRESS),
        ]),
    );

    expect((await profilePost(profileRequest({ profile: VALID_PROFILE }))).status).toBe(200);
    const preferences = await readSetupPreferences(principal, environment);
    const home = await readHome(principal, environment);

    expect(JSON.stringify(preferences)).not.toContain("currentStep");
    expect(JSON.stringify(home)).not.toContain("currentStep");
    const rows = await withTenantTransaction(
      pool,
      createPrincipalBoundTenantContextAuthority(
        principal,
        "correlation_setup_read_retired_progress",
      ),
      (transaction) => transaction.read(readRetiredProgressContract, [principal.actorId]),
    );
    expect(rows.map((row) => row.value)).toEqual([RETIRED_PROGRESS]);
  });
});
