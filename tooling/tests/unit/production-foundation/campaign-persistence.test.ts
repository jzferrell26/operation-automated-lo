import { describe, expect, it } from "vitest";

import { createCampaignVersion, runCampaignPreflight } from "@oalo/application";
import {
  CampaignManifestSchema,
  type CampaignInputVersions,
  type CampaignManifest,
  type CampaignVersion,
  type PreflightRules,
} from "@oalo/contracts";
import {
  CampaignPersistenceError,
  campaignVersionContracts,
  createPostgresCampaignApprovalRepository,
  createPostgresCampaignVersionRepository,
  type DatabaseConnection,
  type DatabasePool,
  type SqlDriverResult,
  type SqlRequest,
} from "@oalo/db";

const locationRef = "location_01TenantA";
const campaignRef = "campaign_01OpenHouse";
const campaignVersionRef = "version_01Campaign";
const now = new Date("2026-07-21T16:00:00.000Z");
const sha = (character: string) => character.repeat(64);

const context = Object.freeze({
  actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  correlationId: "correlation_campaign_persist_001",
  locationId: "11111111-1111-4111-8111-111111111111",
});

const inputVersions: CampaignInputVersions = {
  blueprintVersionRef: "blueprint_01OpenHouse",
  brandProfileVersionRef: "profile_01Brand",
  complianceProfileVersionRef: "profile_01Compliance",
  partnerProfileVersionRef: "profile_01Partner",
  routingProfileVersionRef: "profile_01Routing",
  rulesetVersionRef: "ruleset_01Policy",
};

const manifest: CampaignManifest = CampaignManifestSchema.parse({
  schemaVersion: 1,
  blueprintId: "open-house-boost",
  property: {
    address: "123 Main Street",
    description: "A fixture-backed property.",
    openHouseStartsAt: "2026-07-25T18:00:00.000Z",
    openHouseEndsAt: "2026-07-25T20:00:00.000Z",
    stateCode: "TX",
    permissionConfirmed: true,
  },
  content: {
    headline: "Tour 123 Main Street",
    callToAction: "View the open house",
    disclosureText: "Equal Housing Opportunity.",
    consentText: "By submitting, you consent to contact.",
    body: "Join {{realtor_name}} for an open house.",
    claims: ["Open house information is subject to change."],
    mergeTokens: ["{{realtor_name}}"],
    financingTerms: [],
  },
  images: [
    {
      assetRef: "asset_01Exterior",
      approvalStatus: "approved",
      width: 1_600,
      height: 900,
      altText: "Exterior of 123 Main Street",
    },
  ],
  partner: { realtorDisplayName: "Taylor Reed", permissionConfirmed: true },
  artifacts: {
    pageVersionRef: "page_01Approved",
    pdfVersionRef: "pdf_01Approved",
    creativeVersionRef: "creative_01Approved",
    copyVersionRef: "copy_01Approved",
    emailPackageVersionRef: "email_01Approved",
    smsPackageVersionRef: "sms_01Approved",
    disclosureVersionRef: "disclosure_01Approved",
    formVersionRef: "form_01Approved",
    destinationVersionRef: "destination_01Approved",
    qrDestinationVersionRef: "destination_01Approved",
  },
  meta: {
    enabled: true,
    specialAdCategory: "HOUSING",
    platform: "meta",
    targeting: {
      country: "US",
      regions: ["Texas"],
      zipCodes: [],
      customAudienceRefs: [],
      protectedDimensions: [],
    },
    dailyBudgetMinor: 2_000,
    totalBudgetMinor: 10_000,
  },
  routing: { mappingVersionRef: "mapping_01Routing", validationStatus: "valid" },
});

const rules: PreflightRules = {
  schemaVersion: 1,
  rulesetVersionRef: inputVersions.rulesetVersionRef,
  evaluatedAt: now.toISOString(),
  minimumImageWidth: 1_200,
  minimumImageHeight: 630,
  earliestStartAt: "2026-07-22T00:00:00.000Z",
  allowedMergeTokens: ["{{realtor_name}}"],
  bannedPhrases: ["guaranteed approval"],
  allowedClaims: ["Open house information is subject to change."],
  allowsFinancingTerms: false,
  minimumDailyBudgetMinor: 500,
  maximumDailyBudgetMinor: 10_000,
  maximumTotalBudgetMinor: 50_000,
  warnings: [],
};

function versionRow(version: CampaignVersion) {
  return {
    location_ref: version.locationRef,
    campaign_ref: version.campaignRef,
    campaign_version_ref: version.campaignVersionRef,
    version_no: version.versionNo,
    source_campaign_ref: version.sourceCampaignRef ?? null,
    input_versions: version.inputVersions,
    manifest: version.manifest,
    manifest_hash: version.manifestHash,
    created_by_actor_ref: version.createdBy,
    created_at: new Date(version.createdAt),
  };
}

describe("campaign persistence contracts", () => {
  it("decodes a stored campaign version and rejects malformed rows", () => {
    const version: CampaignVersion = {
      schemaVersion: 1,
      locationRef,
      campaignRef,
      campaignVersionRef,
      versionNo: 1,
      inputVersions,
      manifest,
      manifestHash: sha("a"),
      createdBy: "user_01Creator",
      createdAt: now.toISOString(),
    };
    expect(
      campaignVersionContracts.selectVersionContract.decode(versionRow(version)),
    ).toMatchObject({
      campaignRef,
      campaignVersionRef,
      versionNo: 1,
      manifestHash: sha("a"),
    });
    expect(() => campaignVersionContracts.selectVersionContract.decode(null)).toThrow(
      CampaignPersistenceError,
    );
    expect(() =>
      campaignVersionContracts.selectVersionContract.decode({
        ...versionRow(version),
        version_no: 0,
      }),
    ).toThrow("greater than or equal to 1");
  });

  it("rejects a manifest hash that does not match canonical content before insert", async () => {
    const connection = new FakeConnection({
      rowsByStatement: {
        "campaign.lock-aggregate.v1": [{ campaign_id: context.locationId }],
        "campaign.latest-version-no.v1": [{ version_no: 0 }],
      },
    });
    const repository = createPostgresCampaignVersionRepository(new FakePool(connection), {
      resolveTenantDatabaseContext: async () => context,
    });
    await expect(
      repository.run(async (transaction) =>
        transaction.append({
          schemaVersion: 1,
          locationRef,
          campaignRef,
          campaignVersionRef,
          versionNo: 1,
          inputVersions,
          manifest,
          manifestHash: sha("f"),
          createdBy: "user_01Creator",
          createdAt: now.toISOString(),
        }),
      ),
    ).rejects.toMatchObject({ code: "CAMPAIGN_MANIFEST_HASH_MISMATCH" });
    expect(connection.statementNames()).not.toContain("campaign.insert-version.v1");
  });

  it("creates a version once and returns the stored row on retry", async () => {
    const connection = new StatefulCampaignConnection();
    const repository = createPostgresCampaignVersionRepository(new FakePool(connection), {
      resolveTenantDatabaseContext: async () => context,
    });
    const first = await createCampaignVersion(
      {
        createdAt: now,
        version: {
          schemaVersion: 1,
          locationRef,
          campaignRef,
          campaignVersionRef,
          inputVersions,
          manifest,
          createdBy: "user_01Creator",
        },
      },
      repository,
    );
    const retried = await createCampaignVersion(
      {
        createdAt: new Date("2026-07-21T16:05:00.000Z"),
        version: {
          schemaVersion: 1,
          locationRef,
          campaignRef,
          campaignVersionRef,
          inputVersions,
          manifest,
          createdBy: "user_01Creator",
        },
      },
      repository,
    );
    expect(first.versionNo).toBe(1);
    expect(retried).toEqual(first);
    expect(connection.insertCount).toBe(1);
  });

  it("persists blocking preflight as preflight_failed and passing preflight as awaiting_approval", async () => {
    const passingConnection = new FakeConnection({
      rowsByStatement: {
        "campaign.insert-preflight.v1": [{ affected: true }],
        "campaign.update-status-from-preflight.v1": [{ affected: true }],
      },
    });
    const passingRepository = createPostgresCampaignVersionRepository(
      new FakePool(passingConnection),
      { resolveTenantDatabaseContext: async () => context },
    );
    const passingVersion = await createFrozenVersion();
    const passing = runCampaignPreflight(passingVersion, rules);
    expect(passing.blocking).toBe(false);
    await expect(passingRepository.persistPreflight(passing)).resolves.toEqual(passing);
    expect(
      passingConnection.requests.find(
        (request) => request.statementName === "campaign.update-status-from-preflight.v1",
      )?.values[1],
    ).toBe("awaiting_approval");

    const blockingConnection = new FakeConnection({
      rowsByStatement: {
        "campaign.insert-preflight.v1": [{ affected: true }],
        "campaign.update-status-from-preflight.v1": [{ affected: true }],
      },
    });
    const blockingRepository = createPostgresCampaignVersionRepository(
      new FakePool(blockingConnection),
      { resolveTenantDatabaseContext: async () => context },
    );
    const blockingVersion = await createFrozenVersion({
      ...manifest,
      partner: { ...manifest.partner, permissionConfirmed: false },
    });
    const blocking = runCampaignPreflight(blockingVersion, rules);
    expect(blocking.blocking).toBe(true);
    await expect(blockingRepository.persistPreflight(blocking)).resolves.toEqual(blocking);
    expect(
      blockingConnection.requests.find(
        (request) => request.statementName === "campaign.update-status-from-preflight.v1",
      )?.values[1],
    ).toBe("preflight_failed");
  });

  it("fails closed when preflight cannot match the stored version and hash", async () => {
    const connection = new FakeConnection({
      rowsByStatement: {
        "campaign.insert-preflight.v1": [],
        "campaign.select-preflight.v1": [],
      },
    });
    const repository = createPostgresCampaignVersionRepository(new FakePool(connection), {
      resolveTenantDatabaseContext: async () => context,
    });
    const version = await createFrozenVersion();
    const preflight = runCampaignPreflight(version, rules);
    await expect(repository.persistPreflight(preflight)).rejects.toMatchObject({
      code: "CAMPAIGN_PREFLIGHT_MISMATCH",
    });
  });

  it("loads current approval evidence and commits an idempotent human decision", async () => {
    const version = await createFrozenVersion();
    const preflight = runCampaignPreflight(version, rules);
    const decision = {
      schemaVersion: 1 as const,
      approvalRef: "approval_01Decision",
      locationRef,
      campaignRef,
      campaignVersionRef,
      manifestHash: version.manifestHash,
      preflightResultHash: preflight.resultHash,
      actorRef: "principal_approver001",
      actorKind: "human" as const,
      actorRole: "approver" as const,
      decidedAt: now.toISOString(),
      ipAuditHash: sha("a"),
      decision: "approved" as const,
      snapshot: {
        pageVersionRef: manifest.artifacts.pageVersionRef,
        pdfVersionRef: manifest.artifacts.pdfVersionRef,
        creativeVersionRef: manifest.artifacts.creativeVersionRef,
        copyVersionRef: manifest.artifacts.copyVersionRef,
        emailPackageVersionRef: manifest.artifacts.emailPackageVersionRef,
        smsPackageVersionRef: manifest.artifacts.smsPackageVersionRef,
        disclosureVersionRef: manifest.artifacts.disclosureVersionRef,
        targetingHash: sha("1"),
        budgetHash: sha("2"),
        datesHash: sha("3"),
        formVersionRef: manifest.artifacts.formVersionRef,
        destinationVersionRef: manifest.artifacts.destinationVersionRef,
      },
    };
    const approvalRow = {
      approval_ref: decision.approvalRef,
      location_ref: decision.locationRef,
      campaign_ref: decision.campaignRef,
      campaign_version_ref: decision.campaignVersionRef,
      manifest_hash: decision.manifestHash,
      preflight_result_hash: decision.preflightResultHash,
      actor_ref: decision.actorRef,
      actor_kind: decision.actorKind,
      actor_role: decision.actorRole,
      decided_at: now,
      ip_audit_hash: decision.ipAuditHash,
      decision: decision.decision,
      snapshot: decision.snapshot,
    };
    const loadConnection = new FakeConnection({
      rowsByStatement: {
        "campaign.lock-approval-aggregate.v1": [{ status: "awaiting_approval", row_version: 2 }],
        "campaign.select-latest-version.v1": [versionRow(version)],
        "campaign.select-latest-preflight.v1": [
          {
            campaign_ref: campaignRef,
            campaign_version_ref: campaignVersionRef,
            manifest_hash: version.manifestHash,
            input_versions: inputVersions,
            ruleset_version_ref: inputVersions.rulesetVersionRef,
            findings: [],
            blocking: false,
            result_hash: preflight.resultHash,
            evaluated_at: now,
          },
        ],
      },
    });
    const loadRepository = createPostgresCampaignApprovalRepository(new FakePool(loadConnection), {
      resolveTenantDatabaseContext: async () => context,
    });
    await expect(
      loadRepository.run(async (transaction) => transaction.loadCurrentEvidence(campaignRef)),
    ).resolves.toMatchObject({
      state: "awaiting_approval",
      rowVersion: 2,
      version: { campaignVersionRef },
      preflight: { resultHash: preflight.resultHash },
    });

    const commitConnection = new FakeConnection({
      rowsByStatement: {
        "campaign.insert-approval.v1": [{ affected: true }],
        "campaign.update-status-optimistic.v1": [{ affected: true }],
        "campaign.insert-approval-command.v1": [{ affected: true }],
        "campaign.insert-approval-audit.v1": [{ affected: true }],
      },
    });
    const commitRepository = createPostgresCampaignApprovalRepository(
      new FakePool(commitConnection),
      { resolveTenantDatabaseContext: async () => context },
    );
    await expect(
      commitRepository.run(async (transaction) =>
        transaction.commitApproval({
          decision,
          event: undefined,
          expectedRowVersion: 2,
          fromState: "awaiting_approval",
          toState: "approved",
          commandKey: sha("k"),
          inputHash: sha("i"),
          correlationId: context.correlationId,
        }),
      ),
    ).resolves.toMatchObject({ duplicate: false, state: "approved", rowVersion: 3 });

    const retryConnection = new FakeConnection({
      rowsByStatement: {
        "campaign.select-approval-command.v1": [
          {
            result_summary: {
              approvalRef: decision.approvalRef,
              state: "approved",
              rowVersion: 3,
            },
          },
        ],
        "campaign.select-approval.v1": [approvalRow],
      },
    });
    const retryRepository = createPostgresCampaignApprovalRepository(
      new FakePool(retryConnection),
      {
        resolveTenantDatabaseContext: async () => context,
      },
    );
    await expect(
      retryRepository.run(async (transaction) =>
        transaction.commitApproval({
          decision,
          event: undefined,
          expectedRowVersion: 2,
          fromState: "awaiting_approval",
          toState: "approved",
          commandKey: sha("k"),
          inputHash: sha("i"),
          correlationId: context.correlationId,
        }),
      ),
    ).resolves.toMatchObject({ duplicate: true, rowVersion: 3 });

    const staleConnection = new FakeConnection({
      rowsByStatement: {
        "campaign.insert-approval.v1": [{ affected: true }],
        "campaign.update-status-optimistic.v1": [],
      },
    });
    const staleRepository = createPostgresCampaignApprovalRepository(
      new FakePool(staleConnection),
      {
        resolveTenantDatabaseContext: async () => context,
      },
    );
    await expect(
      staleRepository.run(async (transaction) =>
        transaction.commitApproval({
          decision,
          event: undefined,
          expectedRowVersion: 2,
          fromState: "awaiting_approval",
          toState: "approved",
          commandKey: sha("k"),
          inputHash: sha("i"),
          correlationId: context.correlationId,
        }),
      ),
    ).rejects.toMatchObject({ code: "CAMPAIGN_APPROVAL_CONFLICT" });

    const deniedConnection = new FakeConnection({
      rowsByStatement: {
        "campaign.insert-approval-audit.v1": [{ affected: true }],
      },
    });
    const deniedRepository = createPostgresCampaignApprovalRepository(
      new FakePool(deniedConnection),
      { resolveTenantDatabaseContext: async () => context },
    );
    await deniedRepository.run(async (transaction) =>
      transaction.recordDeniedAttempt({
        campaignRef,
        correlationId: `${context.correlationId}-denied`,
        inputHash: sha("i"),
        beforeHash: sha("b"),
      }),
    );
    expect(deniedConnection.statementNames()).toContain("campaign.insert-approval-audit.v1");
  });
});

async function createFrozenVersion(
  nextManifest: CampaignManifest = manifest,
): Promise<CampaignVersion> {
  return createCampaignVersion(
    {
      createdAt: now,
      version: {
        schemaVersion: 1,
        locationRef,
        campaignRef,
        campaignVersionRef,
        inputVersions,
        manifest: nextManifest,
        createdBy: "user_01Creator",
      },
    },
    {
      async run(work) {
        return work({
          async getByCampaignVersionRef() {
            return undefined;
          },
          async getLatestVersionNo() {
            return 0;
          },
          async append() {
            return undefined;
          },
        });
      },
    },
  );
}

interface FakeConnectionOptions {
  readonly rowsByStatement?: Readonly<Record<string, readonly unknown[]>>;
}

class FakeConnection implements DatabaseConnection {
  readonly requests: SqlRequest[] = [];
  readonly #options: FakeConnectionOptions;

  constructor(options: FakeConnectionOptions = {}) {
    this.#options = options;
  }

  async execute(request: SqlRequest): Promise<SqlDriverResult> {
    this.requests.push(request);
    if (request.statementName === "transaction.read-context") {
      return {
        rowCount: 1,
        rows: [
          {
            actor_id: context.actorId,
            correlation_id: context.correlationId,
            location_id: context.locationId,
          },
        ],
      };
    }
    const configuredRows = this.#options.rowsByStatement?.[request.statementName];
    if (configuredRows !== undefined) {
      return { rowCount: configuredRows.length, rows: configuredRows };
    }
    return { rowCount: 0, rows: [] };
  }

  async release(): Promise<void> {
    return undefined;
  }

  statementNames(): string[] {
    return this.requests.map((entry) => entry.statementName);
  }
}

class FakePool implements DatabasePool {
  readonly #connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.#connection = connection;
  }

  async connect(): Promise<DatabaseConnection> {
    return this.#connection;
  }
}

class StatefulCampaignConnection extends FakeConnection {
  insertCount = 0;
  #stored: CampaignVersion | undefined;

  override async execute(request: SqlRequest): Promise<SqlDriverResult> {
    if (request.statementName === "campaign.select-version.v1") {
      const rows = this.#stored ? [versionRow(this.#stored)] : [];
      this.requests.push(request);
      return { rowCount: rows.length, rows };
    }
    if (request.statementName === "campaign.lock-aggregate.v1") {
      this.requests.push(request);
      return { rowCount: 1, rows: [{ campaign_id: context.locationId }] };
    }
    if (request.statementName === "campaign.latest-version-no.v1") {
      this.requests.push(request);
      return {
        rowCount: 1,
        rows: [{ version_no: this.#stored?.versionNo ?? 0 }],
      };
    }
    if (request.statementName === "campaign.insert-version.v1") {
      this.requests.push(request);
      this.insertCount += 1;
      this.#stored = {
        schemaVersion: 1,
        locationRef: String(request.values[4]),
        campaignRef: String(request.values[0]),
        campaignVersionRef: String(request.values[1]),
        versionNo: Number(request.values[2]),
        inputVersions,
        manifest,
        manifestHash: String(request.values[7]),
        createdBy: String(request.values[8]),
        createdAt: String(request.values[9]),
      };
      return { rowCount: 1, rows: [{ affected: true }] };
    }
    return super.execute(request);
  }
}
