import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import {
  CampaignPersistenceError,
  createPostgresCampaignApprovalRepository,
  createPostgresCampaignReadRepository,
  createPostgresCampaignVersionRepository,
  createPostgresPool,
} from "../dist/index.js";
import { campaignManifestFixture } from "./campaign-manifest-fixture.mjs";

const databaseUrl = process.env.OALO_TEST_DATABASE_URL;
if (databaseUrl !== undefined && !new URL(databaseUrl).pathname.startsWith("/oalo_test_")) {
  throw new Error("OALO_TEST_DATABASE_URL must identify an oalo_test_ database");
}

const manifest = campaignManifestFixture;

const inputVersions = Object.freeze({
  blueprintVersionRef: "blueprint_01OpenHouse",
  brandProfileVersionRef: "profile_01Brand",
  complianceProfileVersionRef: "profile_01Compliance",
  partnerProfileVersionRef: "profile_01Partner",
  routingProfileVersionRef: "profile_01Routing",
  rulesetVersionRef: "ruleset_01Policy",
});

describe(
  "campaign persistence integration",
  { concurrency: false, skip: databaseUrl === undefined },
  () => {
    it("persists monotonic versions, matching preflight, and tenant isolation", async () => {
      const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
      const tenantA = tenantFixture("alpha", suffix);
      const tenantB = tenantFixture("bravo", suffix);
      const pool = testPool(databaseUrl);
      await seedTenant(pool, tenantA, "Activation A");
      await seedTenant(pool, tenantB, "Activation B");
      const repoA = createPostgresCampaignVersionRepository(pool, {
        async resolveTenantDatabaseContext() {
          return tenantA;
        },
      });
      const repoB = createPostgresCampaignVersionRepository(pool, {
        async resolveTenantDatabaseContext() {
          return tenantB;
        },
      });
      const campaignRef = `campaign_${suffix}`;
      const firstRef = `version_${suffix}a`;
      const secondRef = `version_${suffix}b`;
      try {
        const [first, second] = await Promise.all([
          appendVersion(repoA, tenantA, campaignRef, firstRef),
          appendVersion(repoA, tenantA, campaignRef, secondRef),
        ]);
        const versionNos = [first.versionNo, second.versionNo].toSorted(
          (left, right) => left - right,
        );
        assert.deepEqual(versionNos, [1, 2]);
        assert.equal(first.manifestHash, canonicalHash(manifest));
        assert.equal(
          await repoA.getVersion(first.campaignVersionRef).then((row) => row?.versionNo),
          first.versionNo,
        );
        await assert.rejects(
          repoA.run(async (transaction) =>
            transaction.append({ ...first, manifestHash: "f".repeat(64) }),
          ),
          (error) =>
            error instanceof CampaignPersistenceError &&
            error.code === "CAMPAIGN_MANIFEST_HASH_MISMATCH",
        );

        const passing = preflightFor(first, false);
        const storedPassing = await repoA.persistPreflight(passing);
        assert.equal(storedPassing.blocking, false);
        assert.equal(
          (await repoA.getPreflight(first.campaignVersionRef, passing.resultHash))?.resultHash,
          passing.resultHash,
        );

        const blocking = preflightFor(second, true);
        await repoA.persistPreflight(blocking);

        const status = await readStatus(pool, tenantA.locationId, campaignRef);
        assert.equal(status, "preflight_failed");

        assert.equal(await repoB.getVersion(first.campaignVersionRef), undefined);
        await assert.rejects(
          repoB.persistPreflight(passing),
          (error) =>
            error instanceof CampaignPersistenceError &&
            error.code === "CAMPAIGN_PREFLIGHT_MISMATCH",
        );
      } finally {
        await cleanupTenants(pool, [tenantA, tenantB]);
        await pool.close();
      }
    });

    it("commits approval, status, command, and audit atomically and retries idempotently", async () => {
      const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
      const tenantA = tenantFixture("charlie", suffix);
      const pool = testPool(databaseUrl);
      await seedTenant(pool, tenantA, "Approval A");
      const versionRepo = createPostgresCampaignVersionRepository(pool, {
        async resolveTenantDatabaseContext() {
          return tenantA;
        },
      });
      const approvalRepo = createPostgresCampaignApprovalRepository(pool, {
        async resolveTenantDatabaseContext() {
          return tenantA;
        },
      });
      const campaignRef = `campaign_${suffix}`;
      const versionRef = `version_${suffix}c`;
      try {
        const version = await appendVersion(versionRepo, tenantA, campaignRef, versionRef);
        const passing = preflightFor(version, false);
        await versionRepo.persistPreflight(passing);
        const decision = {
          schemaVersion: 1,
          approvalRef: `approval_${suffix}`,
          locationRef: tenantA.locationRef,
          campaignRef,
          campaignVersionRef: version.campaignVersionRef,
          manifestHash: version.manifestHash,
          preflightResultHash: passing.resultHash,
          actorRef: `user_${tenantA.label}`,
          actorKind: "human",
          actorRole: "location_admin",
          decidedAt: "2026-07-21T16:05:00.000Z",
          ipAuditHash: "a".repeat(64),
          decision: "approved",
          snapshot: {
            pageVersionRef: "page_01Approved",
            pdfVersionRef: "pdf_01Approved",
            creativeVersionRef: "creative_01Approved",
            copyVersionRef: "copy_01Approved",
            emailPackageVersionRef: "email_01Approved",
            smsPackageVersionRef: "sms_01Approved",
            disclosureVersionRef: "disclosure_01Approved",
            targetingHash: "b".repeat(64),
            budgetHash: "c".repeat(64),
            datesHash: "d".repeat(64),
            formVersionRef: "form_01Approved",
            destinationVersionRef: "destination_01Approved",
          },
        };
        const commandKey = "e".repeat(64);
        const first = await approvalRepo.run(async (transaction) => {
          const evidence = await transaction.loadCurrentEvidence(campaignRef);
          assert.ok(evidence);
          assert.equal(evidence.state, "awaiting_approval");
          return transaction.commitApproval({
            decision,
            event: undefined,
            expectedRowVersion: evidence.rowVersion,
            fromState: "awaiting_approval",
            toState: "approved",
            commandKey,
            inputHash: "f".repeat(64),
            correlationId: tenantA.correlationId,
          });
        });
        assert.equal(first.duplicate, false);
        assert.equal(first.state, "approved");
        assert.equal(await readStatus(pool, tenantA.locationId, campaignRef), "approved");
        const retry = await approvalRepo.run(async (transaction) =>
          transaction.commitApproval({
            decision,
            event: undefined,
            expectedRowVersion: first.rowVersion,
            fromState: "awaiting_approval",
            toState: "approved",
            commandKey,
            inputHash: "f".repeat(64),
            correlationId: tenantA.correlationId,
          }),
        );
        assert.equal(retry.duplicate, true);
        assert.equal(retry.decision.approvalRef, decision.approvalRef);
        await approvalRepo.run(async (transaction) => {
          await transaction.recordDeniedAttempt({
            campaignRef,
            correlationId: `${tenantA.correlationId}-denied`,
            inputHash: "f".repeat(64),
            beforeHash: "a".repeat(64),
          });
        });
      } finally {
        await cleanupTenants(pool, [tenantA]);
        await pool.close();
      }
    });

    it("lists and loads campaigns without locking and isolates tenants", async () => {
      const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
      const tenantA = tenantFixture("delta", suffix);
      const tenantB = tenantFixture("echo", suffix);
      const pool = testPool(databaseUrl);
      await seedTenant(pool, tenantA, "Read A");
      await seedTenant(pool, tenantB, "Read B");
      const versionRepo = createPostgresCampaignVersionRepository(pool, {
        async resolveTenantDatabaseContext() {
          return tenantA;
        },
      });
      const readA = createPostgresCampaignReadRepository(pool, {
        async resolveTenantDatabaseContext() {
          return tenantA;
        },
      });
      const readB = createPostgresCampaignReadRepository(pool, {
        async resolveTenantDatabaseContext() {
          return tenantB;
        },
      });
      const campaignRef = `campaign_${suffix}`;
      const versionRef = `version_${suffix}d`;
      try {
        const version = await appendVersion(versionRepo, tenantA, campaignRef, versionRef);
        await versionRepo.persistPreflight(preflightFor(version, false));
        const listed = await readA.listForLocation();
        assert.equal(listed.length, 1);
        assert.equal(listed[0]?.version.campaignRef, campaignRef);
        assert.equal(listed[0]?.state, "awaiting_approval");
        const detail = await readA.getByCampaignRef(campaignRef);
        assert.equal(detail?.version.campaignVersionRef, version.campaignVersionRef);
        assert.equal(await readB.getByCampaignRef(campaignRef), undefined);
        assert.deepEqual(await readB.listForLocation(), []);
      } finally {
        await cleanupTenants(pool, [tenantA, tenantB]);
        await pool.close();
      }
    });
  },
);

function canonicalHash(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
}

async function appendVersion(repository, tenant, campaignRef, campaignVersionRef) {
  return repository.run(async (transaction) => {
    const version = {
      schemaVersion: 1,
      locationRef: tenant.locationRef,
      campaignRef,
      campaignVersionRef,
      versionNo: (await transaction.getLatestVersionNo(tenant.locationRef, campaignRef)) + 1,
      inputVersions,
      manifest,
      manifestHash: canonicalHash(manifest),
      createdBy: `user_${tenant.label}`,
      createdAt: new Date("2026-07-21T16:00:00.000Z").toISOString(),
    };
    await transaction.append(version);
    return version;
  });
}

function preflightFor(version, blocking) {
  const resultBody = {
    schemaVersion: 1,
    campaignRef: version.campaignRef,
    campaignVersionRef: version.campaignVersionRef,
    manifestHash: version.manifestHash,
    inputVersions,
    rulesetVersionRef: inputVersions.rulesetVersionRef,
    findings: blocking
      ? [
          {
            severity: "blocking",
            ruleCode: "PARTNER_PERMISSION",
            description: "Partner permission is required.",
            affected: "partner.permissionConfirmed",
            remediation: "Confirm partner permission before preflight.",
          },
        ]
      : [],
    blocking,
    evaluatedAt: "2026-07-21T16:00:00.000Z",
  };
  return Object.freeze({
    ...resultBody,
    resultHash: canonicalHash(resultBody),
  });
}

function tenantFixture(label, suffix) {
  const token = `${label}${suffix}`.replaceAll("_", "").slice(0, 24);
  return Object.freeze({
    actorId: randomUUID(),
    correlationId: `correlation_${label}_${suffix}`,
    label,
    locationId: randomUUID(),
    locationRef: `location_${token}`,
  });
}

function testPool(connectionString) {
  return createPostgresPool({
    applicationName: "oalo-campaign-integration",
    connectionString,
    deploymentEnvironment: "test",
    maxConnections: 4,
    poolingMode: "transaction",
    preparedStatements: false,
    sslMode: "disable",
  });
}

function request(statementName, text, values = []) {
  return Object.freeze({
    preparedStatementMode: "unnamed",
    statementName,
    text: text.trim(),
    values,
  });
}

async function seedTenant(pool, tenant, displayName) {
  const connection = await pool.connect();
  try {
    await connection.execute(
      request(
        "test.campaign-location",
        "insert into platform.locations (id, display_name, status) values ($1::uuid, $2::text, 'active')",
        [tenant.locationId, displayName],
      ),
    );
    await connection.execute(
      request(
        "test.campaign-actor",
        "insert into platform.app_users (id, safe_display_name) values ($1::uuid, $2::text)",
        [tenant.actorId, displayName],
      ),
    );
    await connection.execute(
      request(
        "test.campaign-role",
        "insert into platform.role_bindings (location_id, user_id, role) values ($1::uuid, $2::uuid, 'location_admin')",
        [tenant.locationId, tenant.actorId],
      ),
    );
  } finally {
    await connection.release();
  }
}

async function readStatus(pool, locationId, campaignRef) {
  const connection = await pool.connect();
  try {
    const result = await connection.execute(
      request(
        "test.campaign-status",
        "select status from campaign.campaigns where location_id = $1::uuid and campaign_ref = $2::text",
        [locationId, campaignRef],
      ),
    );
    return result.rows[0]?.status;
  } finally {
    await connection.release();
  }
}

async function cleanupTenants(pool, tenants) {
  const connection = await pool.connect();
  try {
    await connection.execute(request("test.cleanup-begin", "begin"));
    await connection.execute(
      request("test.cleanup-disable-triggers", "set local session_replication_role = replica"),
    );
    for (const tenant of tenants) {
      for (const [statementName, text] of [
        ["test.cleanup-audit", "delete from audit.events where location_id = $1::uuid"],
        [
          "test.cleanup-commands",
          "delete from integration.command_executions where location_id = $1::uuid",
        ],
        [
          "test.cleanup-approvals",
          "delete from campaign.approval_decisions where location_id = $1::uuid",
        ],
        [
          "test.cleanup-preflight",
          "delete from campaign.preflight_results where location_id = $1::uuid",
        ],
        [
          "test.cleanup-versions",
          "delete from campaign.campaign_versions where location_id = $1::uuid",
        ],
        ["test.cleanup-campaigns", "delete from campaign.campaigns where location_id = $1::uuid"],
        ["test.cleanup-roles", "delete from platform.role_bindings where location_id = $1::uuid"],
      ]) {
        await connection.execute(request(statementName, text, [tenant.locationId]));
      }
      await connection.execute(
        request("test.cleanup-actors", "delete from platform.app_users where id = $1::uuid", [
          tenant.actorId,
        ]),
      );
      await connection.execute(
        request("test.cleanup-locations", "delete from platform.locations where id = $1::uuid", [
          tenant.locationId,
        ]),
      );
    }
    await connection.execute(request("test.cleanup-commit", "commit"));
  } catch (error) {
    await connection.execute(request("test.cleanup-rollback", "rollback")).catch(() => undefined);
    throw error;
  } finally {
    await connection.release();
  }
}
