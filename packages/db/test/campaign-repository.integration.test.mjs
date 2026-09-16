import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import {
  CampaignPersistenceError,
  createPostgresCampaignApprovalRepository,
  createPostgresCampaignReadRepository,
  createPostgresCampaignVersionRepository,
} from "../dist/index.js";
import {
  appendVersion,
  campaignManifest as manifest,
  canonicalHash,
  cleanupTenants,
  preflightFor,
  readStatus,
  requiredTestDatabaseUrl,
  seedTenant,
  tenantFixture,
  testPool,
} from "./campaign-integration-support.mjs";

const databaseUrl = requiredTestDatabaseUrl();

describe("campaign persistence integration", { concurrency: false }, () => {
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
          error instanceof CampaignPersistenceError && error.code === "CAMPAIGN_PREFLIGHT_MISMATCH",
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
});
