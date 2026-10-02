import { describe, expect, it, vi } from "vitest";

import type { CampaignWorkspaceReadRecord } from "@oalo/application";
import {
  LibraryAdCampaignManifestSchema,
  formatActorRef,
  formatLocationRef,
} from "@oalo/contracts";
import type { DatabasePool } from "@oalo/db";

import {
  assertReviewRunDatabase,
  seedReviewAccountCampaigns,
  type ReviewAccount,
  type ReviewAccountRepositories,
  type ReviewCampaignSeed,
} from "../../../packages/db/test/route-seeding-bridge.js";
import {
  HISTORY_LABELS,
  buildCampaignHistory,
} from "../../../tests/browser/review/helpers/campaign-history.js";
import {
  LIBRARY_AD_INPUT_VERSIONS,
  libraryAdManifestInput,
} from "../unit/ads-library/library-ad-fixtures.js";

/**
 * PRD-009g, 009G-AC-002. The sanctioned writer of review campaign history
 * (`seedReviewAccountCampaigns` in `packages/db/test/campaign-integration-support.mjs`): that it
 * refuses to run anywhere but the review run's database, before it opens a connection, and what it
 * stores, against a fake of the database so no Postgres is needed.
 *
 * It lives in the `database` project because the harness loads the built `@oalo/db`, which the
 * database gate builds before it runs this project.
 */

const REVIEW_ENVIRONMENT = Object.freeze({ OALO_REVIEW_BROWSER_RUN: "true" });
const REVIEW_URL = "postgresql://postgres:hunter2@127.0.0.1:54322/oalo_test_campaign";
const ACCOUNT_EMAIL = "review-a1-b2@oalo.invalid";
const TEMPLATE_REF = "campaign_templatesaved001";

const ACCOUNT: ReviewAccount = Object.freeze({
  locationId: "4f6a1c2e-0000-4000-8000-000000000001",
  actorId: "4f6a1c2e-0000-4000-8000-000000000011",
  locationRef: formatLocationRef("4f6a1c2e-0000-4000-8000-000000000001"),
  actorRef: formatActorRef("4f6a1c2e-0000-4000-8000-000000000011"),
});

describe("the guard that keeps review campaign history in the review run's database", () => {
  it("accepts a loopback database named for the run, with the run flag set", () => {
    for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
      expect(
        assertReviewRunDatabase(
          `postgresql://postgres:hunter2@${host}:54322/oalo_test_campaign`,
          REVIEW_ENVIRONMENT,
        ),
      ).toBe("oalo_test_campaign");
    }
  });

  it.each([
    ["no run flag", REVIEW_URL, {}],
    ["the run flag set to something else", REVIEW_URL, { OALO_REVIEW_BROWSER_RUN: "1" }],
    ["the run flag empty", REVIEW_URL, { OALO_REVIEW_BROWSER_RUN: "" }],
    [
      "a production environment in the shell",
      REVIEW_URL,
      { ...REVIEW_ENVIRONMENT, OALO_ENVIRONMENT: "production" },
    ],
    [
      "a host that is not loopback",
      "postgresql://postgres:hunter2@db.example.com:5432/oalo_test_campaign",
      REVIEW_ENVIRONMENT,
    ],
    [
      "a private address",
      "postgresql://postgres:hunter2@10.0.0.5:5432/oalo_test_campaign",
      REVIEW_ENVIRONMENT,
    ],
    [
      "a host that only starts like loopback",
      "postgresql://postgres:hunter2@127.0.0.1.example.com:5432/oalo_test_campaign",
      REVIEW_ENVIRONMENT,
    ],
    [
      "the stack's primary database",
      "postgresql://postgres:hunter2@127.0.0.1:54322/postgres",
      REVIEW_ENVIRONMENT,
    ],
    [
      "a name that stops at the prefix",
      "postgresql://postgres:hunter2@127.0.0.1:54322/oalo_test_",
      REVIEW_ENVIRONMENT,
    ],
    [
      "a name with a capital",
      "postgresql://postgres:hunter2@127.0.0.1:54322/oalo_test_Campaign",
      REVIEW_ENVIRONMENT,
    ],
    [
      "a name that is the prefix without its underscore",
      "postgresql://postgres:hunter2@127.0.0.1:54322/oalo_testing",
      REVIEW_ENVIRONMENT,
    ],
    [
      "a name longer than the gate's",
      `postgresql://postgres:hunter2@127.0.0.1:54322/oalo_test_${"a".repeat(41)}`,
      REVIEW_ENVIRONMENT,
    ],
    ["an address that is not a URL", "not a url hunter2", REVIEW_ENVIRONMENT],
  ])("refuses %s, and never puts the credential in the refusal", (_name, url, environment) => {
    let message = "";
    try {
      assertReviewRunDatabase(url, environment);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).not.toBe("");
    expect(message).not.toContain("hunter2");
  });
});

/** A fake of the two product repositories, recording what the harness stores. */
function fakeDatabase(template: unknown) {
  const appended: { campaignRef: string; versionNo: number; manifestHash: string }[] = [];
  const preflights: { campaignVersionRef: string; blocking: boolean; manifestHash: string }[] = [];
  const close = vi.fn(async () => undefined);
  const openPool = vi.fn(() => ({ close }) as unknown as DatabasePool);
  const repositories: ReviewAccountRepositories = {
    versions: {
      async run(work) {
        return work({
          async getByCampaignVersionRef() {
            return undefined;
          },
          async getLatestVersionNo(_locationRef, campaignRef) {
            return appended.filter((version) => version.campaignRef === campaignRef).length;
          },
          async append(version) {
            appended.push(version);
          },
        });
      },
      async persistPreflight(result) {
        preflights.push(result);
        return result;
      },
    },
    reads: {
      async getByCampaignRef(campaignRef) {
        return campaignRef === TEMPLATE_REF ? (template as CampaignWorkspaceReadRecord) : undefined;
      },
    },
  };
  return {
    appended,
    preflights,
    close,
    openPool,
    dependencies: {
      environment: REVIEW_ENVIRONMENT,
      openPool,
      resolveAccount: vi.fn(async () => ACCOUNT),
      openRepositories: () => repositories,
    },
  };
}

const LIBRARY_AD_TEMPLATE = Object.freeze({
  version: {
    inputVersions: LIBRARY_AD_INPUT_VERSIONS,
    manifest: LibraryAdCampaignManifestSchema.parse(libraryAdManifestInput()),
  },
});

function seedInput(
  overrides: Partial<Parameters<typeof seedReviewAccountCampaigns>[0]> = {},
): Parameters<typeof seedReviewAccountCampaigns>[0] {
  return {
    connectionString: REVIEW_URL,
    email: ACCOUNT_EMAIL,
    templateCampaignRef: TEMPLATE_REF,
    build: ({ account, template }) => buildCampaignHistory({ account, template }),
    ...overrides,
  };
}

describe("seeding review campaign history", () => {
  it("opens nothing, and writes nothing, outside the review run (the run flag)", async () => {
    const database = fakeDatabase(LIBRARY_AD_TEMPLATE);
    await expect(
      seedReviewAccountCampaigns(seedInput(), { ...database.dependencies, environment: {} }),
    ).rejects.toThrow(/only inside the review browser run/u);
    expect(database.openPool).not.toHaveBeenCalled();
    expect(database.appended).toEqual([]);
  });

  it("opens nothing for a database that is not the review run's", async () => {
    const database = fakeDatabase(LIBRARY_AD_TEMPLATE);
    await expect(
      seedReviewAccountCampaigns(
        seedInput({
          connectionString: "postgresql://postgres:hunter2@db.example.com:5432/oalo_test_campaign",
        }),
        database.dependencies,
      ),
    ).rejects.toThrow(/loopback/u);
    expect(database.openPool).not.toHaveBeenCalled();
  });

  it("opens nothing for an account that is not under the reserved .invalid domain", async () => {
    const database = fakeDatabase(LIBRARY_AD_TEMPLATE);
    await expect(
      seedReviewAccountCampaigns(
        seedInput({ email: "someone@example.com" }),
        database.dependencies,
      ),
    ).rejects.toThrow(/@oalo\.invalid/u);
    expect(database.openPool).not.toHaveBeenCalled();
  });

  it("stores the three campaigns through the product's version and check functions", async () => {
    const database = fakeDatabase(LIBRARY_AD_TEMPLATE);
    const stored = await seedReviewAccountCampaigns(seedInput(), database.dependencies);

    expect(stored.map((campaign) => campaign.label)).toEqual([
      HISTORY_LABELS.earlierFlow,
      HISTORY_LABELS.newerVersion,
      HISTORY_LABELS.adRetired,
    ]);
    expect(stored.map((campaign) => campaign.versionNo)).toEqual([1, 1, 1]);
    expect(database.appended.map((version) => version.campaignRef)).toEqual(
      stored.map((campaign) => campaign.campaignRef),
    );
    // Every version was checked, the check passed, and it is the check of that very version.
    expect(database.preflights.map((result) => result.campaignVersionRef)).toEqual(
      stored.map((campaign) => campaign.campaignVersionRef),
    );
    expect(database.preflights.every((result) => !result.blocking)).toBe(true);
    for (const [index, result] of database.preflights.entries()) {
      expect(result.manifestHash).toBe(database.appended[index]?.manifestHash);
    }
    expect(database.close).toHaveBeenCalledTimes(1);
  });

  it("hands the builder the account's references and its own campaign's brand, nothing more", async () => {
    const database = fakeDatabase(LIBRARY_AD_TEMPLATE);
    const build = vi.fn(() => [] as readonly ReviewCampaignSeed[]);
    await seedReviewAccountCampaigns(seedInput({ build }), database.dependencies);

    expect(build).toHaveBeenCalledWith({
      account: { locationRef: ACCOUNT.locationRef, actorRef: ACCOUNT.actorRef },
      template: {
        inputVersions: LIBRARY_AD_TEMPLATE.version.inputVersions,
        manifest: LIBRARY_AD_TEMPLATE.version.manifest,
      },
    });
  });

  it("refuses a seed that names another workspace or person, and stores nothing from it", async () => {
    const database = fakeDatabase(LIBRARY_AD_TEMPLATE);
    const build = ({ account, template }: Parameters<typeof buildCampaignHistory>[0]) =>
      buildCampaignHistory({
        account: { ...account, locationRef: formatLocationRef(ACCOUNT.actorId) },
        template,
      });
    await expect(
      seedReviewAccountCampaigns(seedInput({ build }), database.dependencies),
    ).rejects.toThrow(/does not name this account's workspace and person/u);
    expect(database.appended).toEqual([]);
    expect(database.preflights).toEqual([]);
    expect(database.close).toHaveBeenCalledTimes(1);
  });

  it("refuses a seed whose check does not pass, names the rule, and writes no check for it", async () => {
    const database = fakeDatabase(LIBRARY_AD_TEMPLATE);
    // The builder drifted: it checked the retired ad as retired, which is a blocking finding.
    const build = ({ account, template }: Parameters<typeof buildCampaignHistory>[0]) =>
      buildCampaignHistory({ account, template }).map((seed) =>
        seed.label === HISTORY_LABELS.adRetired && "libraryAd" in seed.rules
          ? {
              ...seed,
              rules: {
                ...seed.rules,
                libraryAd: { ...seed.rules.libraryAd, retiredOn: "2026-09-30" },
              },
            }
          : seed,
      );
    await expect(
      seedReviewAccountCampaigns(seedInput({ build }), database.dependencies),
    ).rejects.toThrow(/ad-retired seed did not pass its checks: LIBRARY_AD_RETIRED/u);
    // The two campaigns before it were stored whole; the one that failed has a version and no check.
    expect(database.appended).toHaveLength(3);
    expect(database.preflights).toHaveLength(2);
    expect(database.close).toHaveBeenCalledTimes(1);
  });

  it("refuses a template that is not a library-ad campaign of this account", async () => {
    const [openHouse] = buildCampaignHistory({
      account: ACCOUNT,
      template: {
        inputVersions: LIBRARY_AD_TEMPLATE.version.inputVersions,
        manifest: LIBRARY_AD_TEMPLATE.version.manifest,
      },
    });
    const database = fakeDatabase({
      version: { inputVersions: LIBRARY_AD_INPUT_VERSIONS, manifest: openHouse?.version.manifest },
    });
    await expect(seedReviewAccountCampaigns(seedInput(), database.dependencies)).rejects.toThrow(
      /not a library-ad campaign/u,
    );
    expect(database.appended).toEqual([]);

    const unknown = fakeDatabase(undefined);
    await expect(seedReviewAccountCampaigns(seedInput(), unknown.dependencies)).rejects.toThrow(
      /not a library-ad campaign/u,
    );
    expect(unknown.close).toHaveBeenCalledTimes(1);
  });
});
