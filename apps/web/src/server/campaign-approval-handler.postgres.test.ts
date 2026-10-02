import { createSessionBoundCsrfToken } from "@oalo/auth";
import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as approvePost } from "../app/api/campaigns/approve/route.js";
import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import { ADS_LIBRARY_SAMPLES_FLAG } from "../features/ads-library/server/catalog-loader.js";
import { OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import {
  approvalPayload,
  browserRequest,
  closeApprovalSuite,
  createDraftThroughPreflight,
  grantBinding,
  issueSession,
  openApprovalSuite,
  principalForSession,
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
import {
  libraryAdApprovalPayload,
  sampleEntry,
  saveLibraryAdDraft,
  type SavedLibraryAdDraft,
} from "./library-ad-test-support.js";

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

// PRD-009c D3. A local route run with the sample flag, so the library-ad cases below can build on
// and approve the labelled sample ads; an open house approval never consults the catalog.
const environment: RoutePostgresEnvironment = routeEnvironment({
  [ADS_LIBRARY_SAMPLES_FLAG]: "enabled",
});

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
      "a forged CSRF token",
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

  /**
   * 005A-AC-004. The token here is real: the deployment's own server secret over a second live
   * session, the creator's. The forged token above proves the HMAC is verified; this proves the
   * session identifier inside the token is verified against the session in the cookie, which is
   * the only thing that makes the binding worth having.
   */
  it("refuses a CSRF token bound to a different live session and writes nothing", async () => {
    const draft = await createDraft();
    const otherSessionToken = createSessionBoundCsrfToken({
      serverSecret: csrfServerSecret,
      sessionId: creatorSession.sessionRef,
    });
    const before = await tableCounts();

    const response = await approvePost(
      approvalRequest(approverSession, approvalBody(draft), { csrfToken: otherSessionToken }),
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

/**
 * PRD-009c D4 and D5, 009C-AC-007 and the route half of 009C-AC-008, against a disposable Postgres.
 *
 * A library-ad version is saved through the application layer (the builder, `createCampaignVersion`,
 * the library-ad ruleset, and the persistence adapter, exactly what 009d's save composes) and
 * approved through the exported route. Its approval binds that version's manifest hash, so a version
 * that differs in its words, its library ad version, an art digest, or a brand value has a different
 * hash and is not covered. A version whose ad is retired, replaced, missing, or whose art changed is
 * refused with 409 and writes nothing.
 */
describe("POST /api/campaigns/approve with a library-ad version", () => {
  async function saveDraft(
    entryId: string,
    entryVersion: number,
    overrides: Readonly<{ headline?: string; brandName?: string; tallSha256?: string }> = {},
  ): Promise<SavedLibraryAdDraft> {
    const entry = await sampleEntry(entryId, entryVersion);
    return saveLibraryAdDraft({
      principal: await principalForSession(creatorSession, environment),
      environment,
      entry:
        overrides.tallSha256 === undefined
          ? entry
          : {
              ...entry,
              images: {
                ...entry.images,
                tall: { ...entry.images.tall, sha256: overrides.tallSha256 },
              },
            },
      ...(overrides.headline === undefined ? {} : { headline: overrides.headline }),
      ...(overrides.brandName === undefined ? {} : { brandName: overrides.brandName }),
    });
  }

  async function storedRecord(campaignRef: string) {
    const adapter = createCampaignPersistenceAdapter(
      await principalForSession(approverSession, environment),
      environment,
    );
    return adapter.readRepository.getByCampaignRef(campaignRef);
  }

  it("binds the approval to the exact ad version, art, words, and brand (009C-AC-007)", async () => {
    const first = await saveDraft("sample-first-home", 2);
    expect(first.preflight.blocking).toBe(false);

    const response = await approvePost(
      approvalRequest(approverSession, libraryAdApprovalPayload(first)),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { state: string; manifestHash: string };
    expect(body.state).toBe("approved");
    expect(body.manifestHash).toBe(first.version.manifestHash);

    const approved = await storedRecord(first.version.campaignRef);
    expect(approved?.state).toBe("approved");
    const decision = approved?.approval;
    expect(decision?.manifestHash).toBe(first.version.manifestHash);
    expect(decision?.snapshot).toMatchObject({
      blueprintId: "library-ad",
      libraryAdId: "sample-first-home",
      libraryAdVersion: 2,
    });

    const variants: ReadonlyArray<readonly [string, SavedLibraryAdDraft]> = [
      [
        "different words",
        await saveDraft("sample-first-home", 2, { headline: "A first home starts with a plan." }),
      ],
      ["a different library ad version", await saveDraft("sample-first-home", 1)],
      [
        "a different art digest",
        await saveDraft("sample-first-home", 2, { tallSha256: "9".repeat(64) }),
      ],
      [
        "different brand values",
        await saveDraft("sample-first-home", 2, { brandName: "Alex M. Morgan" }),
      ],
    ];
    for (const [label, variant] of variants) {
      expect(variant.version.manifestHash, label).not.toBe(first.version.manifestHash);
      // An approval covers one campaign version and its manifest hash, and nothing else.
      expect(decision?.campaignVersionRef, label).not.toBe(variant.version.campaignVersionRef);
      expect(decision?.manifestHash, label).not.toBe(variant.version.manifestHash);
      const record = await storedRecord(variant.version.campaignRef);
      expect(record?.state, label).toBe("awaiting_approval");
      expect(record?.approval, label).toBeUndefined();
    }
  });

  it.each([
    ["a retired ad", "sample-spring-search", 1, {}, "LIBRARY_AD_RETIRED"],
    ["a replaced version", "sample-first-home", 1, {}, "LIBRARY_AD_REPLACED"],
    [
      "changed art",
      "sample-first-home",
      2,
      { tallSha256: "9".repeat(64) },
      "LIBRARY_AD_ART_CHANGED",
    ],
  ] as const)(
    "refuses %s with 409 and writes nothing (009C-AC-008)",
    async (_label, entryId, entryVersion, overrides, code) => {
      const draft = await saveDraft(entryId, entryVersion, overrides);
      const before = await tableCounts();

      const response = await approvePost(
        approvalRequest(approverSession, libraryAdApprovalPayload(draft)),
      );

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({ error: code });
      expect(await tableCounts()).toEqual(before);
      expect((await storedRecord(draft.version.campaignRef))?.approval).toBeUndefined();
    },
  );

  it("refuses a version whose ad the catalog does not hold, and writes nothing (009C-AC-008)", async () => {
    const draft = await saveDraft("sample-first-home", 2);
    const before = await tableCounts();
    const previous = process.env[ADS_LIBRARY_SAMPLES_FLAG];
    // Without the flag the route loads the real catalog alone, as a deployment does, and a version
    // built on a sample ad is not in it.
    delete process.env[ADS_LIBRARY_SAMPLES_FLAG];
    try {
      const response = await approvePost(
        approvalRequest(approverSession, libraryAdApprovalPayload(draft)),
      );
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({ error: "LIBRARY_AD_MISSING" });
    } finally {
      if (previous !== undefined) process.env[ADS_LIBRARY_SAMPLES_FLAG] = previous;
    }
    expect(await tableCounts()).toEqual(before);
  });
});
