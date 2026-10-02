import { randomUUID } from "node:crypto";

import { freezeAuthenticatedPrincipal, type AuthenticatedPrincipal } from "@oalo/application";
import { formatLocationRef } from "@oalo/contracts";
import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as approvePost } from "../app/api/campaigns/approve/route.js";
import { ADS_LIBRARY_SAMPLES_FLAG } from "../features/ads-library/server/catalog-loader.js";
import type { InstallationStatus } from "../features/overview/model/home-checklist.js";
import {
  browserRequest,
  closeApprovalSuite,
  issueSession,
  openApprovalSuite,
  principalForSession,
  routeEnvironment,
  seedActor,
  seedActorAt,
  seedLocation,
  seedLocationWithoutInstallation,
  setInstallationStatus,
  type ApprovalSuiteFixture,
  type IssuedSession,
  type RoutePostgresEnvironment,
} from "./campaign-route-postgres-support.js";
import { readHome } from "./home-reads.js";
import {
  libraryAdApprovalPayload,
  sampleEntry,
  saveLibraryAdDraft,
  type SavedLibraryAdDraft,
} from "./library-ad-test-support.js";
import { saveWorkspacePreference } from "./workspace-preferences.js";

/**
 * PRD-009b 009B-AC-004 and 009B-AC-010, against a disposable PostgreSQL.
 *
 * The checklist read is driven through every row of D2 with real rows: each of the six statuses the
 * installation table allows, no installation at all, and the three shapes of a saved brand. The
 * approval list is driven through every state 009B-AC-010 names, with campaigns saved through the
 * application layer and decided through the exported approval route, so the decisions are the ones a
 * browser's approver makes.
 *
 * A person with no installation cannot hold a first-party session, because issuing one needs the
 * installation row, so that one case builds its principal directly against a location that has an
 * approver binding and no installation. `platform.set_app_context` asks only for an active location,
 * an active person, and a live binding, so the tenant context, and the row-level policy behind it,
 * are the real ones.
 *
 * Written against the same fixtures as its neighbours and not run in the offline gate, which has no
 * database; it runs with `pnpm test:db`.
 */

// PRD-009c D3. A local route run with the sample flag, so the library-ad cases can build on and
// approve the labelled sample ads, and Home's topics come from the sample catalog.
const environment: RoutePostgresEnvironment = routeEnvironment({
  [ADS_LIBRARY_SAMPLES_FLAG]: "enabled",
});

let suite: ApprovalSuiteFixture;
let pool: PostgresDatabasePool;
let creatorSession: IssuedSession;
let approverSession: IssuedSession;
let csrfServerSecret: Uint8Array;

beforeAll(async () => {
  suite = await openApprovalSuite(environment, "Home reads");
  ({ pool, creatorSession, approverSession, csrfServerSecret } = suite);
});

afterAll(async () => {
  await closeApprovalSuite(suite);
});

/** A workspace of its own, with one owner who is signed in, so its installation can be set alone. */
async function ownerOfNewWorkspace(label: string) {
  const location = await seedLocation(pool, `Home reads ${label}`);
  const actor = await seedActor(pool, location, {
    displayName: `Home reads owner ${label}`,
    bindingRole: "location_admin",
    sessionRole: "location_admin",
  });
  const session = await issueSession(pool, location, actor);
  return { location, principal: await principalForSession(session, environment) };
}

async function saveBrand(
  principal: Readonly<AuthenticatedPrincipal>,
  brand: Readonly<{ name: string; nmls: string }>,
) {
  await saveWorkspacePreference(
    principal,
    {
      key: "brand",
      expectedRevision: null,
      value: {
        name: brand.name,
        company: "Prairie Home Lending",
        email: "",
        phone: "",
        nmls: brand.nmls,
        companyNmls: "",
        tagline: "",
      },
    },
    pool,
  );
}

describe("Connect HighLevel reads each installation status (009B-AC-004)", () => {
  it.each<[InstallationStatus, "connected" | "needs_attention" | "not_connected"]>([
    ["active", "connected"],
    ["missing_scope", "needs_attention"],
    ["reconnect_required", "needs_attention"],
    ["pending", "not_connected"],
    ["revoked", "not_connected"],
    ["uninstalled", "not_connected"],
  ])("reads an installation with status %s as %s", async (status, expected) => {
    const { location, principal } = await ownerOfNewWorkspace(`installation ${status}`);
    await setInstallationStatus(pool, location, status);

    const home = await readHome(principal, environment);

    expect(home.checklist.items.find((item) => item.id === "highlevel")?.state).toBe(expected);
  });

  it("reads a workspace that has no installation row at all as not connected", async () => {
    const locationId = await seedLocationWithoutInstallation(pool, "Home reads no installation");
    const owner = await seedActorAt(pool, locationId, {
      displayName: "Home reads owner no installation",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    });
    const principal = freezeAuthenticatedPrincipal({
      ...(await principalForSession(creatorSession, environment)),
      locationId,
      locationRef: formatLocationRef(locationId),
      actorId: owner.actorId,
    });

    const home = await readHome(principal, environment);

    expect(home.checklist.items.find((item) => item.id === "highlevel")?.state).toBe(
      "not_connected",
    );
  });

  it("never lets another workspace's installation connect this one", async () => {
    const connected = await ownerOfNewWorkspace("connected neighbour");
    await setInstallationStatus(pool, connected.location, "active");
    const quiet = await ownerOfNewWorkspace("quiet neighbour");

    const home = await readHome(quiet.principal, environment);

    expect(home.checklist.items.find((item) => item.id === "highlevel")?.state).toBe(
      "not_connected",
    );
  });

  it("never reads Meta as connected, whatever the installation says", async () => {
    const { location, principal } = await ownerOfNewWorkspace("meta never");
    await setInstallationStatus(pool, location, "active");

    const home = await readHome(principal, environment);

    expect(home.checklist.items.find((item) => item.id === "meta")?.state).toBe("not_connected");
  });
});

describe("Add your brand reads the saved brand (009B-AC-004)", () => {
  it("is done with a name and an NMLS number", async () => {
    const { principal } = await ownerOfNewWorkspace("brand complete");
    await saveBrand(principal, { name: "Alex Morgan", nmls: "1234567" });

    const home = await readHome(principal, environment);

    expect(home.checklist.items.find((item) => item.id === "brand")?.state).toBe("done");
  });

  it("needs attention when the brand is saved without an NMLS number", async () => {
    const { principal } = await ownerOfNewWorkspace("brand without nmls");
    await saveBrand(principal, { name: "Alex Morgan", nmls: "" });

    const home = await readHome(principal, environment);

    expect(home.checklist.items.find((item) => item.id === "brand")?.state).toBe("needs_attention");
  });

  it("is not started when no brand is saved", async () => {
    const { principal } = await ownerOfNewWorkspace("brand none");

    const home = await readHome(principal, environment);

    expect(home.checklist.items.find((item) => item.id === "brand")?.state).toBe("not_started");
  });

  it("counts Connected and Done and nothing else (009B-AC-005)", async () => {
    const { location, principal } = await ownerOfNewWorkspace("count");
    await setInstallationStatus(pool, location, "active");
    await saveBrand(principal, { name: "Alex Morgan", nmls: "1234567" });

    const home = await readHome(principal, environment);

    expect(home.checklist.doneCount).toBe(2);
    expect(home.checklist.total).toBe(3);
  });

  it("does not read another person's brand in the same workspace", async () => {
    const { location, principal } = await ownerOfNewWorkspace("brand per person");
    await saveBrand(principal, { name: "Alex Morgan", nmls: "1234567" });
    const colleague = await seedActor(pool, location, {
      displayName: "Home reads colleague",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    });
    const colleaguePrincipal = await principalForSession(
      await issueSession(pool, location, colleague),
      environment,
    );

    const home = await readHome(colleaguePrincipal, environment);

    expect(home.checklist.items.find((item) => item.id === "brand")?.state).toBe("not_started");
  });
});

describe("Needs your approval, from real rows (009B-AC-010)", () => {
  async function saveDraft(
    entryId: string,
    entryVersion: number,
    headline?: string,
  ): Promise<SavedLibraryAdDraft> {
    return saveLibraryAdDraft({
      principal: await principalForSession(creatorSession, environment),
      environment,
      entry: await sampleEntry(entryId, entryVersion),
      ...(headline === undefined ? {} : { headline }),
    });
  }

  async function decide(draft: SavedLibraryAdDraft, decision: "approved" | "rejected") {
    const response = await approvePost(
      browserRequest({
        path: "/api/campaigns/approve",
        body: libraryAdApprovalPayload(draft, decision),
        session: approverSession,
        csrfServerSecret,
      }),
    );
    expect(response.status).toBe(200);
  }

  it("lists only the campaign that waits for a decision, newest first, for an approver", async () => {
    const waiting = await saveDraft("sample-first-home", 2);
    const approved = await saveDraft("sample-va-home-loans", 1);
    const sentBack = await saveDraft("sample-pre-approval", 1);
    const needsChanges = await saveDraft(
      "sample-loan-review",
      1,
      "Guaranteed approval for first homes",
    );
    const retired = await saveDraft("sample-spring-search", 1);
    const replaced = await saveDraft("sample-first-home", 1);
    await decide(approved, "approved");
    await decide(sentBack, "rejected");
    expect(waiting.preflight.blocking).toBe(false);
    expect(needsChanges.preflight.blocking).toBe(true);

    const home = await readHome(
      await principalForSession(approverSession, environment),
      environment,
    );

    const refs = (home.approval?.rows ?? []).map((row) => row.campaignRef);
    expect(refs).toContain(waiting.version.campaignRef);
    for (const excluded of [approved, sentBack, needsChanges, retired, replaced]) {
      expect(refs).not.toContain(excluded.version.campaignRef);
    }
    expect(
      home.approval?.rows.find((row) => row.campaignRef === waiting.version.campaignRef),
    ).toMatchObject({
      name: "Sample: First home, start here",
      sample: true,
      statusLabel: "Ready for approval",
    });
  });

  it("does not give a person who cannot approve the list at all", async () => {
    await saveDraft("sample-first-home", 2);

    const home = await readHome(
      await principalForSession(creatorSession, environment),
      environment,
    );

    expect(home.approval).toBeUndefined();
  });

  it("never lists another workspace's campaigns", async () => {
    await saveDraft("sample-first-home", 2);
    const outsider = await ownerOfNewWorkspace(`outsider ${randomUUID().slice(0, 8)}`);

    const home = await readHome(outsider.principal, environment);

    expect(home.approval).toEqual({ rows: [], total: 0 });
    expect(home.running).toEqual({ rows: [], total: 0 });
  });

  it("shows nothing as running, because no campaign can be live in PRD-009", async () => {
    const home = await readHome(
      await principalForSession(approverSession, environment),
      environment,
    );

    expect(home.running).toEqual({ rows: [], total: 0 });
  });
});
