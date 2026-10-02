import { randomUUID } from "node:crypto";

import { createCampaignVersion, runCampaignPreflight } from "@oalo/application";
import type { SqlScalar } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import { POST as preferencesPost } from "../app/api/workspace/preferences/route.js";
import { loadAdsLibrary } from "../features/ads-library/server/catalog-loader.js";
import { buildLibraryAdManifest } from "../features/ads-library/server/library-ad-manifest.js";
import {
  libraryAdPreflightRules,
  libraryAdRuleContext,
} from "../features/ads-library/server/library-ad-ruleset.js";
import { newerVersionOffer, newVersionRequest } from "../features/ads-library/newer-version.js";
import { SAVED_TEST_BRAND } from "./campaign-command-test-support.js";
import {
  createCampaignPersistenceAdapter,
  resetCampaignDatabasePoolForTests,
} from "./campaign-persistence-runtime.js";
import {
  applyRouteEnvironment,
  browserRequest,
  createRouteTestPool,
  csrfSecretFor,
  issueSession,
  principalForSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  type IssuedSession,
} from "./campaign-route-postgres-support.js";
import { libraryAdManifestInput, sampleEntry } from "./library-ad-test-support.js";
import { withMigrationOwnerTransaction } from "../../../../packages/db/test/route-seeding-bridge.js";

/**
 * PRD-009c D4, 009C-AC-009, against a disposable Postgres through the exported route handler, with
 * the headers a browser sends.
 *
 * "Use the new version" saves a new campaign version on the newer library ad version through the
 * same route "Save and check" uses. A campaign is stored while its ad is still current (version 1 of
 * `sample-first-home`, which the sample catalog has since replaced with version 2), the offer is
 * built from the stored record, and the request is built from the offer, field for field, as the
 * component builds it.
 */

const environment = routeEnvironment();
const pool = createRouteTestPool();
let owner: IssuedSession;
let csrf: Uint8Array;
let restore: () => void;

const SavedBody = z
  .object({ campaignRef: z.string(), campaignVersionRef: z.string(), versionNo: z.number() })
  .passthrough();

function save(body: unknown) {
  return preflightPost(
    browserRequest({
      path: "/api/campaigns/preflight",
      body,
      session: owner,
      csrfServerSecret: csrf,
    }),
  );
}

async function fixtureQuery(text: string, values: readonly SqlScalar[] = []) {
  return withMigrationOwnerTransaction(
    pool,
    async (connection) =>
      (
        await connection.execute({
          statementName: "use-new-version.fixture",
          text,
          values,
          preparedStatementMode: "unnamed",
        })
      ).rows as Record<string, unknown>[],
  );
}

async function storedRecord(campaignRef: string) {
  const principal = await principalForSession(owner, environment);
  const record = await createCampaignPersistenceAdapter(
    principal,
    environment,
  ).readRepository.getByCampaignRef(campaignRef);
  if (record === undefined) throw new Error(`No stored campaign ${campaignRef}`);
  return record;
}

/** Stores version 1 of `sample-first-home`, the way the save stored it while that was the newest. */
async function storeOnTheOlderAdVersion() {
  const principal = await principalForSession(owner, environment);
  const adapter = createCampaignPersistenceAdapter(principal, environment);
  const entry = await sampleEntry("sample-first-home", 1);
  const createdAt = new Date();
  const suffix = randomUUID().replaceAll("-", "");
  const version = await createCampaignVersion(
    {
      createdAt,
      version: {
        schemaVersion: 1,
        locationRef: principal.locationRef,
        campaignRef: `campaign_${suffix}`,
        campaignVersionRef: `campaignversion_${suffix}`,
        inputVersions: {
          blueprintVersionRef: "blueprint_libraryAd001",
          brandProfileVersionRef: "brandprofile_local001",
          complianceProfileVersionRef: "complianceprofile_local001",
          partnerProfileVersionRef: "partnerprofile_none001",
          routingProfileVersionRef: "routingprofile_local001",
          rulesetVersionRef: "ruleset_libraryAd001",
        },
        manifest: buildLibraryAdManifest(
          libraryAdManifestInput(entry, { headline: "My own headline" }),
        ),
        createdBy: principal.actorRef,
      },
    },
    adapter.versionRepository,
  );
  // Stored while its ad was current, so the check runs as it did then.
  const preflight = runCampaignPreflight(
    version,
    libraryAdPreflightRules(createdAt, { ...libraryAdRuleContext(entry, []), retiredOn: null }),
  );
  await adapter.persistDraft(version, preflight);
  return storedRecord(version.campaignRef);
}

beforeAll(async () => {
  restore = applyRouteEnvironment(environment);
  csrf = csrfSecretFor(environment);
  const location = await seedLocation(pool, "Use the new version location");
  owner = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "Use the new version owner",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  const brand = await preferencesPost(
    browserRequest({
      path: "/api/workspace/preferences",
      body: { key: "brand", expectedRevision: null, value: SAVED_TEST_BRAND },
      session: owner,
      csrfServerSecret: csrf,
    }),
  );
  expect(brand.status).toBe(200);
});

afterAll(async () => {
  await resetCampaignDatabasePoolForTests();
  await pool.close();
  restore();
});

describe.sequential("Use the new version (009C-AC-009)", () => {
  it("appends version 2 on the newer ad version with the newer words and the old budget, dates, and area, and leaves the earlier version as it was", async () => {
    const first = await storeOnTheOlderAdVersion();
    const firstManifest = first.version.manifest;
    if (firstManifest.blueprintId !== "library-ad") throw new Error("Expected a library ad");
    const library = await loadAdsLibrary({ environment });
    const offer = newerVersionOffer({
      campaignRef: first.version.campaignRef,
      manifest: firstManifest,
      decided: first.approval !== undefined,
      library,
    });
    if (offer === undefined) throw new Error("The older version was not offered the newer one");
    expect(offer.undecided).toBe(true);

    const response = await save(newVersionRequest(offer));
    expect(response.status).toBe(200);
    const body = SavedBody.parse(await response.json());
    expect(body.campaignRef).toBe(first.version.campaignRef);
    expect(body.versionNo).toBe(first.version.versionNo + 1);

    const latest = await storedRecord(first.version.campaignRef);
    const latestManifest = latest.version.manifest;
    if (latestManifest.blueprintId !== "library-ad") throw new Error("Expected a library ad");
    const newest = (await sampleEntry("sample-first-home", 2)).defaults;
    expect(latestManifest.libraryAd).toEqual({ id: "sample-first-home", version: 2 });
    expect(latestManifest.content.headline).toBe(newest.headline);
    expect(latestManifest.content.body).toBe(newest.primaryText);
    expect(latestManifest.meta.dailyBudgetMinor).toBe(firstManifest.meta.dailyBudgetMinor);
    expect(latestManifest.meta.totalBudgetMinor).toBe(firstManifest.meta.totalBudgetMinor);
    expect(latestManifest.meta.targeting.cities).toEqual(firstManifest.meta.targeting.cities);
    expect(latest.approval).toBeUndefined();

    // Both versions are stored: the earlier one is untouched, so nothing decided on it moved.
    const rows = await fixtureQuery(
      "select version_no, manifest_hash, manifest->'libraryAd'->>'version' as ad_version from campaign.campaign_versions where campaign_ref = $1 order by version_no",
      [first.version.campaignRef],
    );
    expect(rows.map((row) => [Number(row["version_no"]), String(row["ad_version"])])).toEqual([
      [1, "1"],
      [2, "2"],
    ]);
    expect(String(rows[0]?.["manifest_hash"])).toBe(first.version.manifestHash);
  });

  it("refuses to save on the older ad version, so the only way onto the newer one is a new campaign version", async () => {
    const first = await storeOnTheOlderAdVersion();
    const response = await save({
      adId: "sample-first-home",
      adVersion: 1,
      campaignRef: first.version.campaignRef,
      headline: "Thinking about your first home? Start here.",
      primaryText: "I walk first-time buyers through each step. Send me a message.",
      endsOn: "2099-03-04",
      dailyBudgetDollars: 25,
      totalBudgetDollars: 350,
      places: ["TX"],
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "LIBRARY_AD_NOT_AVAILABLE" });
    expect((await storedRecord(first.version.campaignRef)).version.versionNo).toBe(1);
  });
});
