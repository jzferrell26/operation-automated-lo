import { createCampaignVersion, runCampaignPreflight } from "@oalo/application";
import type { SqlScalar } from "@oalo/db";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { POST as approvePost } from "../app/api/campaigns/approve/route.js";
import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import { POST as preferencesPost } from "../app/api/workspace/preferences/route.js";
import { buildLibraryAdManifest } from "../features/ads-library/server/library-ad-manifest.js";
import {
  libraryAdPreflightRules,
  libraryAdRuleContext,
} from "../features/ads-library/server/library-ad-ruleset.js";
import { DEFAULT_AD_BRAND } from "../features/workspace/ad-brand.js";
import { WorkspacePreferencesSchema } from "../features/workspace/model.js";
import { LIBRARY_AD_SAVE_INPUT, SAVED_TEST_BRAND } from "./campaign-command-test-support.js";
import {
  createCampaignPersistenceAdapter,
  resetCampaignDatabasePoolForTests,
} from "./campaign-persistence-runtime.js";
import {
  applyRouteEnvironment,
  approvalPayload,
  browserRequest,
  createRouteTestPool,
  csrfSecretFor,
  currentRowVersion,
  issueSession,
  principalForSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  tableCountsFor,
  type IssuedSession,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";
import { libraryAdManifestInput, sampleEntry } from "./library-ad-test-support.js";
import { withMigrationOwnerTransaction } from "../../../../packages/db/test/route-seeding-bridge.js";

/**
 * PRD-009d "Save and check" and the Brand fields, against a disposable Postgres through the exported
 * route handlers, with the headers a browser sends:
 *
 * - 009D-AC-003: the four ad Brand fields save beside the report brand, which is unchanged;
 * - 009D-AC-008: every refused place is a 400, and a stored version carrying one is refused by the
 *   extended `TARGETING_NOT_ALLOWED`;
 * - 009D-AC-010: each D5 rule makes a version need changes, naming the Brand field when the finding
 *   is in Brand text;
 * - 009D-AC-011: the bounded, strict save, the catalog resolution, and the cross-workspace refusal;
 * - 009D-AC-020: a new version appends N+1 to the same campaign and the earlier approval does not
 *   carry over;
 * - 009D-AC-021: the brand reference follows the saved brand, and the partner reference is fixed;
 * - 009D-AC-024: the brand is read from saved Brand, and a request carrying any of it is a 400.
 */

const environment = routeEnvironment();
const pool = createRouteTestPool();
let location: SeededLocation;
let owner: IssuedSession;
let fresh: IssuedSession;
let outsider: IssuedSession;
let csrf: Uint8Array;
let restore: () => void;

const PartnerBrand = Object.freeze({
  items: [
    {
      id: "6f2b0a64-7c4e-4f53-9e3e-1b1b8a0d4c11",
      name: "Priya Nadeem",
      company: "Oakline Realty",
      email: "",
      phone: "",
    },
  ],
});

const SavedBody = z
  .object({
    campaignRef: z.string(),
    campaignVersionRef: z.string(),
    versionNo: z.number(),
    state: z.string(),
    blocking: z.boolean(),
    findings: z.array(
      z
        .object({
          ruleCode: z.string(),
          severity: z.enum(["blocking", "warning"]),
          description: z.string(),
          affected: z.string(),
          remediation: z.string(),
        })
        .strict(),
    ),
  })
  .passthrough();

function save(session: IssuedSession, body: unknown) {
  return preflightPost(
    browserRequest({ path: "/api/campaigns/preflight", body, session, csrfServerSecret: csrf }),
  );
}

async function saved(session: IssuedSession, body: unknown) {
  const response = await save(session, body);
  expect(response.status).toBe(200);
  return SavedBody.parse(await response.json());
}

async function savePreference(session: IssuedSession, key: string, value: unknown) {
  const read = await preferencesPost(
    browserRequest({
      path: "/api/workspace/preferences",
      body: { key, expectedRevision: await revisionOf(session, key), value },
      session,
      csrfServerSecret: csrf,
    }),
  );
  return read;
}

async function revisionOf(session: IssuedSession, key: string): Promise<string | null> {
  const principal = await principalForSession(session, environment);
  const rows = await fixtureQuery(
    "select value->>'revision' as revision from platform.user_preferences where location_id=$1::uuid and user_id=$2::uuid and key=$3",
    [principal.locationId, principal.actorId, `workspace.${key}.v1`],
  );
  const revision = rows[0]?.["revision"];
  return typeof revision === "string" ? revision : null;
}

async function fixtureQuery(text: string, values: readonly SqlScalar[] = []) {
  return withMigrationOwnerTransaction(
    pool,
    async (connection) =>
      (
        await connection.execute({
          statementName: "library-ad-save.fixture",
          text,
          values,
          preparedStatementMode: "unnamed",
        })
      ).rows as Record<string, unknown>[],
  );
}

async function storedVersion(session: IssuedSession, campaignRef: string) {
  const principal = await principalForSession(session, environment);
  const record = await createCampaignPersistenceAdapter(
    principal,
    environment,
  ).readRepository.getByCampaignRef(campaignRef);
  if (record === undefined) throw new Error(`No stored campaign ${campaignRef}`);
  return record;
}

/**
 * Stores one library-ad version through the application layer and the persistence adapter, the way
 * the save does, for the two cases the route cannot reach by design: a stored place outside the
 * rules, and an ad that was retired before the check ran.
 */
async function persistThroughTheApplication(
  label: string,
  entry: Awaited<ReturnType<typeof sampleEntry>>,
  places?: Readonly<{ states: readonly string[]; cities: readonly string[] }>,
) {
  const principal = await principalForSession(owner, environment);
  const adapter = createCampaignPersistenceAdapter(principal, environment);
  const input = libraryAdManifestInput(entry);
  const createdAt = new Date();
  const suffix = createdAt.getTime().toString(16);
  const version = await createCampaignVersion(
    {
      createdAt,
      version: {
        schemaVersion: 1,
        locationRef: principal.locationRef,
        campaignRef: `campaign_${label}${suffix}`,
        campaignVersionRef: `campaignversion_${label}${suffix}`,
        inputVersions: {
          blueprintVersionRef: "blueprint_libraryAd001",
          brandProfileVersionRef: "brandprofile_local001",
          complianceProfileVersionRef: "complianceprofile_local001",
          partnerProfileVersionRef: "partnerprofile_none001",
          routingProfileVersionRef: "routingprofile_local001",
          rulesetVersionRef: "ruleset_libraryAd001",
        },
        manifest: buildLibraryAdManifest(places === undefined ? input : { ...input, places }),
        createdBy: principal.actorRef,
      },
    },
    adapter.versionRepository,
  );
  const preflight = runCampaignPreflight(
    version,
    libraryAdPreflightRules(createdAt, libraryAdRuleContext(entry, [])),
  );
  await adapter.persistDraft(version, preflight);
  return storedVersion(owner, version.campaignRef);
}

/**
 * Saves the owner's ad brand and report brand: the test brand, with `change` and `report` laid
 * over it. `brandWith({})` is the clean brand every other test assumes.
 */
async function brandWith(change: Record<string, string>, report: Record<string, string> = {}) {
  expect(
    (
      await savePreference(owner, "ad_brand", {
        title: "Loan officer",
        colorPresetId: "forest",
        disclosureLine: "Equal Housing Opportunity.",
        leadFormWording: DEFAULT_AD_BRAND.leadFormWording,
        ...change,
      })
    ).status,
  ).toBe(200);
  expect((await savePreference(owner, "brand", { ...SAVED_TEST_BRAND, ...report })).status).toBe(
    200,
  );
}

beforeAll(async () => {
  restore = applyRouteEnvironment(environment);
  csrf = csrfSecretFor(environment);
  location = await seedLocation(pool, "Launch an ad save location");
  const other = await seedLocation(pool, "Launch an ad outsider location");
  owner = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "Launch owner",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  fresh = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "Launch creator with no brand",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    }),
  );
  outsider = await issueSession(
    pool,
    other,
    await seedActor(pool, other, {
      displayName: "Launch outsider",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  expect((await savePreference(owner, "brand", SAVED_TEST_BRAND)).status).toBe(200);
  expect((await savePreference(owner, "partners", PartnerBrand)).status).toBe(200);
  expect((await savePreference(outsider, "brand", SAVED_TEST_BRAND)).status).toBe(200);
});

afterAll(async () => {
  await resetCampaignDatabasePoolForTests();
  await pool.close();
  restore();
});

describe.sequential("the ad Brand fields (009D-AC-003)", () => {
  it("saves the four fields under their own key beside the report brand, which is unchanged", async () => {
    const adBrand = {
      title: "Loan officer",
      colorPresetId: "forest",
      disclosureLine: "Equal Housing Opportunity.",
      leadFormWording: DEFAULT_AD_BRAND.leadFormWording,
    };
    const response = await savePreference(owner, "ad_brand", adBrand);
    expect(response.status).toBe(200);
    const preferences = z
      .object({ preferences: WorkspacePreferencesSchema })
      .parse(await response.json()).preferences;
    expect(preferences.adBrand?.value).toEqual(adBrand);
    expect(preferences.brand?.value).toEqual(SAVED_TEST_BRAND);
    expect(Object.keys(preferences.brand?.value ?? {}).sort()).toEqual(
      ["company", "companyNmls", "email", "name", "nmls", "phone", "tagline"].sort(),
    );
    const principal = await principalForSession(owner, environment);
    const keys = await fixtureQuery(
      "select key from platform.user_preferences where location_id=$1::uuid and user_id=$2::uuid order by key",
      [principal.locationId, principal.actorId],
    );
    expect(keys.map((row) => row["key"])).toContain("workspace.ad_brand.v1");
    expect(keys.map((row) => row["key"])).toContain("workspace.brand.v1");
  });

  it.each([
    ["a title over 60", { title: "t".repeat(61) }],
    ["a disclosure line over 120", { disclosureLine: "d".repeat(121) }],
    ["lead form wording over 300", { leadFormWording: "w".repeat(301) }],
    ["a colour that is not a preset", { colorPresetId: "red" }],
    ["a logo", { logo: "logo.png" }],
  ])("refuses %s (009D-AC-024)", async (_label, change) => {
    const response = await savePreference(fresh, "ad_brand", { ...DEFAULT_AD_BRAND, ...change });
    expect(response.status).toBe(400);
  });
});

describe.sequential("Save and check, bounded and strict (009D-AC-011, 024)", () => {
  it("saves the chosen ad with the saved Brand frozen into it", async () => {
    const body = await saved(owner, LIBRARY_AD_SAVE_INPUT);
    expect(body.state).toBe("awaiting_approval");
    const record = await storedVersion(owner, body.campaignRef);
    const manifest = record.version.manifest;
    if (manifest.blueprintId !== "library-ad") throw new Error("Not a library-ad version");
    expect(manifest.advertiser).toEqual({
      name: SAVED_TEST_BRAND.name,
      title: "Loan officer",
      company: SAVED_TEST_BRAND.company,
      nmls: SAVED_TEST_BRAND.nmls,
      companyNmls: SAVED_TEST_BRAND.companyNmls,
      colorPresetId: "forest",
    });
    expect(manifest.content.disclosureText).toBe("Equal Housing Opportunity.");
    expect(manifest.content.consentText).toBe(DEFAULT_AD_BRAND.leadFormWording);
    expect(record.version.inputVersions.partnerProfileVersionRef).toBe("partnerprofile_none001");
    expect(record.version.inputVersions.brandProfileVersionRef).toMatch(
      /^brandprofile_[0-9a-f]{40}$/u,
    );
  });

  it.each([
    ["the brand", { brand: { name: "Someone Else" } }],
    ["a name", { name: "Someone Else" }],
    ["a title", { title: "Realtor" }],
    ["a company", { company: "Oakline Realty" }],
    ["an NMLS number", { nmls: "7654321" }],
    ["a colour", { colorPresetId: "plum" }],
    ["a disclosure", { disclosureText: "None" }],
    ["a consent", { consentText: "None" }],
    ["lead form wording", { leadFormWording: "None" }],
    ["a headline over 120", { headline: "h".repeat(121) }],
    ["primary text over 600", { primaryText: "p".repeat(601) }],
    ["an unknown field", { surprise: true }],
  ])("refuses a request carrying %s with 400 and stores nothing", async (_label, change) => {
    const before = await tableCountsFor(pool, location.locationId);
    expect((await save(owner, { ...LIBRARY_AD_SAVE_INPUT, ...change })).status).toBe(400);
    expect(await tableCountsFor(pool, location.locationId)).toEqual(before);
  });

  it.each([
    ["an unknown ad", { adId: "not-in-the-library", adVersion: 1 }],
    ["a replaced version", { adId: "sample-first-home", adVersion: 1 }],
    ["a retired ad", { adId: "sample-spring-search", adVersion: 1 }],
  ])("refuses %s with 400 and stores nothing", async (_label, ad) => {
    const before = await tableCountsFor(pool, location.locationId);
    const response = await save(owner, { ...LIBRARY_AD_SAVE_INPUT, ...ad });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "LIBRARY_AD_NOT_AVAILABLE" });
    expect(await tableCountsFor(pool, location.locationId)).toEqual(before);
  });

  it("answers a campaign of another workspace exactly as an unknown one", async () => {
    const theirs = await saved(outsider, LIBRARY_AD_SAVE_INPUT);
    const before = await tableCountsFor(pool, location.locationId);
    const foreign = await save(owner, {
      ...LIBRARY_AD_SAVE_INPUT,
      campaignRef: theirs.campaignRef,
    });
    const unknown = await save(owner, {
      ...LIBRARY_AD_SAVE_INPUT,
      campaignRef: "campaign_00000000000000000000000000000000",
    });
    expect(foreign.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(await foreign.json()).toEqual(await unknown.json());
    expect(await tableCountsFor(pool, location.locationId)).toEqual(before);
  });

  it("refuses a body larger than the bound with 413", async () => {
    const response = await save(owner, {
      ...LIBRARY_AD_SAVE_INPUT,
      primaryText: "p".repeat(20_000),
    });
    expect(response.status).toBe(413);
  });
});

describe.sequential("where it shows (009D-AC-008)", () => {
  it.each([
    "78701",
    "Austin 78701",
    "10 miles around Austin",
    "within 5 miles",
    "women 25-40",
    "men",
    "Austin",
    "Austin, ZZ",
  ])("refuses %j with 400 and stores nothing", async (place) => {
    const before = await tableCountsFor(pool, location.locationId);
    expect((await save(owner, { ...LIBRARY_AD_SAVE_INPUT, places: [place] })).status).toBe(400);
    expect(await tableCountsFor(pool, location.locationId)).toEqual(before);
  });

  it("refuses a stored version carrying a place outside the rules with TARGETING_NOT_ALLOWED", async () => {
    const record = await persistThroughTheApplication(
      "targeting",
      await sampleEntry("sample-first-home", 2),
      { states: [], cities: ["Women, TX"] },
    );
    expect(record.state).toBe("preflight_failed");
    expect(record.preflight.findings.map((finding) => finding.ruleCode)).toEqual([
      "TARGETING_NOT_ALLOWED",
    ]);
  });
});

describe.sequential("each D5 rule makes a version need changes (009D-AC-010)", () => {
  // A case that changes the brand puts it back even when it fails, so a failure here cannot leave
  // a blank NMLS number or a bad disclosure line behind for the suites that run after it.
  afterEach(async () => {
    await brandWith({});
  });

  it.each([
    ["WORDS_TOO_LONG", { headline: "h".repeat(61) }, "content.headline"],
    ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", { headline: "Ask about low rates" }, "content.headline"],
    ["WORDS_INVALID_CHARACTERS", { headline: "Your <first> home" }, "content.headline"],
    ["WORDS_NUMBER", { headline: "Your 1st home" }, "content.headline"],
    ["WORDS_CO_BRAND", { primaryText: "Ask my Realtor about it." }, "content.body"],
    ["WORDS_PRIVATE_INFO_REQUEST", { primaryText: "Send me your SSN." }, "content.body"],
    ["WORDS_CO_BRAND", { primaryText: "Priya Nadeem and I can help." }, "content.body"],
  ])("%s in the words", async (code, change, affected) => {
    await brandWith({});
    const body = await saved(owner, { ...LIBRARY_AD_SAVE_INPUT, ...change });
    expect(body.state).toBe("preflight_failed");
    expect(body.findings).toContainEqual(expect.objectContaining({ ruleCode: code, affected }));
  });

  it("RUN_DATES_INVALID for an end date that is today", async () => {
    await brandWith({});
    const today = new Date().toISOString().slice(0, 10);
    const body = await saved(owner, { ...LIBRARY_AD_SAVE_INPUT, endsOn: today });
    expect(body.findings).toContainEqual(
      expect.objectContaining({ ruleCode: "RUN_DATES_INVALID" }),
    );
  });

  it.each([
    [
      "WORDS_NUMBER",
      { disclosureLine: "Equal Housing Opportunity. 5% down." },
      {},
      "content.disclosureText",
      "disclosure line in Brand",
    ],
    ["WORDS_CO_BRAND", { title: "Realtor partner" }, {}, "advertiser.title", "title in Brand"],
    [
      "WORDS_CO_BRAND",
      { title: "Working with Priya Nadeem" },
      {},
      "advertiser.title",
      "title in Brand",
    ],
    [
      "WORDS_PRIVATE_INFO_REQUEST",
      { leadFormWording: "Enter your date of birth" },
      {},
      "content.consentText",
      "lead form wording in Brand",
    ],
    [
      "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
      {},
      { company: "Low Rates Lending" },
      "advertiser.company",
      "company name in Brand",
    ],
    [
      "EQUAL_HOUSING_REQUIRED",
      { disclosureLine: "Lender disclosures apply." },
      {},
      "content.disclosureText",
      "in Brand",
    ],
    ["NMLS_NUMBER_REQUIRED", {}, { nmls: "" }, "advertiser.nmls", "in Brand"],
  ])("%s in Brand text, naming the Brand field", async (code, ad, report, affected, field) => {
    await brandWith(ad, report);
    const body = await saved(owner, LIBRARY_AD_SAVE_INPUT);
    expect(body.state).toBe("preflight_failed");
    const finding = body.findings.find(
      (item) => item.ruleCode === code && item.affected === affected,
    );
    expect(finding?.remediation).toContain(field);
  });

  it("LIBRARY_AD_RETIRED for an ad retired before the check ran", async () => {
    const record = await persistThroughTheApplication(
      "retired",
      await sampleEntry("sample-spring-search", 1),
    );
    expect(record.state).toBe("preflight_failed");
    expect(record.preflight.findings.map((finding) => finding.ruleCode)).toContain(
      "LIBRARY_AD_RETIRED",
    );
  });
});

describe.sequential("a new version, and its references (009D-AC-020, 021)", () => {
  // Approving needs a version whose checks passed, so this suite starts from the clean brand
  // rather than from whatever the suite before it left.
  beforeAll(async () => {
    await brandWith({});
  });

  it("appends version 2 to the same campaign, and the earlier approval does not carry over", async () => {
    const first = await saved(owner, LIBRARY_AD_SAVE_INPUT);
    expect(first.state, "only a version whose checks passed can be approved").toBe(
      "awaiting_approval",
    );
    const approved = await approvePost(
      browserRequest({
        path: "/api/campaigns/approve",
        body: approvalPayload({
          campaignRef: first.campaignRef,
          campaignVersionRef: first.campaignVersionRef,
          manifestHash: String(first["manifestHash"]),
          preflightResultHash: String(first["preflightResultHash"]),
          rowVersion: await currentRowVersion(owner, first.campaignRef, environment),
        }),
        session: owner,
        csrfServerSecret: csrf,
      }),
    );
    expect(approved.status).toBe(200);
    expect((await storedVersion(owner, first.campaignRef)).state).toBe("approved");

    const second = await saved(owner, {
      ...LIBRARY_AD_SAVE_INPUT,
      campaignRef: first.campaignRef,
      headline: "Ready for your first home? Start here.",
    });
    expect(second.campaignRef).toBe(first.campaignRef);
    expect(second.versionNo).toBe(2);
    const record = await storedVersion(owner, first.campaignRef);
    expect(record.version.versionNo).toBe(2);
    expect(record.version.campaignVersionRef).toBe(second.campaignVersionRef);
    expect(record.approval).toBeUndefined();
    expect(record.state).toBe("awaiting_approval");
  });

  it("derives the brand reference from the saved brand, so a Brand change changes it", async () => {
    const before = await saved(owner, LIBRARY_AD_SAVE_INPUT);
    const beforeRef = (await storedVersion(owner, before.campaignRef)).version.inputVersions
      .brandProfileVersionRef;
    expect(
      (await savePreference(owner, "brand", { ...SAVED_TEST_BRAND, tagline: "A new line." }))
        .status,
    ).toBe(200);
    const after = await saved(owner, LIBRARY_AD_SAVE_INPUT);
    const afterVersion = (await storedVersion(owner, after.campaignRef)).version;
    expect(afterVersion.inputVersions.brandProfileVersionRef).not.toBe(beforeRef);
    expect(afterVersion.inputVersions.partnerProfileVersionRef).toBe("partnerprofile_none001");
  });

  it("puts the placeholder brand on a person with none, and the checks send it back", async () => {
    const body = await saved(fresh, LIBRARY_AD_SAVE_INPUT);
    expect(body.state).toBe("preflight_failed");
    expect(body.findings).toContainEqual(
      expect.objectContaining({ ruleCode: "NMLS_NUMBER_REQUIRED" }),
    );
  });
});
