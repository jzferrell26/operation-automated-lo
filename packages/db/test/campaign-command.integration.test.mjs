import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import {
  createCampaignVersion,
  executeHumanCampaignApproval,
  runCampaignPreflight,
} from "@oalo/application";

import {
  createPostgresCampaignApprovalRepository,
  createPostgresCampaignReadRepository,
  createPostgresCampaignVersionRepository,
  createPrincipalBoundTenantContextAuthority,
} from "../dist/index.js";
import {
  campaignManifest,
  cleanupTenants,
  inputVersions,
  preflightRulesFor,
  principalFixture,
  requiredTestDatabaseUrl,
  seedTenant,
  tenantFixture,
  testPool,
} from "./campaign-integration-support.mjs";

const databaseUrl = requiredTestDatabaseUrl();

describe("campaign command PostgreSQL integration", { concurrency: false }, () => {
  it("GGL-008 creates an Open House Boost through commands and reloads it from a fresh pool", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const tenantA = tenantFixture("commandcreate", suffix);
    const tenantB = tenantFixture("commandread", suffix);
    const creator = principalFixture(tenantA, "campaign_creator");
    const readerB = principalFixture(tenantB, "location_admin");
    let pool = testPool(databaseUrl);
    const campaignRef = `campaign_${suffix}`;

    try {
      await seedTenant(pool, tenantA, "Command create tenant", [creator]);
      await seedTenant(pool, tenantB, "Command read tenant", [readerB]);
      const versionRepository = createPostgresCampaignVersionRepository(
        pool,
        createPrincipalBoundTenantContextAuthority(creator, tenantA.correlationId),
      );
      const created = await persistPassingOpenHouseBoost(
        versionRepository,
        creator,
        campaignRef,
        `campaignversion_${suffix}`,
      );

      await pool.close();
      pool = testPool(databaseUrl);

      const reloaded = await createPostgresCampaignReadRepository(
        pool,
        createPrincipalBoundTenantContextAuthority(creator, `${tenantA.correlationId}-reload`),
      ).getByCampaignRef(campaignRef);
      assert.ok(reloaded);
      assert.equal(reloaded.state, "awaiting_approval");
      assert.deepEqual(reloaded.version, created.version);
      assert.deepEqual(reloaded.preflight, created.preflight);
      assert.deepEqual(
        await createPostgresCampaignReadRepository(
          pool,
          createPrincipalBoundTenantContextAuthority(readerB, tenantB.correlationId),
        ).listForLocation(),
        [],
      );
      assert.equal(
        await createPostgresCampaignReadRepository(
          pool,
          createPrincipalBoundTenantContextAuthority(readerB, `${tenantB.correlationId}-detail`),
        ).getByCampaignRef(campaignRef),
        undefined,
      );
    } finally {
      await cleanupTenants(pool, [tenantA, tenantB], [creator, readerB]);
      await pool.close();
    }
  });

  it("GGL-009 approves through the command, rejects an unauthorized principal, and reloads approved state", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const tenant = tenantFixture("commandapproval", suffix);
    const creator = principalFixture(tenant, "campaign_creator");
    const approver = principalFixture(tenant, "campaign_approver", "approver");
    let pool = testPool(databaseUrl);
    const campaignRef = `campaign_${suffix}`;

    try {
      await seedTenant(pool, tenant, "Command approval tenant", [creator, approver]);
      const versionRepository = createPostgresCampaignVersionRepository(
        pool,
        createPrincipalBoundTenantContextAuthority(creator, tenant.correlationId),
      );
      const persisted = await persistPassingOpenHouseBoost(
        versionRepository,
        creator,
        campaignRef,
        `campaignversion_${suffix}`,
      );
      const approvalInput = {
        campaignRef,
        decision: "approved",
        decidedAt: new Date("2026-07-21T16:05:00.000Z"),
        expectedCampaignVersionRef: persisted.version.campaignVersionRef,
        expectedManifestHash: persisted.version.manifestHash,
        expectedPreflightResultHash: persisted.preflight.resultHash,
        expectedRowVersion: 2,
        ipAuditHash: "a".repeat(64),
      };

      const denied = await executeHumanCampaignApproval(
        { ...approvalInput, correlationRef: `${tenant.correlationId}-denied` },
        creator,
        createPostgresCampaignApprovalRepository(
          pool,
          createPrincipalBoundTenantContextAuthority(creator, `${tenant.correlationId}-denied`),
        ),
      );
      assert.deepEqual(denied, { kind: "denied" });

      const committed = await executeHumanCampaignApproval(
        { ...approvalInput, correlationRef: `${tenant.correlationId}-approved` },
        approver,
        createPostgresCampaignApprovalRepository(
          pool,
          createPrincipalBoundTenantContextAuthority(approver, `${tenant.correlationId}-approved`),
        ),
      );
      assert.equal(committed.kind, "committed");
      if (committed.kind === "committed") {
        assert.equal(committed.state, "approved");
        assert.equal(committed.decision.actorRole, "approver");
        assert.equal(committed.decision.actorRef, approver.actorRef);
      }

      await pool.close();
      pool = testPool(databaseUrl);

      const reloaded = await createPostgresCampaignReadRepository(
        pool,
        createPrincipalBoundTenantContextAuthority(approver, `${tenant.correlationId}-reload`),
      ).getByCampaignRef(campaignRef);
      assert.ok(reloaded);
      assert.equal(reloaded.state, "approved");
      assert.equal(reloaded.approval?.decision, "approved");
      assert.equal(reloaded.approval?.actorRef, approver.actorRef);
      assert.equal(reloaded.approval?.campaignVersionRef, persisted.version.campaignVersionRef);
    } finally {
      await cleanupTenants(pool, [tenant], [creator, approver]);
      await pool.close();
    }
  });
});

async function persistPassingOpenHouseBoost(
  repository,
  principal,
  campaignRef,
  campaignVersionRef,
) {
  const version = await createCampaignVersion(
    {
      createdAt: new Date("2026-07-21T16:00:00.000Z"),
      version: {
        schemaVersion: 1,
        locationRef: principal.locationRef,
        campaignRef,
        campaignVersionRef,
        inputVersions,
        manifest: campaignManifest,
        createdBy: principal.actorRef,
      },
    },
    repository,
  );
  assert.equal(version.manifest.blueprintId, "open-house-boost");
  const preflight = runCampaignPreflight(version, preflightRulesFor(version));
  assert.equal(preflight.blocking, false);
  await repository.persistPreflight(preflight);
  return Object.freeze({ preflight, version });
}
