import { type AuthenticatedPrincipal, type CampaignWorkspaceReadRecord } from "@oalo/application";
import { ApprovalDecisionSchema } from "@oalo/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ADS_LIBRARY_SAMPLES_FLAG,
  loadAdsLibrary,
} from "../features/ads-library/server/catalog-loader.js";
import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { createTemporaryCampaignStore } from "./campaign-command-test-support.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { readHome, savedBrandFrom, type HomeLibrary, type HomeReadPorts } from "./home-reads.js";
import { sampleEntry, saveLibraryAdDraft } from "./library-ad-test-support.js";

/**
 * PRD-009b 009B-AC-004, 009B-AC-009, and 009B-AC-010, the server read with its inputs supplied.
 *
 * The campaigns are real versions: they are saved through the application layer into a temporary
 * store and read back through the same read repository the page uses, so the manifests, hashes, and
 * checks are the product's own. Where a case needs a campaign somebody has decided on, the stored
 * record is given that decision, which is exactly what the database read returns for one. The
 * Postgres file (`home-reads.postgres.test.ts`) drives the same rules through real rows and the
 * approval route.
 */

const store = createTemporaryCampaignStore("oalo-home-");

afterEach(async () => {
  await store.restore();
});

const APPROVER: AuthenticatedPrincipal = createLocalSyntheticPrincipal({
  role: "campaign_approver",
  actorRef: "principal_homeApprover001",
  actorId: "00000000-0000-4000-8000-000000000861",
});
const CREATOR: AuthenticatedPrincipal = createLocalSyntheticPrincipal();

function environment() {
  return { ...store.env(), [ADS_LIBRARY_SAMPLES_FLAG]: "enabled" };
}

const NOTHING_SAVED = { installationStatuses: [], brand: undefined } as const;

/** What puts the read in review mode, where the database is the store (and the checklist is read). */
const REVIEW_ENVIRONMENT = {
  OALO_ENVIRONMENT: "production",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
  OALO_REVIEW_SURFACE: "authorized",
} as const;

async function save(
  id: string,
  version: number,
  principal: AuthenticatedPrincipal = CREATOR,
  headline?: string,
) {
  return saveLibraryAdDraft({
    principal,
    environment: environment(),
    entry: await sampleEntry(id, version),
    ...(headline === undefined ? {} : { headline }),
  });
}

/** The records as the page reads them, for `principal`, with `change` applied to each one. */
function recordsFor(
  principal: AuthenticatedPrincipal,
  change: (record: CampaignWorkspaceReadRecord) => CampaignWorkspaceReadRecord = (record) => record,
): HomeReadPorts["readCampaigns"] {
  return async (_principal, env) => {
    const adapter = createCampaignPersistenceAdapter(principal, env);
    const records = await adapter.readRepository.listForLocation();
    return { kind: adapter.kind, records: records.map(change) };
  };
}

function decisionOn(record: CampaignWorkspaceReadRecord, decision: "approved" | "rejected") {
  return ApprovalDecisionSchema.parse({
    schemaVersion: 1,
    approvalRef: "approval_homeDecision001",
    locationRef: record.version.locationRef,
    campaignRef: record.version.campaignRef,
    campaignVersionRef: record.version.campaignVersionRef,
    manifestHash: record.version.manifestHash,
    preflightResultHash: record.preflight.resultHash,
    actorRef: "principal_homeApprover001",
    actorKind: "human",
    actorRole: "approver",
    decidedAt: "2026-10-01T12:00:00.000Z",
    ipAuditHash: "e".repeat(64),
    decision,
    snapshot: {
      blueprintId: "library-ad",
      libraryAdId: "sample-first-home",
      libraryAdVersion: 2,
      tallSha256: "a".repeat(64),
      squareSha256: "b".repeat(64),
      creativeVersionRef: `libcreative_${"c".repeat(40)}`,
      copyVersionRef: `libcopy_${"d".repeat(40)}`,
      disclosureVersionRef: `libdisclosure_${"f".repeat(40)}`,
      targetingHash: "1".repeat(64),
      budgetHash: "2".repeat(64),
      datesHash: "3".repeat(64),
    },
  });
}

function ports(overrides: Partial<HomeReadPorts> = {}): HomeReadPorts {
  return {
    readChecklistFacts: () => Promise.resolve(NOTHING_SAVED),
    readCampaigns: recordsFor(CREATOR),
    loadLibrary: (env) => loadAdsLibrary({ environment: env }),
    ...overrides,
  };
}

describe("a brand-new account (009B-AC-001, 009B-AC-004)", () => {
  it("has nothing done, no live campaign, and the topics of the library's active ads", async () => {
    await store.enter();

    const home = await readHome(CREATOR, environment(), ports());

    expect(home.checklist.doneCount).toBe(0);
    expect(home.checklist.items.map((item) => item.state)).toEqual([
      "not_connected",
      "not_connected",
      "not_started",
    ]);
    expect(home.running).toEqual({ rows: [], total: 0 });
    expect(home.topics).toEqual([
      "first-time-buyers",
      "refinance",
      "va-loans",
      "pre-approval",
      "down-payment-help",
    ]);
  });

  it("reads the saved records in review mode and says what they say in the checklist", async () => {
    const home = await readHome(
      CREATOR,
      REVIEW_ENVIRONMENT,
      ports({
        readChecklistFacts: () =>
          Promise.resolve({
            installationStatuses: ["active"],
            brand: { name: "Alex Morgan", nmls: "1234567" },
          }),
        readCampaigns: () => Promise.resolve({ kind: "postgres", records: [] }),
      }),
    );

    expect(home.checklist.items.map((item) => item.state)).toEqual([
      "connected",
      "not_connected",
      "done",
    ]);
    expect(home.checklist.doneCount).toBe(2);
  });

  it("does not look at the database in the local demo, where nothing is saved", async () => {
    await store.enter();
    const readChecklistFacts = vi.fn(() => Promise.resolve(NOTHING_SAVED));

    const home = await readHome(CREATOR, environment(), ports({ readChecklistFacts }));

    expect(readChecklistFacts).not.toHaveBeenCalled();
    expect(home.checklist.doneCount).toBe(0);
  });
});

describe("the library as Home reads it (009C-AC-012)", () => {
  it("offers no topic when the real catalog is empty, as it ships", async () => {
    await store.enter();
    // No samples flag, so only the real catalog loads, and the real catalog starts empty.
    const real = store.env();

    const home = await readHome(CREATOR, real, ports());

    expect(home.topics).toEqual([]);
  });

  it("offers a topic only when it has an ad that is active", async () => {
    await store.enter();
    const entry = (
      id: string,
      topic: "refinance" | "va-loans" | "pre-approval",
      status: "active" | "retired" | "replaced",
    ) => ({
      entry: { id, version: 1, topic, status, name: id.toUpperCase() },
      source: "real" as const,
    });
    const library: HomeLibrary = {
      entries: [
        entry("a", "refinance", "retired"),
        entry("b", "va-loans", "replaced"),
        entry("c", "pre-approval", "active"),
      ],
      find: () => undefined,
      standingOf: () => undefined,
    };

    const home = await readHome(
      CREATOR,
      environment(),
      ports({ loadLibrary: () => Promise.resolve(library) }),
    );

    expect(home.topics).toEqual(["pre-approval"]);
  });
});

describe("Needs your approval (009B-AC-010)", () => {
  it("lists only the campaign that waits for a decision, for an approver", async () => {
    await store.enter();
    const waiting = await save("sample-first-home", 2);
    const needsChanges = await save("sample-loan-review", 1);
    const approved = await save("sample-va-home-loans", 1);
    const sentBack = await save("sample-pre-approval", 1);
    const retired = await save("sample-spring-search", 1);
    const replaced = await save("sample-first-home", 1);
    expect(waiting.preflight.blocking).toBe(false);

    const home = await readHome(
      APPROVER,
      environment(),
      ports({
        readCampaigns: recordsFor(APPROVER, (record) => {
          const ref = record.version.campaignRef;
          if (ref === needsChanges.version.campaignRef) {
            // The checks found something to fix, which is what a blocking result and this state mean.
            return {
              ...record,
              state: "preflight_failed",
              preflight: { ...record.preflight, blocking: true },
            };
          }
          if (ref === approved.version.campaignRef) {
            return {
              ...record,
              state: "approved",
              approval: decisionOn(record, "approved"),
            };
          }
          if (ref === sentBack.version.campaignRef) {
            return { ...record, approval: decisionOn(record, "rejected") };
          }
          return record;
        }),
      }),
    );

    const refs = (home.approval?.rows ?? []).map((row) => row.campaignRef);
    expect(refs).toEqual([waiting.version.campaignRef]);
    expect(refs).not.toContain(needsChanges.version.campaignRef);
    expect(refs).not.toContain(approved.version.campaignRef);
    expect(refs).not.toContain(sentBack.version.campaignRef);
    // Retired and replaced ads: the approval command would refuse both, so nobody is waiting.
    expect(refs).not.toContain(retired.version.campaignRef);
    expect(refs).not.toContain(replaced.version.campaignRef);
    expect(home.approval?.total).toBe(1);
  });

  it("names the campaign after its library ad and says when that ad is a sample", async () => {
    await store.enter();
    await save("sample-first-home", 2);

    const home = await readHome(
      APPROVER,
      environment(),
      ports({ readCampaigns: recordsFor(APPROVER) }),
    );

    expect(home.approval?.rows[0]).toMatchObject({
      name: "Sample: First home, start here",
      sample: true,
      statusLabel: "Ready for approval",
    });
    expect(home.approval?.rows[0]?.href).toMatch(/^\/marketing\/campaigns\/campaign_/u);
  });

  it("does not give a person who cannot approve the card at all", async () => {
    await store.enter();
    await save("sample-first-home", 2);

    const home = await readHome(
      CREATOR,
      environment(),
      ports({ readCampaigns: recordsFor(CREATOR) }),
    );

    expect(home.approval).toBeUndefined();
  });

  it("is an empty list, not a missing one, for an approver with nothing waiting", async () => {
    await store.enter();

    const home = await readHome(
      APPROVER,
      environment(),
      ports({ readCampaigns: recordsFor(APPROVER) }),
    );

    expect(home.approval).toEqual({ rows: [], total: 0 });
  });
});

describe("Running now (009B-AC-009)", () => {
  it("lists a live campaign, which only an injected state can produce in PRD-009", async () => {
    await store.enter();
    const saved = await save("sample-va-home-loans", 1);

    const home = await readHome(
      CREATOR,
      environment(),
      ports({
        readCampaigns: recordsFor(CREATOR, (record) => ({ ...record, state: "live" })),
      }),
    );

    expect(home.running.total).toBe(1);
    expect(home.running.rows[0]).toMatchObject({
      campaignRef: saved.version.campaignRef,
      name: "Sample: Home loans for veterans",
      statusLabel: "With Meta",
    });
  });
});

describe("the saved brand as the checklist reads it (009B-AC-004)", () => {
  const revision = "0b6f4d7a-3f7e-4a9c-8d2c-5d7a1c1f9e01";

  it("reads the name and NMLS number out of the stored, versioned value", () => {
    expect(
      savedBrandFrom([{ value: { revision, value: { name: "Alex Morgan", nmls: "1234567" } } }]),
    ).toEqual({ name: "Alex Morgan", nmls: "1234567" });
  });

  it("finds nothing saved when the person has no brand row", () => {
    expect(savedBrandFrom([])).toBeUndefined();
  });

  it("is not thrown by fields the Brand page adds later", () => {
    expect(
      savedBrandFrom([
        {
          value: {
            revision,
            value: { name: "Alex Morgan", nmls: "", title: "Loan officer", colorPresetId: "navy" },
          },
        },
      ]),
    ).toEqual({ name: "Alex Morgan", nmls: "" });
  });

  it("reports a stored value it cannot read as unreadable, never as nothing saved", () => {
    expect(savedBrandFrom([{ value: { revision, value: { nmls: "1234567" } } }])).toBe(
      "unreadable",
    );
    expect(savedBrandFrom([{ value: "not an object" }])).toBe("unreadable");
    expect(savedBrandFrom([{ value: null }])).toBe("unreadable");
  });
});
