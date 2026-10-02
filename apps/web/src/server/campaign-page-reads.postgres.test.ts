import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as approvePost } from "../app/api/campaigns/approve/route.js";
import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import { ADS_LIBRARY_SAMPLES_FLAG } from "../features/ads-library/server/catalog-loader.js";
import { LIBRARY_AD_SAVE_INPUT, OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import {
  approvalPayload,
  browserRequest,
  closeApprovalSuite,
  createDraftThroughPreflight,
  issueSession,
  openApprovalSuite,
  principalForSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  type ApprovalSuiteFixture,
  type IssuedSession,
  type PersistedDraft,
  type RoutePostgresEnvironment,
} from "./campaign-route-postgres-support.js";
import { listCampaignRows, loadCampaignPage } from "./campaign-workspace-reads.js";
import { compileOpenHouseDraft } from "./open-house-draft.test-support.js";

/**
 * PRD-009e 009E-AC-005 and 009E-AC-012, against a disposable Postgres, under the session's own
 * tenant context.
 *
 * A campaign's versions are read newest first, each with its own check and decision; an older
 * version opens read-only at an address of its own; and a campaign in another location answers
 * exactly as an unknown reference does, for the campaign's own address and for every older
 * version's. A campaign saved before PRD-009 (an open house version, R-6) is listed under its saved
 * headline with the earlier flow as its topic, and its page is read-only.
 */

const environment: RoutePostgresEnvironment = routeEnvironment({
  [ADS_LIBRARY_SAMPLES_FLAG]: "enabled",
});

let suite: ApprovalSuiteFixture;
let creatorSession: IssuedSession;
let approverSession: IssuedSession;
let outsiderSession: IssuedSession;
let csrfServerSecret: Uint8Array;

beforeAll(async () => {
  suite = await openApprovalSuite(environment, "Page reads");
  ({ creatorSession, approverSession, csrfServerSecret } = suite);
  const outsiderLocation = await seedLocation(suite.pool, "Page reads outsider location");
  const outsiderAdmin = await seedActor(suite.pool, outsiderLocation, {
    displayName: "Page reads outsider admin",
    bindingRole: "location_admin",
    sessionRole: "location_admin",
  });
  outsiderSession = await issueSession(suite.pool, outsiderLocation, outsiderAdmin);
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
    body: LIBRARY_AD_SAVE_INPUT,
  });
}

/** Version 2 of a campaign, saved through the same route "Make a new version" posts to. */
async function saveNewVersion(campaignRef: string): Promise<void> {
  const response = await preflightPost(
    browserRequest({
      path: "/api/campaigns/preflight",
      body: {
        ...LIBRARY_AD_SAVE_INPUT,
        campaignRef,
        headline: "Thinking about your first home? Begin here.",
      },
      session: creatorSession,
      csrfServerSecret,
    }),
  );
  expect(response.status).toBe(200);
}

async function readAs(session: IssuedSession, campaignRef: string, versionNo?: number) {
  return loadCampaignPage(
    await principalForSession(session, environment),
    campaignRef,
    versionNo,
    environment,
  );
}

describe("a campaign's versions under the session's own location (009E-AC-005)", () => {
  it("lists every version newest first with its own decision, and the saver as 'you' for the saver", async () => {
    const first = await createDraft();
    // Version 1 is sent back, so it carries a decision of its own.
    const sentBack = await approvePost(
      browserRequest({
        path: "/api/campaigns/approve",
        body: approvalPayload(first, "rejected"),
        session: approverSession,
        csrfServerSecret,
      }),
    );
    expect(sentBack.status).toBe(200);
    await saveNewVersion(first.campaignRef);

    const loaded = await readAs(creatorSession, first.campaignRef);

    expect(loaded?.kind).toBe("page");
    if (loaded?.kind !== "page" || loaded.page.kind !== "library-ad") {
      throw new Error("Expected the library-ad page.");
    }
    const { page } = loaded;
    expect(page.versionNo).toBe(2);
    expect(page.words.headline).toBe("Thinking about your first home? Begin here.");
    expect(page.versions.map((version) => version.versionNo)).toEqual([2, 1]);
    expect(page.versions.map((version) => version.isLatest)).toEqual([true, false]);
    expect(page.versions[1]?.decision).toMatchObject({
      decision: "rejected",
      actorRole: "approver",
      approverDisplayName: "Page reads approver",
    });
    expect(page.versions[0]?.decision).toBeUndefined();
    expect(page.versions.map((version) => version.savedByViewer)).toEqual([true, true]);
    expect(page.versions[1]?.href).toBe(`/marketing/campaigns/${first.campaignRef}/versions/1`);
  });

  it("opens an older version read-only at its own address, with its own words and decision", async () => {
    const first = await createDraft();
    await saveNewVersion(first.campaignRef);

    const loaded = await readAs(approverSession, first.campaignRef, 1);

    expect(loaded?.kind).toBe("page");
    if (loaded?.kind !== "page" || loaded.page.kind !== "library-ad") {
      throw new Error("Expected the library-ad page.");
    }
    expect(loaded.page.versionNo).toBe(1);
    expect(loaded.page.isLatest).toBe(false);
    expect(loaded.page.words.headline).toBe(LIBRARY_AD_SAVE_INPUT.headline);
    expect(loaded.page.approvalControls).toBeUndefined();
    expect(loaded.page.notices).toEqual([]);
    // Saved by somebody else, so the approver is not told it was "by you".
    expect(loaded.page.savedByViewer).toBe(false);
  });

  it("sends the newest version's number to the campaign's own address", async () => {
    const first = await createDraft();
    await saveNewVersion(first.campaignRef);

    expect(await readAs(creatorSession, first.campaignRef, 2)).toEqual({
      kind: "redirect",
      href: `/marketing/campaigns/${first.campaignRef}`,
    });
  });

  it("answers nothing for a version the campaign never had, as for an unknown reference", async () => {
    const first = await createDraft();

    expect(await readAs(creatorSession, first.campaignRef, 7)).toBeUndefined();
    expect(await readAs(creatorSession, "campaign_neverSavedAnywhere001", 1)).toBeUndefined();
    expect(await readAs(creatorSession, "campaign_neverSavedAnywhere001")).toBeUndefined();
  });

  it("answers a request from another location exactly as an unknown reference, for every address", async () => {
    const first = await createDraft();
    await saveNewVersion(first.campaignRef);
    const unknown = await readAs(outsiderSession, "campaign_neverSavedAnywhere001", 1);

    expect(unknown).toBeUndefined();
    expect(await readAs(outsiderSession, first.campaignRef)).toEqual(unknown);
    for (const versionNo of [1, 2, 3]) {
      expect(
        await readAs(outsiderSession, first.campaignRef, versionNo),
        String(versionNo),
      ).toEqual(unknown);
    }
    // The campaign is there for the location that owns it.
    expect((await readAs(creatorSession, first.campaignRef))?.kind).toBe("page");
  });

  it("lists nothing of another location's campaigns", async () => {
    const first = await createDraft();
    const outsider = await listCampaignRows(
      await principalForSession(outsiderSession, environment),
      environment,
    );

    expect(outsider.map((row) => row.campaignRef)).not.toContain(first.campaignRef);
    const own = await listCampaignRows(
      await principalForSession(creatorSession, environment),
      environment,
    );
    expect(own.map((row) => row.campaignRef)).toContain(first.campaignRef);
  });
});

describe("a campaign saved before PRD-009 (009E-AC-012)", () => {
  async function seedEarlierVersion(): Promise<PersistedDraft> {
    const who = await principalForSession(creatorSession, environment);
    const persistence = createCampaignPersistenceAdapter(who, environment);
    const built = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      who,
      environment,
      persistence.versionRepository,
    );
    await persistence.persistDraft(built.version, built.preflight);
    const { campaignRef, campaignVersionRef, manifestHash } = built.version;
    return {
      campaignRef,
      campaignVersionRef,
      manifestHash,
      preflightResultHash: built.preflight.resultHash,
      rowVersion: 1,
    };
  }

  it("lists under its saved headline, with the earlier flow as its topic and no property", async () => {
    const earlier = await seedEarlierVersion();

    const rows = await listCampaignRows(
      await principalForSession(creatorSession, environment),
      environment,
    );

    const row = rows.find((candidate) => candidate.campaignRef === earlier.campaignRef);
    expect(row).toMatchObject({
      name: "Tour this home this weekend",
      topic: undefined,
      earlierFlow: true,
      thumbnail: undefined,
      sample: false,
      startsOn: undefined,
      endsOn: undefined,
    });
    expect(JSON.stringify(row)).not.toContain("123 Main Street");
    expect(JSON.stringify(row)).not.toContain("Jordan Smith");
  });

  it("opens read-only with its saved words and decisions, and no property field", async () => {
    const earlier = await seedEarlierVersion();

    const loaded = await readAs(creatorSession, earlier.campaignRef);

    expect(loaded?.kind).toBe("page");
    if (loaded?.kind !== "page") return;
    expect(loaded.page.kind).toBe("earlier-flow");
    if (loaded.page.kind !== "earlier-flow") return;
    expect(loaded.page.headline).toBe("Tour this home this weekend");
    expect(loaded.page.versions).toHaveLength(1);
    expect(JSON.stringify(loaded.page)).not.toContain("123 Main Street");
    expect(JSON.stringify(loaded.page)).not.toContain("Jordan Smith");
    expect(loaded.page).not.toHaveProperty("approvalControls");
    expect(loaded.page).not.toHaveProperty("makeNewVersionHref");
  });
});
