import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import { POST as profilePost } from "../app/api/setup/profile/route.js";
import { POST as progressPost } from "../app/api/setup/progress/route.js";
import { OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import {
  applyRouteEnvironment,
  browserRequest,
  createDraftThroughPreflight,
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
let approver: SeededActor;
let otherAdmin: SeededActor;
let session: IssuedSession;
let approverSession: IssuedSession;
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
  approver = await seedActor(pool, location, {
    displayName: "Setup preferences approver",
    bindingRole: "approver",
    sessionRole: "campaign_approver",
  });
  otherAdmin = await seedActor(pool, otherLocation, {
    displayName: "Setup preferences outsider",
    bindingRole: "location_admin",
    sessionRole: "location_admin",
  });
  session = await issueSession(pool, location, creator);
  approverSession = await issueSession(pool, location, approver);
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

function approverProgressRequest(body: unknown) {
  return browserRequest({
    path: "/api/setup/progress",
    body,
    session: approverSession,
    csrfServerSecret,
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

/**
 * A draft saved through the real create route, so the check result the read below returns is the
 * one the product produced rather than one this file wrote down.
 */
async function saveDraft(body: unknown) {
  return createDraftThroughPreflight({
    preflight: preflightPost,
    session,
    csrfServerSecret,
    environment,
    body,
  });
}

/** The same draft with an open house that has already finished, which the checks refuse. */
const FINISHED_OPEN_HOUSE = Object.freeze({
  ...OPEN_HOUSE_DRAFT_INPUT,
  openHouseStartsAt: "2020-06-12T17:00:00.000Z",
  openHouseEndsAt: "2020-06-12T19:00:00.000Z",
});

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
   * PRD-006c D3 step 5, through 006C-AC-006. The saved campaign's check result comes back with
   * the progress, read under the same tenant context.
   *
   * This is what stops step 5 guessing. The browser used to be the only place the result existed,
   * so a person who signed in again was told their campaign was ready whatever the checks had
   * decided. The read now answers the campaign the stored progress names, and answers it from the
   * row.
   */
  it("reads the saved campaign's check result back with the progress", async () => {
    const draft = await saveDraft(OPEN_HOUSE_DRAFT_INPUT);
    expect(
      (
        await progressPost(
          progressRequest({ progress: { ...VALID_PROGRESS, campaignRef: draft.campaignRef } }),
        )
      ).status,
    ).toBe(200);

    const stored = await readSetupPreferences(
      await principalForSession(session, environment),
      environment,
    );
    expect(stored.campaign?.campaignRef).toBe(draft.campaignRef);
    expect(stored.campaign?.ready).toBe(true);
    expect(stored.campaign?.findings).toEqual([]);
    expect(stored.campaign?.detailHref).toContain(draft.campaignRef);
  });

  /**
   * The branch the defect lived in. An open house that has already finished is the product's own
   * `OPEN_HOUSE_DATES_INVALID`, and what comes back is the sentence a person reads plus the fix,
   * never the rule's own code: PRD-006b D5 puts a code in the campaign page's collapsed support
   * region and the walkthrough panel is not that region.
   */
  it("says a campaign the checks refused is not ready, in words and without a code", async () => {
    const blocked = await saveDraft(FINISHED_OPEN_HOUSE);
    expect(
      (
        await progressPost(
          progressRequest({ progress: { ...VALID_PROGRESS, campaignRef: blocked.campaignRef } }),
        )
      ).status,
    ).toBe(200);

    const stored = await readSetupPreferences(
      await principalForSession(session, environment),
      environment,
    );
    expect(stored.campaign?.ready).toBe(false);
    expect(stored.campaign?.findings.length).toBeGreaterThan(0);
    const [finding] = stored.campaign?.findings ?? [];
    expect(finding?.description).toContain("open-house dates");
    expect(finding?.remediation.length ?? 0).toBeGreaterThan(0);
    expect(JSON.stringify(stored.campaign?.findings)).not.toContain("OPEN_HOUSE");
  });

  /** A reference to a campaign this person cannot read is the honest third answer, not a guess. */
  it("answers no campaign when the stored reference cannot be read", async () => {
    expect(
      (
        await progressPost(
          progressRequest({
            progress: { ...VALID_PROGRESS, campaignRef: "campaign_0000000000000000000000000000" },
          }),
        )
      ).status,
    ).toBe(200);

    const stored = await readSetupPreferences(
      await principalForSession(session, environment),
      environment,
    );
    expect(stored.campaign).toBeUndefined();
  });

  /**
   * PRD-006c D5 and 006C-AC-016. Somebody who can approve, and has no campaign of their own, is
   * given the newest one in their workspace that is waiting for a decision.
   *
   * The creator in the same workspace gets nothing here, which is the other half of the rule: a
   * person who cannot approve has no decision to be handed.
   */
  it("hands an approver with no campaign of their own the one awaiting a decision", async () => {
    const draft = await saveDraft(OPEN_HOUSE_DRAFT_INPUT);
    expect((await progressPost(approverProgressRequest({ progress: VALID_PROGRESS }))).status).toBe(
      200,
    );

    const approverView = await readSetupPreferences(
      await principalForSession(approverSession, environment),
      environment,
    );
    expect(approverView.campaign).toBeUndefined();
    expect(approverView.awaitingDecision?.campaignRef).toBe(draft.campaignRef);
    expect(approverView.awaitingDecision?.ready).toBe(true);

    // The other half of the rule. The creator is in the same workspace and on the same step, and
    // is handed nothing, because they have no decision to make.
    expect((await progressPost(progressRequest({ progress: VALID_PROGRESS }))).status).toBe(200);
    const creatorView = await readSetupPreferences(
      await principalForSession(session, environment),
      environment,
    );
    expect(creatorView.awaitingDecision).toBeUndefined();
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
