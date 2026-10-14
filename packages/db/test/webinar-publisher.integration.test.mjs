import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { canonicalCampaignHash, webinarPublisherConfirmationHash } from "@oalo/application";
import { parseInstallationRef } from "@oalo/contracts";
import { PostgresWebinarPublisherRepository } from "../dist/index.js";
import { publisherFixture, publisherEvidenceFixture } from "./webinar-publisher-fixture.mjs";
import {
  requiredTestDatabaseUrl,
  testPool,
  request,
  withMigrationOwnerTransaction,
} from "./campaign-integration-support.mjs";

// Required env fails closed during module load. Never runs against a production database.
const url = requiredTestDatabaseUrl();
async function fixture(sharedPool) {
  const f = publisherFixture();
  const evidence = await publisherEvidenceFixture(f);
  const pool = sharedPool ?? testPool(url);
  const installationId = parseInstallationRef(f.principal.installationRef);
  await withMigrationOwnerTransaction(pool, async (c) => {
    await c.execute(
      request(
        "test.publisher-location",
        "insert into platform.locations(id,ghl_location_id,display_name,status) values($1::uuid,$2::text,'Publisher test','active')",
        [f.principal.locationId, f.summary.projection.assets.locationId],
      ),
    );
    await c.execute(
      request(
        "test.publisher-actor",
        "insert into platform.app_users(id,safe_display_name) values($1::uuid,'Publisher test')",
        [f.principal.actorId],
      ),
    );
    const result = await c.execute(
      request(
        "test.publisher-role",
        "insert into platform.role_bindings(location_id,user_id,role) values($1::uuid,$2::uuid,'location_admin') returning (extract(epoch from granted_at)*1000000)::bigint::text as version",
        [f.principal.locationId, f.principal.actorId],
      ),
    );
    f.principal.roleVersion = Number(result.rows[0].version);
    f.operation.actorRoleVersion = f.principal.roleVersion;
    await c.execute(
      request(
        "test.publisher-entitlement",
        "insert into billing.entitlement_versions(location_id,feature_key,version_no,source_event_ref,status,effective_at) values($1::uuid,'campaign.publish',1,'event_publisherSynthetic001','active',now()-interval '1 minute')",
        [f.principal.locationId],
      ),
    );
    await c.execute(
      request(
        "test.publisher-installation",
        "insert into platform.marketplace_installations(id,location_id,marketplace_app_id,status) values($1::uuid,$2::uuid,'publisher-test','active')",
        [installationId, f.principal.locationId],
      ),
    );
    // Strict source and real SDK approval snapshot; provider/release authority is synthetic test data.
    const campaignId = randomUUID(),
      versionId = randomUUID();
    const p = f.summary.projection;
    await c.execute(
      request(
        "test.publisher-publication",
        "insert into campaign.funnel_publications(id,location_id,user_id,kind,source_revision,snapshot,expires_at) values($1::uuid,$2::uuid,$3::uuid,'live-webinar',$4::uuid,'{\"kind\":\"live-webinar\"}',now()+interval '1 day')",
        [
          p.destination.publicationId,
          f.principal.locationId,
          f.principal.actorId,
          p.destination.sourceRevision,
        ],
      ),
    );
    await c.execute(
      request(
        "test.publisher-campaign",
        "insert into campaign.campaigns(id,location_id,campaign_ref,created_by_actor_id,status) values($1::uuid,$2::uuid,$3::text,$4::uuid,'approved')",
        [campaignId, f.principal.locationId, p.campaignRef, f.principal.actorId],
      ),
    );
    await c.execute(
      request(
        "test.publisher-version",
        "insert into campaign.campaign_versions(id,location_id,campaign_id,campaign_ref,campaign_version_ref,version_no,location_ref,input_versions,manifest,manifest_hash,created_by_actor_id,created_by_actor_ref,created_at) values($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,1,$6::text,$11::text::jsonb,$7::text::jsonb,$8::text,$9::uuid,$10::text,$12::timestamptz)",
        [
          versionId,
          f.principal.locationId,
          campaignId,
          p.campaignRef,
          p.campaignVersionRef,
          p.locationRef,
          JSON.stringify(evidence.version.manifest),
          p.manifestHash,
          f.principal.actorId,
          f.principal.actorRef,
          JSON.stringify(evidence.version.inputVersions),
          evidence.version.createdAt,
        ],
      ),
    );
    await c.execute(
      request(
        "test.publisher-preflight",
        "insert into campaign.preflight_results(location_id,campaign_id,campaign_version_id,campaign_ref,campaign_version_ref,manifest_hash,result_hash,ruleset_version_ref,blocking,findings,input_versions,evaluated_at) values($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::text,'ruleset_webinarAd001',false,'[]',$8::text::jsonb,$9::timestamptz)",
        [
          f.principal.locationId,
          campaignId,
          versionId,
          p.campaignRef,
          p.campaignVersionRef,
          p.manifestHash,
          p.preflightHash,
          JSON.stringify(evidence.preflight.inputVersions),
          evidence.preflight.evaluatedAt,
        ],
      ),
    );
    await c.execute(
      request(
        "test.publisher-approval",
        "insert into campaign.approval_decisions(location_id,campaign_id,campaign_version_id,approval_ref,location_ref,campaign_ref,campaign_version_ref,manifest_hash,preflight_result_hash,actor_id,actor_ref,actor_kind,actor_role,decided_at,ip_audit_hash,decision,snapshot) values($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::uuid,$11::text,'human','location_admin',$13::timestamptz,repeat('a',64),'approved',$12::text::jsonb)",
        [
          f.principal.locationId,
          campaignId,
          versionId,
          p.approvalRef,
          p.locationRef,
          p.campaignRef,
          p.campaignVersionRef,
          p.manifestHash,
          p.preflightHash,
          f.principal.actorId,
          f.principal.actorRef,
          JSON.stringify(evidence.approval.snapshot),
          evidence.approval.decidedAt,
        ],
      ),
    );
  });
  const authority = {
    currentPrincipal: async (p) => p,
    assertEvidenceCurrent: async () => {},
    assertDispatch: async () => {},
    assertCheckpoint: async () => {},
  };
  const repo = new PostgresWebinarPublisherRepository(
    pool,
    authority,
    "correlation_publisherPg001",
  );
  async function admin(text, values = []) {
    return withMigrationOwnerTransaction(pool, (c) =>
      c.execute(request("test.publisher-admin", text, values)),
    );
  }
  async function admit(kind, normalized) {
    const receipt = {
      ...f.receipt,
      kind,
      admissionRef: `admission_${randomUUID().replaceAll("-", "")}`,
      normalized,
    };
    await admin(
      "select campaign.webinar_publisher_admit($1::uuid,$2::uuid,$3::uuid,$4::text::jsonb)",
      [f.principal.locationId, f.principal.actorId, installationId, JSON.stringify(receipt)],
    );
  }
  async function reserve(action = "draft", expectedRowVersion = 1, expectedState = "reserved") {
    const launch = await repo.run(f.principal, (tx) =>
      tx.loadLaunch(f.summary.projection.projectionRef),
    );
    const operation = {
      ...f.operation,
      requestId: randomUUID(),
      operationRef: `operation_${randomUUID().replaceAll("-", "")}`,
      action,
      expectedRowVersion,
      nativeIdsAtConfirmation: launch.nativeIds,
    };
    const task = { ...f.task, operationRef: operation.operationRef, action };
    operation.confirmationHash = webinarPublisherConfirmationHash({
      action,
      summary: f.summary,
      nativeIds: launch.nativeIds,
    });
    operation.requestHash = canonicalCampaignHash({
      requestId: operation.requestId,
      projectionRef: operation.projectionRef,
      expectedProjectionHash: operation.projectionHash,
      expectedRowVersion,
      action,
      confirmationHash: operation.confirmationHash,
    });
    await repo.run(f.principal, (tx) =>
      tx.reserveCommand({
        operation,
        task,
        expectedRowVersion,
        expectedState,
        principal: f.principal,
      }),
    );
    return { operation, task };
  }
  async function cleanup() {
    await withMigrationOwnerTransaction(pool, async (c) => {
      for (const table of [
        "campaign.webinar_publisher_attempts",
        "integration.webinar_publisher_outbox",
        "campaign.webinar_publisher_operations",
        "campaign.webinar_publisher_launches",
        "campaign.webinar_publisher_admissions",
      ])
        await c.execute(
          request("test.publisher-clean", `delete from ${table} where location_id=$1::uuid`, [
            f.principal.locationId,
          ]),
        );
      // Existing shared cleanup owns append-only trigger management, not this file.
    });
    // Disposable integration database is dropped by the canonical gate; leave original immutable
    // source evidence in place instead of introducing a second privileged cleanup implementation.
    if (sharedPool === undefined) await pool.close();
  }
  await repo.run(f.principal, (tx) => tx.insertSummary(f.summary));
  await admit("qualification", f.proof);
  return { ...f, evidence, pool, repo, admin, admit, reserve, cleanup };
}
describe("native webinar publisher real PostgreSQL fences", { concurrency: false }, () => {
  it("discovers only owned unprocessed active tasks and removes canceled lineage from pending work", async () => {
    const f = await fixture();
    // Reuse the same pool so alternating tenant requests also exercise context restoration.
    const other = await fixture(f.pool);
    try {
      assert.deepEqual(await f.repo.pendingTasks(f.principal), []);
      const own = await f.reserve();
      const foreign = await other.reserve();
      assert.deepEqual(await f.repo.pendingTasks(f.principal, 1), [own.task]);
      assert.deepEqual(await other.repo.pendingTasks(other.principal), [foreign.task]);
      await f.admin(
        "update integration.webinar_publisher_outbox set processed_at=clock_timestamp() where location_id=$1::uuid and operation_ref=$2::text",
        [f.principal.locationId, own.operation.operationRef],
      );
      assert.deepEqual(await f.repo.pendingTasks(f.principal), []);
      assert.deepEqual(await other.repo.pendingTasks(other.principal), [foreign.task]);
      const cancel = await f.reserve("cancel", 2, "reserved");
      assert.deepEqual(await f.repo.pendingTasks(f.principal), [cancel.task]);
      assert.deepEqual(await other.repo.pendingTasks(other.principal), [foreign.task]);
      const stopped = await f.repo.claim(f.principal, {
        task: cancel.task,
        workerRef: "worker_pendingStop001",
        leaseSeconds: 60,
      });
      assert.equal(stopped.status, "leased");
      assert.equal(stopped.operation.stage, "complete");
      assert.equal(stopped.launch.state, "cancelled");
      assert.deepEqual(await f.repo.pendingTasks(f.principal), []);
      assert.deepEqual(await other.repo.pendingTasks(other.principal), [foreign.task]);
    } finally {
      await other.cleanup();
      await f.cleanup();
    }
  });
  it("loads the actual strict version, preflight and SDK approval without stripping nested nulls", async () => {
    const f = await fixture();
    try {
      const evidence = await f.repo.run(f.principal, (tx) =>
        tx.loadCurrentEvidence(f.summary.projection.campaignRef),
      );
      assert.deepEqual(evidence, f.evidence);
      assert.equal(evidence.version.manifest.schedule.startsAt, null);
      assert.equal("sourceCampaignRef" in evidence.version, false);
    } finally {
      await f.cleanup();
    }
  });
  it("ordinary request role cannot admit an App Test-shaped record even with known tenant IDs", async () => {
    const f = await fixture();
    const connection = await f.pool.connect();
    try {
      await connection.execute(request("test.publisher-runtime-begin", "begin"));
      await connection.execute(
        request("test.publisher-runtime-role", "set local role app_runtime"),
      );
      await assert.rejects(
        connection.execute(
          request(
            "test.publisher-forged-admission",
            "select campaign.webinar_publisher_admit($1::uuid,$2::uuid,$3::uuid,$4::text::jsonb)",
            [
              f.principal.locationId,
              f.principal.actorId,
              parseInstallationRef(f.principal.installationRef),
              JSON.stringify({ ...f.receipt, kind: "qualification", normalized: f.proof }),
            ],
          ),
        ),
        (error) => error.code === "42501",
      );
    } finally {
      await connection.execute(request("test.publisher-runtime-rollback", "rollback"));
      await connection.release();
      await f.cleanup();
    }
  });
  it("ends an expired operation at its bounded deadline without dispatch", async () => {
    const f = await fixture();
    try {
      await f.admin(
        "insert into campaign.webinar_publisher_operations(location_id,operation_ref,projection_ref,actor_id,request_id,request_hash,operation,action,cancellation_generation,deadline_at) values($1::uuid,$2::text,$3::text,$4::uuid,$5::uuid,$6::text,$7::text::jsonb,'draft',0,clock_timestamp()-interval '1 second')",
        [
          f.principal.locationId,
          f.operation.operationRef,
          f.operation.projectionRef,
          f.principal.actorId,
          f.operation.requestId,
          f.operation.requestHash,
          JSON.stringify(f.operation),
        ],
      );
      await f.admin(
        "insert into integration.webinar_publisher_outbox(location_id,operation_ref,payload) values($1::uuid,$2::text,$3::text::jsonb)",
        [f.principal.locationId, f.operation.operationRef, JSON.stringify(f.task)],
      );
      const result = await f.repo.claim(f.principal, {
        task: f.task,
        workerRef: "worker_deadline001",
        leaseSeconds: 60,
      });
      assert.equal(result.status, "deadline");
      assert.equal(
        (await f.repo.readWorker(f.principal, f.operation.operationRef)).operation.state,
        "blocked",
      );
      assert.equal(
        (
          await f.admin(
            "select count(*)::integer as total from campaign.webinar_publisher_attempts where location_id=$1::uuid",
            [f.principal.locationId],
          )
        ).rows[0].total,
        0,
      );
    } finally {
      await f.cleanup();
    }
  });
  for (const expired of [
    {
      name: "publish acknowledgement",
      action: "publish",
      state: "publish_queued",
      stage: "progress",
      attemptStage: "publish",
      ids: true,
    },
    {
      name: "pause acknowledgement",
      action: "pause",
      state: "pause_pending",
      stage: "progress",
      attemptStage: "pause",
      ids: true,
    },
    {
      name: "resume acknowledgement",
      action: "resume",
      state: "resume_pending",
      stage: "progress",
      attemptStage: "resume",
      ids: true,
    },
    {
      name: "confirmed draft creation",
      action: "draft",
      state: "drafting",
      stage: "adset",
      attemptStage: "campaign",
      ids: true,
    },
    {
      name: "confirmed response with missing retained IDs",
      action: "draft",
      state: "drafting",
      stage: "campaign",
      attemptStage: "campaign",
      ids: false,
    },
    {
      name: "retained native lineage before current operation dispatch",
      action: "pause",
      state: "reserved",
      stage: "queued",
      attemptStage: null,
      ids: true,
    },
  ]) {
    it(`keeps expired ${expired.name} uncertain until independently observed`, async () => {
      const f = await fixture();
      try {
        const ids = expired.ids
          ? {
              campaignId: "native_deadlineCampaign001",
              adsetId: "native_deadlineAdset001",
              adId: "native_deadlineAd001",
            }
          : f.launch.nativeIds;
        const observedAt = f.operation.createdAt;
        const operation = {
          ...f.operation,
          action: expired.action,
          state: expired.state,
          stage: expired.stage,
          leaseGeneration: 1,
          nativeIdsAtConfirmation: ids,
          providerObservedAt: expired.attemptStage === null ? null : observedAt,
        };
        operation.confirmationHash = webinarPublisherConfirmationHash({
          action: expired.action,
          summary: f.summary,
          nativeIds: ids,
        });
        operation.requestHash = canonicalCampaignHash({
          requestId: operation.requestId,
          projectionRef: operation.projectionRef,
          expectedProjectionHash: operation.projectionHash,
          expectedRowVersion: 1,
          action: expired.action,
          confirmationHash: operation.confirmationHash,
        });
        const task = { ...f.task, action: expired.action };
        await f.admin(
          "update campaign.webinar_publisher_launches set native_ids=$2::text::jsonb,state=$3::text where location_id=$1::uuid",
          [f.principal.locationId, JSON.stringify(ids), expired.state],
        );
        // Deadline is fixed before insertion. The immutable deadline trigger is never disabled.
        // These synthetic rows are the actual persisted result of an ACK/checkpoint, not live proof.
        await f.admin(
          "insert into campaign.webinar_publisher_operations(location_id,operation_ref,projection_ref,actor_id,request_id,request_hash,operation,action,stage,cancellation_generation,lease_generation,worker_ref,deadline_at) values($1::uuid,$2::text,$3::text,$4::uuid,$5::uuid,$6::text,$7::text::jsonb,$8::text,$9::text,0,1,'worker_acknowledged001',clock_timestamp()-interval '1 second')",
          [
            f.principal.locationId,
            operation.operationRef,
            operation.projectionRef,
            f.principal.actorId,
            operation.requestId,
            operation.requestHash,
            JSON.stringify(operation),
            expired.action,
            expired.stage,
          ],
        );
        await f.admin(
          "insert into integration.webinar_publisher_outbox(location_id,operation_ref,payload) values($1::uuid,$2::text,$3::text::jsonb)",
          [f.principal.locationId, operation.operationRef, JSON.stringify(task)],
        );
        if (expired.attemptStage !== null)
          await f.admin(
            "insert into campaign.webinar_publisher_attempts(location_id,operation_ref,stage,generation,request_hash,status,read_back_hash,provider_observed_at) values($1::uuid,$2::text,$3::text,1,$4::text,'confirmed',$5::text,$6::timestamptz)",
            [
              f.principal.locationId,
              operation.operationRef,
              expired.attemptStage,
              "a".repeat(64),
              "b".repeat(64),
              observedAt,
            ],
          );
        assert.equal(
          (
            await f.repo.claim(f.principal, {
              task,
              workerRef: "worker_deadlineReplacement001",
              leaseSeconds: 60,
            })
          ).status,
          "deadline",
        );
        const record = await f.repo.readWorker(f.principal, operation.operationRef);
        assert.equal(record.operation.state, "uncertain");
        assert.equal(record.operation.stage, "reconcile");
        assert.equal(record.operation.lastSafeFailure, "WRITE_UNCERTAIN");
        assert.equal(record.launch.state, "uncertain");
        assert.deepEqual(record.launch.nativeIds, ids);
        assert.equal(record.operation.providerObservedAt, operation.providerObservedAt);
        for (const key of [
          "operationRef",
          "requestId",
          "requestHash",
          "confirmationHash",
          "summaryHash",
          "projectionHash",
          "correlationRef",
        ])
          assert.equal(record.operation[key], operation[key]);
        assert.equal(record.leaseExpiresAt, null);
        await assert.rejects(
          f.repo.claim(f.principal, {
            task,
            workerRef: "worker_noBlindRetry001",
            leaseSeconds: 60,
          }),
          /FENCED/,
        );
        const attempts = await f.admin(
          "select status,request_hash,read_back_hash,provider_observed_at from campaign.webinar_publisher_attempts where location_id=$1::uuid and operation_ref=$2::text",
          [f.principal.locationId, operation.operationRef],
        );
        assert.equal(attempts.rows.length, expired.attemptStage === null ? 0 : 1);
        if (attempts.rows.length) {
          assert.equal(attempts.rows[0].status, "confirmed");
          assert.equal(attempts.rows[0].request_hash, "a".repeat(64));
        }
        assert.deepEqual(await f.repo.pendingTasks(f.principal), []);
        if (expired.name === "publish acknowledgement") {
          await f.admit("pause", {
            schemaVersion: 1,
            contractId: "CTR-003",
            contractRevision: 1,
            kind: "app_test",
            action: "pause",
            evidenceRef: "evidence_deadlinePause001",
            artifactHash: "9".repeat(64),
            projectionHash: operation.projectionHash,
            wireMappingHash: f.summary.projection.providerContract.wireMappingHash,
            locationId: f.summary.projection.assets.locationId,
            adAccountId: f.summary.projection.assets.adAccountId,
            campaignId: ids.campaignId,
            observedAt: f.proof.observedAt,
            expiresAt: f.proof.expiresAt,
          });
          const pause = await f.reserve("pause", record.launch.rowVersion, "uncertain");
          assert.equal(pause.operation.action, "pause");
          assert.equal(
            (
              await f.repo.claim(f.principal, {
                task: pause.task,
                workerRef: "worker_safetyPause001",
                leaseSeconds: 60,
              })
            ).status,
            "leased",
          );
        }
      } finally {
        await f.cleanup();
      }
    });
  }
  it("refuses a nonexistent first-party session and stale role version", async () => {
    const f = await fixture();
    try {
      const p = {
        ...f.principal,
        authenticationMode: "first_party",
        sessionId: `session_${randomUUID().replaceAll("-", "")}`,
      };
      await assert.rejects(
        f.repo.run(p, (tx) => tx.loadLaunch(f.operation.projectionRef)),
        /AUTHORITY_WITHDRAWN/,
      );
      await assert.rejects(
        f.repo.run({ ...f.principal, roleVersion: f.principal.roleVersion + 1 }, (tx) =>
          tx.loadLaunch(f.operation.projectionRef),
        ),
        /AUTHORITY_WITHDRAWN/,
      );
    } finally {
      await f.cleanup();
    }
  });
  it("expired proof and canceled entitlement block new spend without disabling a stop control", async () => {
    const f = await fixture();
    try {
      await f.admin(
        "update campaign.webinar_publisher_admissions set expires_at=clock_timestamp()-interval '1 second' where location_id=$1::uuid",
        [f.principal.locationId],
      );
      await assert.rejects(f.reserve(), /PROVIDER_UNQUALIFIED/);
      await f.admit("qualification", f.proof);
      await f.admin(
        "update billing.entitlement_versions set status='canceled' where location_id=$1::uuid",
        [f.principal.locationId],
      );
      await assert.rejects(f.reserve(), /AUTHORITY_WITHDRAWN/);
      const cancel = await f.reserve("cancel", 1, "reserved");
      const stopped = await f.repo.claim(f.principal, {
        task: cancel.task,
        workerRef: "worker_expiredStop001",
        leaseSeconds: 60,
      });
      assert.equal(stopped.operation.state, "cancelled");
    } finally {
      await f.cleanup();
    }
  });
  it("allows an owned pause after destination withdrawal using its independent transport proof", async () => {
    const f = await fixture();
    try {
      const nativeIds = {
        campaignId: "native_owned001",
        adsetId: "native_adset001",
        adId: "native_ad001",
      };
      await f.admin(
        "update campaign.webinar_publisher_launches set native_ids=$2::text::jsonb,state='live' where location_id=$1::uuid",
        [f.principal.locationId, JSON.stringify(nativeIds)],
      );
      await f.admin("update campaign.funnel_publications set active=false where id=$1::uuid", [
        f.summary.projection.destination.publicationId,
      ]);
      await f.admit("pause", {
        schemaVersion: 1,
        contractId: "CTR-003",
        contractRevision: 1,
        kind: "app_test",
        action: "pause",
        evidenceRef: "evidence_pausePg001",
        artifactHash: "9".repeat(64),
        projectionHash: f.operation.projectionHash,
        wireMappingHash: f.summary.projection.providerContract.wireMappingHash,
        locationId: f.summary.projection.assets.locationId,
        adAccountId: f.summary.projection.assets.adAccountId,
        campaignId: nativeIds.campaignId,
        observedAt: f.proof.observedAt,
        expiresAt: f.proof.expiresAt,
      });
      const pause = await f.reserve("pause", 1, "live");
      const lease = await f.repo.claim(f.principal, {
        task: pause.task,
        workerRef: "worker_pausePg001",
        leaseSeconds: 60,
      });
      assert.equal(lease.operation.stage, "pause");
      await f.repo.beginDispatch(f.principal, {
        operationRef: pause.operation.operationRef,
        workerRef: "worker_pausePg001",
        leaseGeneration: lease.operation.leaseGeneration,
        expectedStage: "pause",
        requestHash: "a".repeat(64),
      });
      assert.equal(
        (await f.repo.readWorker(f.principal, pause.operation.operationRef)).launch.state,
        "pause_pending",
      );
    } finally {
      await f.cleanup();
    }
  });
  it("checks parent IDs and separately admitted actual provider standing before declaring live", async () => {
    const f = await fixture();
    try {
      const { operation, task } = await f.reserve();
      assert.deepEqual(await f.repo.pendingTasks(f.principal), [task]);
      const lease = await f.repo.claim(f.principal, {
        task,
        workerRef: "worker_parent001",
        leaseSeconds: 60,
      });
      const dispatch = {
        operationRef: operation.operationRef,
        workerRef: "worker_parent001",
        leaseGeneration: lease.operation.leaseGeneration,
        expectedStage: "campaign",
        requestHash: "a".repeat(64),
      };
      await f.repo.beginDispatch(f.principal, dispatch);
      await assert.rejects(
        f.repo.checkpoint(f.principal, {
          ...dispatch,
          stage: "adset",
          state: "drafting",
          nativeIds: { campaignId: null, adsetId: null, adId: null },
          providerObservedAt: new Date().toISOString(),
          readBackHash: "b".repeat(64),
        }),
        /PARENT_MISMATCH/,
      );
      const checkpoint = {
        ...dispatch,
        stage: "adset",
        state: "drafting",
        nativeIds: { campaignId: "native_parent001", adsetId: null, adId: null },
        providerObservedAt: new Date().toISOString(),
        readBackHash: "b".repeat(64),
      };
      await f.repo.checkpoint(f.principal, checkpoint);
      await f.repo.beginDispatch(f.principal, { ...dispatch, expectedStage: "adset" });
      await assert.rejects(
        f.repo.checkpoint(f.principal, {
          ...checkpoint,
          expectedStage: "adset",
          stage: "ad",
          nativeIds: { campaignId: "native_foreign001", adsetId: "native_child001", adId: null },
        }),
        /PARENT_MISMATCH/,
      );
      await f.repo.markUncertain(f.principal, {
        operationRef: operation.operationRef,
        workerRef: "worker_parent001",
        leaseGeneration: lease.operation.leaseGeneration,
        expectedStage: "adset",
      });
      await assert.rejects(
        f.repo.checkpoint(f.principal, {
          ...checkpoint,
          expectedStage: "reconcile",
          stage: "complete",
          state: "live",
          nativeIds: {
            campaignId: "native_parent001",
            adsetId: "native_child001",
            adId: "native_ad001",
          },
        }),
        /OBSERVATION_UNQUALIFIED/,
      );
      const observed = {
        projectionHash: f.operation.projectionHash,
        nativeIds: checkpoint.nativeIds,
        state: "paused",
        readBackHash: checkpoint.readBackHash,
        observedAt: checkpoint.providerObservedAt,
        facebookIds: { campaignId: null, adsetId: null, adId: null },
        metrics: { impressions: null, clicks: null, spendMinor: null },
      };
      await f.admit("observation", observed);
      const result = await f.repo.checkpoint(f.principal, {
        ...checkpoint,
        expectedStage: "reconcile",
        stage: "complete",
        state: "paused",
      });
      assert.equal(result.launch.state, "paused");
    } finally {
      await f.cleanup();
    }
  });
  it("reloads immutable owned summary, refuses foreign owner and discovery without admission", async () => {
    const f = await fixture();
    try {
      assert.deepEqual(
        await f.repo.run(f.principal, (tx) => tx.loadLaunch(f.summary.projection.projectionRef)),
        f.launch,
      );
      await assert.rejects(
        f.repo.run(
          {
            ...f.principal,
            actorRef: "actor_00000000000040008000000000009999",
            actorId: "00000000-0000-4000-8000-000000009999",
          },
          (tx) => tx.loadLaunch(f.summary.projection.projectionRef),
        ),
      );
      await assert.rejects(
        f.repo.run(f.principal, (tx) =>
          tx.resolveSelection({ version: {}, selection: f.summary.selection }),
        ),
        /DISCOVERY_UNQUALIFIED/,
      );
      await f.admit("selection", f.receipt.normalized);
      assert.deepEqual(
        await f.repo.run(f.principal, (tx) =>
          tx.resolveSelection({ version: {}, selection: f.summary.selection }),
        ),
        f.resolved,
      );
    } finally {
      await f.cleanup();
    }
  });
  it("atomic reservation rolls back outbox on callback error, replays UUID and conflicts on different content", async () => {
    const f = await fixture();
    try {
      await assert.rejects(
        f.repo.run(f.principal, async (tx) => {
          await tx.reserveCommand({
            operation: f.operation,
            task: f.task,
            expectedRowVersion: 1,
            expectedState: "reserved",
            principal: f.principal,
          });
          throw new Error("rollback");
        }),
      );
      assert.equal(
        (
          await f.admin(
            "select count(*)::integer as total from integration.webinar_publisher_outbox where location_id=$1::uuid",
            [f.principal.locationId],
          )
        ).rows[0].total,
        0,
      );
      const input = {
        operation: f.operation,
        task: f.task,
        expectedRowVersion: 1,
        expectedState: "reserved",
        principal: f.principal,
      };
      await f.repo.run(f.principal, (tx) => tx.reserveCommand(input));
      assert.deepEqual(
        await f.repo.run(f.principal, (tx) => tx.findCommand(f.operation.requestId)),
        f.operation,
      );
      await f.repo.run(f.principal, (tx) => tx.reserveCommand(input));
      await assert.rejects(
        f.repo.run(f.principal, (tx) =>
          tx.reserveCommand({
            ...input,
            operation: { ...f.operation, requestHash: "0".repeat(64) },
          }),
        ),
        /REQUEST_CONFLICT|HASH_MISMATCH/,
      );
      assert.equal(
        (
          await f.admin(
            "select count(*)::integer as total from integration.webinar_publisher_outbox where location_id=$1::uuid",
            [f.principal.locationId],
          )
        ).rows[0].total,
        1,
      );
    } finally {
      await f.cleanup();
    }
  });
  it("concurrent independent requests allow only one active lineage", async () => {
    const f = await fixture();
    try {
      const results = await Promise.allSettled([f.reserve(), f.reserve()]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        (
          await f.admin(
            "select count(*)::integer as total from campaign.webinar_publisher_operations where location_id=$1::uuid and active",
            [f.principal.locationId],
          )
        ).rows[0].total,
        1,
      );
    } finally {
      await f.cleanup();
    }
  });
  it("fences stale claims, admits a dispatch once and reconciles a lost response", async () => {
    const f = await fixture();
    try {
      const { operation, task } = await f.reserve();
      await f.admit("qualification", f.proof);
      const lease = await f.repo.claim(f.principal, {
        task,
        workerRef: "worker_first001",
        leaseSeconds: 60,
      });
      assert.equal(lease.status, "leased");
      const dispatch = {
        operationRef: operation.operationRef,
        workerRef: "worker_first001",
        leaseGeneration: lease.operation.leaseGeneration,
        expectedStage: "campaign",
        requestHash: "a".repeat(64),
      };
      await f.repo.beginDispatch(f.principal, dispatch);
      await assert.rejects(f.repo.beginDispatch(f.principal, dispatch));
      await f.admin(
        "update campaign.webinar_publisher_operations set lease_expires_at=clock_timestamp()-interval '1 second' where location_id=$1::uuid",
        [f.principal.locationId],
      );
      const replacement = await f.repo.claim(f.principal, {
        task,
        workerRef: "worker_second001",
        leaseSeconds: 60,
      });
      assert.equal(replacement.operation.stage, "reconcile");
      assert.equal(replacement.operation.state, "uncertain");
      await assert.rejects(
        f.repo.markUncertain(f.principal, {
          operationRef: operation.operationRef,
          workerRef: "worker_first001",
          leaseGeneration: lease.operation.leaseGeneration,
          expectedStage: "campaign",
        }),
        /FENCED/,
      );
      await assert.rejects(
        f.repo.beginDispatch(f.principal, {
          ...dispatch,
          workerRef: "worker_second001",
          leaseGeneration: replacement.operation.leaseGeneration,
          expectedStage: "reconcile",
        }),
        /STAGE_INVALID/,
      );
    } finally {
      await f.cleanup();
    }
  });
  it("cancels queued work immediately and fences the old task before dispatch", async () => {
    const f = await fixture();
    try {
      const old = await f.reserve();
      const cancel = await f.reserve("cancel", 2, "reserved");
      await assert.rejects(
        f.repo.claim(f.principal, {
          task: old.task,
          workerRef: "worker_stale001",
          leaseSeconds: 60,
        }),
        /FENCED/,
      );
      const stopped = await f.repo.claim(f.principal, {
        task: cancel.task,
        workerRef: "worker_cancel001",
        leaseSeconds: 60,
      });
      assert.equal(stopped.operation.state, "cancelled");
      assert.equal(stopped.operation.stage, "complete");
    } finally {
      await f.cleanup();
    }
  });
  it("cancellation during a possible write is uncertain, never reports a recalled remote effect", async () => {
    const f = await fixture();
    try {
      const old = await f.reserve();
      await f.admit("qualification", f.proof);
      const lease = await f.repo.claim(f.principal, {
        task: old.task,
        workerRef: "worker_effect001",
        leaseSeconds: 60,
      });
      await f.repo.beginDispatch(f.principal, {
        operationRef: old.operation.operationRef,
        workerRef: "worker_effect001",
        leaseGeneration: lease.operation.leaseGeneration,
        expectedStage: "campaign",
        requestHash: "a".repeat(64),
      });
      const launch = await f.repo.run(f.principal, (tx) =>
        tx.loadLaunch(f.operation.projectionRef),
      );
      const cancel = await f.reserve("cancel", launch.rowVersion, launch.state);
      const stopped = await f.repo.claim(f.principal, {
        task: cancel.task,
        workerRef: "worker_cancel002",
        leaseSeconds: 60,
      });
      assert.equal(stopped.operation.state, "uncertain");
      assert.equal(stopped.operation.stage, "reconcile");
    } finally {
      await f.cleanup();
    }
  });
  it("current publication withdrawal and revoked provider admission block dispatch", async () => {
    const f = await fixture();
    try {
      const old = await f.reserve();
      await f.admit("qualification", f.proof);
      const lease = await f.repo.claim(f.principal, {
        task: old.task,
        workerRef: "worker_withdraw001",
        leaseSeconds: 60,
      });
      const dispatch = {
        operationRef: old.operation.operationRef,
        workerRef: "worker_withdraw001",
        leaseGeneration: lease.operation.leaseGeneration,
        expectedStage: "campaign",
        requestHash: "a".repeat(64),
      };
      await f.admin(
        "update campaign.webinar_publisher_admissions set revoked_at=now() where location_id=$1::uuid",
        [f.principal.locationId],
      );
      await assert.rejects(f.repo.beginDispatch(f.principal, dispatch), /PROVIDER_UNQUALIFIED/);
      await f.admit("qualification", f.proof);
      await f.admin("update campaign.funnel_publications set active=false where id=$1::uuid", [
        f.summary.projection.destination.publicationId,
      ]);
      await assert.rejects(f.repo.beginDispatch(f.principal, dispatch), /EVIDENCE_CHANGED/);
    } finally {
      await f.cleanup();
    }
  });
  it("revoked owner or installation refuses current replay/claim", async () => {
    const f = await fixture();
    try {
      const old = await f.reserve();
      await f.admin(
        "update platform.marketplace_installations set status='revoked' where id=$1::uuid",
        [parseInstallationRef(f.principal.installationRef)],
      );
      await assert.rejects(
        f.repo.run(f.principal, (tx) => tx.findCommand(old.operation.requestId)),
        /AUTHORITY_WITHDRAWN/,
      );
      await assert.rejects(
        f.repo.claim(f.principal, {
          task: old.task,
          workerRef: "worker_revoked001",
          leaseSeconds: 60,
        }),
        /AUTHORITY_WITHDRAWN/,
      );
    } finally {
      await f.cleanup();
    }
  });
});
