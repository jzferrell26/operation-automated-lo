import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import {
  prepareFinancingRelease,
  transitionFinancingRelease,
  captureFinancingInquiry,
  canonicalCampaignHash as hash,
} from "../../application/dist/index.js";
import {
  PostgresFinancingReleaseRepository,
  admitVerifiedFinancingEvidence,
  createPostgresCampaignVersionRepository,
  findPublicFinancingRelease,
  PostgresPublicFinancingReleaseRepository,
  purgeExpiredMarketingInquiries,
} from "../dist/index.js";
import {
  requiredTestDatabaseUrl,
  testPool,
  tenantFixture,
  principalFixture,
  seedTenant,
  withMigrationOwnerTransaction,
  request,
} from "./campaign-integration-support.mjs";
import {
  financingSourceFixture,
  sourceEvidence,
  admissionFixture,
  prepareRequest,
  releasePorts,
  inquiryFixture,
  cryptoFixture,
} from "./financing-release-fixture.mjs";

const databaseUrl = requiredTestDatabaseUrl();
async function fixture(lifetime) {
  const tenant = tenantFixture("finrelease", randomUUID().replaceAll("-", "").slice(0, 10));
  const pool = testPool(databaseUrl);
  let principal = principalFixture(tenant, "location_admin");
  await seedTenant(pool, tenant, "Synthetic financing release");
  const binding = await withMigrationOwnerTransaction(pool, (connection) =>
    connection.execute(
      request(
        "test.finance-current-role",
        "select platform.current_role_version($1::uuid,$2::uuid,'location_admin') as role_version",
        [tenant.locationId, tenant.actorId],
      ),
    ),
  );
  principal = { ...principal, roleVersion: Number(binding.rows[0].role_version) };
  const source = financingSourceFixture(principal, lifetime);
  await createPostgresCampaignVersionRepository(pool, {
    resolveTenantDatabaseContext: async () => tenant,
  }).run(async (tx) => {
    await tx.append(source.sourceVersion);
  });
  const repository = new PostgresFinancingReleaseRepository(
    pool,
    principal,
    tenant.correlationId,
    cryptoFixture(),
  );
  return {
    pool,
    principal: { actorRef: principal.actorRef, locationRef: principal.locationRef },
    tenant,
    source,
    repository,
    ports: releasePorts(repository, source),
    prepare: prepareRequest(source),
  };
}
async function admitted(f) {
  for (const [kind, proof] of sourceEvidence(f.source))
    await admitVerifiedFinancingEvidence(
      f.pool,
      admissionFixture(f.tenant.locationId, kind, proof),
    );
  await f.repository.saveSource(f.source);
  return f;
}
async function release(f) {
  return prepareFinancingRelease(f.prepare, f.principal, f.ports);
}
function transition(record) {
  return {
    requestId: randomUUID(),
    releaseRef: record.snapshot.releaseRef,
    expectedRevision: record.revision,
    expectedBundleHash: record.snapshot.bundleHash,
    expectedEvidenceHash: record.snapshot.evidenceHash,
  };
}
async function published(f) {
  const prepared = await release(f);
  const approved = await transitionFinancingRelease(
    "approve",
    transition(prepared),
    f.principal,
    f.ports,
  );
  return transitionFinancingRelease("publish", transition(approved), f.principal, f.ports);
}
async function ownerSql(f, name, text, values = []) {
  return withMigrationOwnerTransaction(f.pool, (connection) =>
    connection.execute(request(name, text, values)),
  );
}
async function withRawPublicSql(f, work) {
  const connection = await f.pool.connect();
  const execute = async (text, values = []) =>
    connection.execute(request("test.finance-public-raw", text, values));
  const value = async (text, values = []) => (await execute(text, values)).rows[0]?.value;
  const denied = async (text, values = []) => {
    await execute("savepoint finance_negative");
    try {
      return await value(text, values);
    } catch (error) {
      await execute("rollback to savepoint finance_negative");
      throw error;
    } finally {
      await execute("release savepoint finance_negative");
    }
  };
  try {
    await execute("begin");
    await execute("set local role financing_public_runtime");
    return await work({ execute, value, denied });
  } finally {
    try {
      await execute("rollback");
    } finally {
      await connection.release();
    }
  }
}
async function anotherPrivateSource(f) {
  const source = financingSourceFixture(f.principal);
  await createPostgresCampaignVersionRepository(f.pool, {
    resolveTenantDatabaseContext: async () => f.tenant,
  }).run(async (tx) => tx.append(source.sourceVersion));
  for (const [kind, proof] of sourceEvidence(source))
    await admitVerifiedFinancingEvidence(
      f.pool,
      admissionFixture(f.tenant.locationId, kind, proof),
    );
  await f.repository.saveSource(source);
  return { source, ports: releasePorts(f.repository, source), prepare: prepareRequest(source) };
}
// Fixtures intentionally remain in this disposable oalo_test_ database until the gate drops it.
// No new test receives trigger/role bypass capabilities or a hosted database URL.
describe("public financing PostgreSQL persistence", { concurrency: false }, () => {
  it("raw anonymous SQL cannot widen a legitimate scope by clearing/replacing flags or forging tenant/actor context", async () => {
    const f = await admitted(await fixture()),
      foreign = await admitted(await fixture());
    try {
      const live = await published(f),
        foreignLive = await published(foreign),
        separate = await anotherPrivateSource(f);
      const prepared = await prepareFinancingRelease(separate.prepare, f.principal, separate.ports);
      const revoked = await transitionFinancingRelease(
        "revoke",
        transition(prepared),
        f.principal,
        separate.ports,
      );
      const otherPrepared = await prepareFinancingRelease(
        { ...separate.prepare, requestId: randomUUID() },
        f.principal,
        separate.ports,
      );
      await withRawPublicSql(f, async ({ execute, value, denied }) => {
        const contextSql = "select campaign.financing_release_public_context($1::uuid,$2) as value";
        assert.ok(
          await value(contextSql, [
            live.snapshot.publicationId,
            live.snapshot.authority.origin.canonicalOrigin,
          ]),
        );
        for (const scope of [
          "",
          revoked.snapshot.releaseRef,
          otherPrepared.snapshot.releaseRef,
          foreignLive.snapshot.releaseRef,
        ]) {
          await execute(
            "select pg_catalog.set_config('app.financing_public_release',$1,true),pg_catalog.set_config('app.financing_authorized','yes',true)",
            [scope],
          );
          await execute(
            "select pg_catalog.set_config('app.location_id',$1,true),pg_catalog.set_config('app.actor_id',$2,true),pg_catalog.set_config('app.actor_type','user',true)",
            [foreign.tenant.locationId, foreign.tenant.actorId],
          );
          for (const record of [revoked, otherPrepared, foreignLive]) {
            assert.equal(
              await value("select campaign.financing_release_load($1) as value", [
                record.snapshot.releaseRef,
              ]),
              null,
            );
            assert.equal(
              await value("select campaign.financing_release_current($1::text::jsonb) as value", [
                JSON.stringify(record.snapshot),
              ]),
              false,
            );
          }
          for (const source of [separate.source, foreign.source])
            assert.equal(
              await value("select campaign.financing_release_source($1,$2,$3) as value", [
                source.sourceVersion.campaignRef,
                source.sourceVersion.campaignVersionRef,
                hash(source.authority),
              ]),
              null,
            );
          assert.equal(
            (
              await value("select campaign.financing_release_load($1) as value", [
                live.snapshot.releaseRef,
              ])
            ).snapshot.publicationId,
            live.snapshot.publicationId,
          );
        }
        assert.equal(
          await value(contextSql, [
            otherPrepared.snapshot.publicationId,
            live.snapshot.authority.origin.canonicalOrigin,
          ]),
          null,
        );
        assert.equal(
          await value(contextSql, [
            revoked.snapshot.publicationId,
            live.snapshot.authority.origin.canonicalOrigin,
          ]),
          null,
        );
        assert.equal(
          await value(contextSql, [
            foreignLive.snapshot.publicationId,
            foreignLive.snapshot.authority.origin.canonicalOrigin,
          ]),
          null,
        );
        assert.equal(
          await value(contextSql, [live.snapshot.publicationId, "https://wrong.example.invalid"]),
          null,
        );
        await execute(
          "select pg_catalog.set_config('app.location_id','not-a-uuid',true),pg_catalog.set_config('app.actor_id','not-a-uuid',true),pg_catalog.set_config('app.actor_type','system',true)",
        );
        assert.equal(
          (
            await value("select campaign.financing_release_load($1) as value", [
              live.snapshot.releaseRef,
            ])
          ).snapshot.publicationId,
          live.snapshot.publicationId,
        );
        assert.equal(
          await value("select campaign.financing_release_load($1) as value", [
            otherPrepared.snapshot.releaseRef,
          ]),
          null,
        );
        await assert.rejects(denied("select campaign.financing_release_export() as value"), {
          code: "42501",
        });
        await assert.rejects(
          denied(
            "select campaign.financing_release_authorize('location_admin',1,'embedded',null) as value",
          ),
          { code: "42501" },
        );
        await assert.rejects(
          denied("select count(*) as value from campaign.financing_release_public_scopes"),
          { code: "42501" },
        );
        await assert.rejects(
          denied(
            "select campaign.financing_release_capture($1,$2::uuid,$3,$4,$5::uuid,now(),now()+interval '30 days') as value",
            [
              otherPrepared.snapshot.releaseRef,
              randomUUID(),
              "a".repeat(64),
              "synthetic cipher unavailable",
              randomUUID(),
            ],
          ),
          { code: "P0001" },
        );
      });
      assert.equal((await f.repository.load(revoked.snapshot.releaseRef)).state, "revoked");
      assert.equal((await f.repository.load(otherPrepared.snapshot.releaseRef)).state, "prepared");
      const unchanged = await captureFinancingInquiry(
        live.snapshot.publicationId,
        live.snapshot.authority.origin.canonicalOrigin,
        inquiryFixture(),
        f.ports,
      );
      assert.equal(unchanged.deliveryState, "pending");
    } finally {
      await foreign.pool.close();
      await f.pool.close();
    }
  });
  it("forged anonymous settings without a scope, expired scope and prior-transaction scope cannot authorize reads", async () => {
    const f = await admitted(await fixture(12000));
    try {
      const live = await published(f),
        contextArgs = [live.snapshot.publicationId, live.snapshot.authority.origin.canonicalOrigin];
      await withRawPublicSql(f, async ({ execute, value, denied }) => {
        await execute(
          "select pg_catalog.set_config('app.financing_authorized','yes',true),pg_catalog.set_config('app.financing_public_release',$1,true),pg_catalog.set_config('app.location_id',$2,true),pg_catalog.set_config('app.actor_id',$3,true),pg_catalog.set_config('app.actor_type','user',true)",
          [live.snapshot.releaseRef, f.tenant.locationId, f.tenant.actorId],
        );
        await assert.rejects(
          denied("select campaign.financing_release_load($1) as value", [live.snapshot.releaseRef]),
          { code: "42501" },
        );
        assert.ok(
          await value(
            "select campaign.financing_release_public_context($1::uuid,$2) as value",
            contextArgs,
          ),
        );
        await execute("commit");
        const cleaned = await ownerSql(
          f,
          "test.finance-scope-cleanup",
          "select count(*)::integer as count from campaign.financing_release_public_scopes where location_id=$1::uuid",
          [f.tenant.locationId],
        );
        assert.equal(cleaned.rows[0].count, 0);
        await execute("begin");
        await execute("set local role financing_public_runtime");
        await assert.rejects(
          denied("select campaign.financing_release_load($1) as value", [live.snapshot.releaseRef]),
          { code: "42501" },
        );
        assert.ok(
          await value(
            "select campaign.financing_release_public_context($1::uuid,$2) as value",
            contextArgs,
          ),
        );
        await delay(Math.max(0, Date.parse(live.snapshot.validUntil) - Date.now()) + 20);
        await assert.rejects(
          denied("select campaign.financing_release_load($1) as value", [live.snapshot.releaseRef]),
          { code: "42501" },
        );
      });
      assert.equal(await findPublicFinancingRelease(f.pool, ...contextArgs), null);
    } finally {
      await f.pool.close();
    }
  });
  it("refuses setup without independently admitted evidence and binds exact existing campaign version", async () => {
    const f = await fixture();
    try {
      await assert.rejects(f.repository.saveSource(f.source), { code: "INELIGIBLE" });
      await admitted(f);
      assert.deepEqual(await f.repository.saveSource(f.source), f.source);
      const changed = structuredClone(f.source);
      changed.sourceVersion.manifest.property.description = "Detached synthetic edit";
      changed.sourceVersion.manifestHash = hash(changed.sourceVersion.manifest);
      await assert.rejects(f.repository.saveSource(changed), { code: "INELIGIBLE" });
    } finally {
      await f.pool.close();
    }
  });
  it("strict verifier service dedupes exact records, refuses conflicting provenance, and runtime cannot admit", async () => {
    const f = await fixture();
    try {
      const input = admissionFixture(
        f.tenant.locationId,
        "quote",
        f.source.authority.quoteEvidence[0].authority,
      );
      await admitVerifiedFinancingEvidence(f.pool, input);
      await admitVerifiedFinancingEvidence(f.pool, input);
      const persisted = await ownerSql(
        f,
        "test.finance-json-transport",
        "select jsonb_typeof(evidence) as evidence_type,jsonb_typeof(provenance) as provenance_type,evidence,provenance from campaign.financing_release_evidence where location_id=$1::uuid and record_ref=$2 and revision_ref=$3",
        [f.tenant.locationId, input.evidence.recordRef, input.evidence.revisionRef],
      );
      assert.deepEqual(persisted.rows, [
        {
          evidence_type: "object",
          provenance_type: "object",
          evidence: input.evidence,
          provenance: input.provenance,
        },
      ]);
      await assert.rejects(
        admitVerifiedFinancingEvidence(f.pool, {
          ...input,
          provenance: { ...input.provenance, receiptHash: "a".repeat(64) },
        }),
        { code: "CONFLICT" },
      );
      const result = await ownerSql(
        f,
        "test.finance-no-admission",
        "select has_function_privilege('app_runtime','campaign.financing_release_admit_evidence(uuid,text,jsonb,jsonb)','EXECUTE') as allowed",
      );
      assert.equal(result.rows[0].allowed, false);
    } finally {
      await f.pool.close();
    }
  });
  it("persists prepare, exact retry, self approval and publication with foreign tenant/host refusal", async () => {
    const f = await admitted(await fixture()),
      foreign = await fixture();
    try {
      const record = await release(f);
      assert.deepEqual(await release(f), record);
      const other = await foreign.repository.load(record.snapshot.releaseRef);
      assert.equal(other, null);
      const approved = await transitionFinancingRelease(
        "approve",
        transition(record),
        f.principal,
        f.ports,
      );
      const input = transition(approved);
      const live = await transitionFinancingRelease("publish", input, f.principal, f.ports);
      assert.deepEqual(
        await transitionFinancingRelease("publish", input, f.principal, f.ports),
        live,
      );
      assert.equal(
        (
          await findPublicFinancingRelease(
            f.pool,
            live.snapshot.publicationId,
            live.snapshot.authority.origin.canonicalOrigin,
          )
        ).revision,
        3,
      );
      assert.equal(
        await findPublicFinancingRelease(
          f.pool,
          live.snapshot.publicationId,
          "https://foreign.example.invalid",
        ),
        null,
      );
      await assert.rejects(
        release({ ...f, prepare: { ...f.prepare, propertyVersionRef: "property_changed001" } }),
        { code: "CONFLICT" },
      );
    } finally {
      await foreign.pool.close();
      await f.pool.close();
    }
  });
  it("rolls back a partially reserved operation and saved record after a later failure", async () => {
    const f = await admitted(await fixture());
    try {
      const record = await release(f),
        requestId = randomUUID();
      await assert.rejects(
        f.repository.transaction(f.principal.locationRef, async (tx) => {
          await tx.reserve("revoke", requestId, "b".repeat(64));
          const changed = {
            ...record,
            revision: 2,
            state: "revoked",
            revokedAt: new Date().toISOString(),
            revokedBy: f.principal.actorRef,
          };
          await tx.save(changed, 1);
          throw new Error("Synthetic work failure");
        }),
        { code: "UNAVAILABLE" },
      );
      assert.equal((await f.repository.load(record.snapshot.releaseRef)).state, "prepared");
      assert.deepEqual(
        await f.repository.transaction(f.principal.locationRef, (tx) =>
          tx.reserve("revoke", requestId, "b".repeat(64)),
        ),
        { state: "new" },
      );
    } finally {
      await f.pool.close();
    }
  });
  it("serializes concurrent same-key preparation and resumes original publication after serialization refusal", async () => {
    const f = await admitted(await fixture());
    try {
      const result = await Promise.allSettled([release(f), release(f)]);
      const fulfilled = result.filter((item) => item.status === "fulfilled");
      assert.ok(fulfilled.length >= 1);
      const original = fulfilled[0].value;
      for (const item of result)
        if (item.status === "fulfilled")
          assert.equal(item.value.snapshot.publicationId, original.snapshot.publicationId);
        else assert.equal(item.reason.code, "UNAVAILABLE");
      assert.equal((await release(f)).snapshot.publicationId, original.snapshot.publicationId);
      const count = await ownerSql(
        f,
        "test.finance-operation-count",
        "select count(*)::integer as count from campaign.financing_releases where location_id=$1::uuid",
        [f.tenant.locationId],
      );
      assert.equal(count.rows[0].count, 1);
    } finally {
      await f.pool.close();
    }
  });
  it("CAS refuses stale independent approvals and immutable snapshot replacement", async () => {
    const f = await admitted(await fixture());
    try {
      const record = await release(f);
      await transitionFinancingRelease("approve", transition(record), f.principal, f.ports);
      await assert.rejects(
        transitionFinancingRelease("approve", transition(record), f.principal, f.ports),
        { code: "CONFLICT" },
      );
      await assert.rejects(
        f.repository.transaction(f.principal.locationRef, (tx) =>
          tx.save({ ...record, revision: 3 }, 2),
        ),
        { code: "CONFLICT" },
      );
    } finally {
      await f.pool.close();
    }
  });
  it("withdrawn quote denies previously successful preparation retry, public lookup and new capture", async () => {
    const f = await admitted(await fixture());
    try {
      const live = await published(f),
        proof = f.source.authority.quoteEvidence[0].authority;
      await f.repository.withdrawEvidence(proof.recordRef, proof.revisionRef);
      await assert.rejects(release(f), { code: "INELIGIBLE" });
      assert.equal(
        await findPublicFinancingRelease(
          f.pool,
          live.snapshot.publicationId,
          live.snapshot.authority.origin.canonicalOrigin,
        ),
        null,
      );
      await assert.rejects(
        captureFinancingInquiry(
          live.snapshot.publicationId,
          live.snapshot.authority.origin.canonicalOrigin,
          inquiryFixture(),
          f.ports,
        ),
        { code: "NOT_FOUND" },
      );
      // Withdrawal remains available despite source ineligibility.
      assert.equal(
        (await transitionFinancingRelease("revoke", transition(live), f.principal, f.ports)).state,
        "revoked",
      );
    } finally {
      await f.pool.close();
    }
  });
  it("locks admitted evidence while capture work runs, then withdrawal denies the next operation", async () => {
    const f = await admitted(await fixture());
    try {
      const live = await published(f),
        proof = f.source.authority.disclosure;
      let unlock, entered;
      const ready = new Promise((resolve) => {
        entered = resolve;
      });
      const gate = new Promise((resolve) => {
        unlock = resolve;
      });
      const held = f.repository.transaction(f.principal.locationRef, async (tx) => {
        await tx.assertEvidenceCurrent(live.snapshot, new Date().toISOString());
        entered();
        await gate;
      });
      await ready;
      let withdrawn = false;
      const withdrawal = f.repository
        .withdrawEvidence(proof.recordRef, proof.revisionRef)
        .then(() => {
          withdrawn = true;
        });
      await delay(50);
      assert.equal(withdrawn, false);
      unlock();
      await held;
      await withdrawal;
      await assert.rejects(
        f.repository.transaction(f.principal.locationRef, (tx) =>
          tx.assertEvidenceCurrent(live.snapshot, new Date().toISOString()),
        ),
        { code: "INELIGIBLE" },
      );
    } finally {
      await f.pool.close();
    }
  });
  it("server-clock expiry during transaction work prevents committing the operation", async () => {
    const f = await admitted(await fixture(10000));
    try {
      const record = await release(f),
        requestId = randomUUID();
      await assert.rejects(
        f.repository.transaction(f.principal.locationRef, async (tx) => {
          await tx.reserve("approve", requestId, "d".repeat(64));
          await tx.assertEvidenceCurrent(record.snapshot, new Date().toISOString());
          await delay(Math.max(0, Date.parse(record.snapshot.validUntil) - Date.now()) + 20);
        }),
        { code: "INELIGIBLE" },
      );
      const count = await ownerSql(
        f,
        "test.finance-expiry-rollback",
        "select count(*)::integer as count from campaign.financing_release_operations where location_id=$1::uuid and request_id=$2::uuid",
        [f.tenant.locationId, requestId],
      );
      assert.equal(count.rows[0].count, 0);
    } finally {
      await f.pool.close();
    }
  });
  it("encrypted inquiry, original receipt and delivery operation commit atomically and changed content conflicts", async () => {
    const f = await admitted(await fixture());
    try {
      const live = await published(f),
        inquiry = inquiryFixture();
      const receipt = await captureFinancingInquiry(
        live.snapshot.publicationId,
        live.snapshot.authority.origin.canonicalOrigin,
        inquiry,
        f.ports,
      );
      assert.deepEqual(
        await captureFinancingInquiry(
          live.snapshot.publicationId,
          live.snapshot.authority.origin.canonicalOrigin,
          inquiry,
          f.ports,
        ),
        receipt,
      );
      await assert.rejects(
        captureFinancingInquiry(
          live.snapshot.publicationId,
          live.snapshot.authority.origin.canonicalOrigin,
          { ...inquiry, email: "changed@example.invalid" },
          f.ports,
        ),
        { code: "CONFLICT" },
      );
      const exported = await f.repository.exportInquiries();
      assert.equal(exported.length, 1);
      assert.equal(exported[0].payload.request.email, inquiry.email);
      assert.equal(exported[0].payload.attribution.bundleHash, live.snapshot.bundleHash);
      const stored = await ownerSql(
        f,
        "test.finance-cipher",
        "select payload_cipher,request_hash from campaign.financing_release_inquiries where location_id=$1::uuid",
        [f.tenant.locationId],
      );
      assert.equal(stored.rows[0].payload_cipher.includes(inquiry.email), false);
      assert.notEqual(
        stored.rows[0].request_hash,
        hash({
          publicationId: live.snapshot.publicationId,
          request: inquiry,
          consentHash: live.snapshot.authority.consentHash,
        }),
      );
      assert.equal(await f.repository.removeInquiry(receipt.inquiryId), true);
      assert.deepEqual(await f.repository.exportInquiries(), []);
      await assert.rejects(
        captureFinancingInquiry(
          live.snapshot.publicationId,
          live.snapshot.authority.origin.canonicalOrigin,
          inquiry,
          f.ports,
        ),
        { code: "INELIGIBLE" },
      );
    } finally {
      await f.pool.close();
    }
  });
  it("revocation retains owner unexpired export and stops anonymous access", async () => {
    const f = await admitted(await fixture());
    try {
      const live = await published(f);
      await captureFinancingInquiry(
        live.snapshot.publicationId,
        live.snapshot.authority.origin.canonicalOrigin,
        inquiryFixture(),
        f.ports,
      );
      await transitionFinancingRelease("revoke", transition(live), f.principal, f.ports);
      assert.equal((await f.repository.exportInquiries()).length, 1);
      assert.equal(
        await findPublicFinancingRelease(
          f.pool,
          live.snapshot.publicationId,
          live.snapshot.authority.origin.canonicalOrigin,
        ),
        null,
      );
    } finally {
      await f.pool.close();
    }
  });
  it("anonymous capture resolves exact owner without a synthetic session and has no private command capability", async () => {
    const f = await admitted(await fixture());
    try {
      const live = await published(f);
      const repository = new PostgresPublicFinancingReleaseRepository(
        f.pool,
        live.snapshot.publicationId,
        live.snapshot.authority.origin.canonicalOrigin,
        cryptoFixture(),
      );
      const publicPorts = {
        ...f.ports,
        transaction: (location, work) => repository.transaction(location, work),
        resolve: (_principal, selection) =>
          repository.resolveSource(
            selection.campaignRef,
            selection.campaignVersionRef,
            selection.evidenceHash ?? selection.expectedEvidenceHash,
          ),
        findPublication: () => repository.findPublication(),
      };
      const receipt = await captureFinancingInquiry(
        live.snapshot.publicationId,
        live.snapshot.authority.origin.canonicalOrigin,
        inquiryFixture(),
        publicPorts,
      );
      assert.equal(receipt.deliveryState, "pending");
      assert.equal((await f.repository.exportInquiries()).length, 1);
      await assert.rejects(
        repository.transaction(f.principal.locationRef, (tx) =>
          tx.reserve("revoke", randomUUID(), "a".repeat(64)),
        ),
        { code: "INELIGIBLE" },
      );
      const permissions = await ownerSql(
        f,
        "test.finance-public-permissions",
        "select has_function_privilege('financing_public_runtime','campaign.financing_release_authorize(text,bigint,text,uuid)','EXECUTE') as authorize,has_table_privilege('financing_public_runtime','campaign.financing_release_inquiries','SELECT') as raw",
      );
      assert.deepEqual(permissions.rows[0], { authorize: false, raw: false });
    } finally {
      await f.pool.close();
    }
  });
  it("new qualified evidence revision withdraws the previous source while retaining its history", async () => {
    const f = await admitted(await fixture());
    try {
      const live = await published(f),
        proof = f.source.authority.preset;
      const next = {
        ...proof,
        revisionRef: `revision_${randomUUID().replaceAll("-", "")}`,
        verificationRef: `verification_${randomUUID().replaceAll("-", "")}`,
      };
      await admitVerifiedFinancingEvidence(
        f.pool,
        admissionFixture(f.tenant.locationId, "preset", next),
      );
      await assert.rejects(
        f.repository.resolveSource(
          f.source.sourceVersion.campaignRef,
          f.source.sourceVersion.campaignVersionRef,
          hash(f.source.authority),
        ),
        { code: "INELIGIBLE" },
      );
      assert.equal(
        await findPublicFinancingRelease(
          f.pool,
          live.snapshot.publicationId,
          live.snapshot.authority.origin.canonicalOrigin,
        ),
        null,
      );
      const history = await ownerSql(
        f,
        "test.finance-evidence-history",
        "select count(*)::integer as total,count(revoked_at)::integer as withdrawn from campaign.financing_release_evidence where location_id=$1::uuid and record_ref=$2",
        [f.tenant.locationId, proof.recordRef],
      );
      assert.deepEqual(history.rows[0], { total: 2, withdrawn: 1 });
    } finally {
      await f.pool.close();
    }
  });
  it("exports exactly the latest 1000 unexpired actual encrypted captures in deterministic order", async () => {
    const f = await admitted(await fixture());
    try {
      const live = await published(f),
        receipts = [];
      await f.repository.transaction(f.principal.locationRef, async (tx) => {
        for (let i = 0; i < 1005; i++) {
          const request = inquiryFixture(),
            acceptedAt = new Date().toISOString();
          receipts.push(
            await tx.capture({
              request,
              snapshot: live.snapshot,
              acceptedAt,
              expiresAt: new Date(Date.parse(acceptedAt) + 30 * 86400000).toISOString(),
              contentHash: hash({
                publicationId: live.snapshot.publicationId,
                request,
                consentHash: live.snapshot.authority.consentHash,
              }),
            }),
          );
        }
      });
      const exported = await f.repository.exportInquiries();
      assert.equal(exported.length, 1000);
      const expected = receipts
        .toSorted(
          (a, b) =>
            Date.parse(b.acceptedAt) - Date.parse(a.acceptedAt) ||
            (a.inquiryId < b.inquiryId ? 1 : -1),
        )
        .slice(0, 1000);
      assert.deepEqual(
        exported.map((item) => item.receipt.inquiryId),
        expected.map((item) => item.inquiryId),
      );
      assert.equal(
        exported.every((item) => item.payload.request.email === "synthetic@example.invalid"),
        true,
      );
      const scheduler = await ownerSql(
        f,
        "test.finance-cleanup-schema-capability",
        "select has_schema_privilege('scheduler_runtime','campaign','USAGE') as schema_usage,has_schema_privilege('scheduler_runtime','campaign','CREATE') as schema_create,has_table_privilege('scheduler_runtime','campaign.financing_release_inquiries','SELECT,INSERT,UPDATE,DELETE') as financing_table_access,has_table_privilege('scheduler_runtime','campaign.funnel_inquiries','SELECT,INSERT,UPDATE,DELETE') as funnel_table_access,has_function_privilege('scheduler_runtime','campaign.financing_release_export()','EXECUTE') as private_export,pg_has_role('scheduler_runtime','app_runtime','MEMBER') as native_membership,pg_has_role('scheduler_runtime','migration_owner','MEMBER') as owner_membership",
      );
      assert.deepEqual(scheduler.rows, [
        {
          schema_usage: true,
          schema_create: false,
          financing_table_access: false,
          funnel_table_access: false,
          private_export: false,
          native_membership: false,
          owner_membership: false,
        },
      ]);
      const clean = await purgeExpiredMarketingInquiries(f.pool);
      assert.ok(clean.total <= 25000 && clean.total === clean.funnel + clean.financing);
    } finally {
      await f.pool.close();
    }
  });
  it("expires access before bounded physical purge and retains sanitized delivery tombstone", async () => {
    const f = await admitted(await fixture());
    try {
      const live = await published(f);
      const receipt = await captureFinancingInquiry(
        live.snapshot.publicationId,
        live.snapshot.authority.origin.canonicalOrigin,
        inquiryFixture(),
        f.ports,
      );
      await ownerSql(
        f,
        "test.finance-expire",
        "update campaign.financing_release_inquiries set accepted_at=now()-interval '31 days',expires_at=now()-interval '1 day' where location_id=$1::uuid and inquiry_id=$2::uuid",
        [f.tenant.locationId, receipt.inquiryId],
      );
      assert.deepEqual(await f.repository.exportInquiries(), []);
      const result = await ownerSql(
        f,
        "test.finance-purge",
        "select campaign.purge_expired_financing_inquiries() as count",
      );
      assert.ok(result.rows[0].count >= 1 && result.rows[0].count <= 5000);
      const retained = await ownerSql(
        f,
        "test.finance-tombstone",
        "select (select count(*) from campaign.financing_release_inquiries where inquiry_id=$1::uuid)::integer as pii,(select count(*) from campaign.financing_release_delivery where inquiry_id=$1::uuid)::integer as audit",
        [receipt.inquiryId],
      );
      assert.deepEqual(retained.rows[0], { pii: 0, audit: 1 });
    } finally {
      await f.pool.close();
    }
  });
  it("bounds each physical purge to 5000 expired ciphertext rows", async () => {
    const f = await admitted(await fixture());
    try {
      const live = await published(f);
      await captureFinancingInquiry(
        live.snapshot.publicationId,
        live.snapshot.authority.origin.canonicalOrigin,
        inquiryFixture(),
        f.ports,
      );
      await ownerSql(
        f,
        "test.finance-purge-batch-seed",
        `insert into campaign.financing_release_inquiries(location_id,inquiry_id,release_ref,publication_id,request_id,request_hash,consent_hash,consent_version_ref,routing_profile_version_ref,highlevel_location_ref,payload_cipher,accepted_at,expires_at)
       select location_id,gen_random_uuid(),release_ref,publication_id,gen_random_uuid(),request_hash,consent_hash,consent_version_ref,routing_profile_version_ref,highlevel_location_ref,payload_cipher,now()-interval '31 days',now()-interval '1 day'
       from campaign.financing_release_inquiries cross join generate_series(1,5001) where location_id=$1::uuid`,
        [f.tenant.locationId],
      );
      const first = await ownerSql(
        f,
        "test.finance-purge-batch-one",
        "select campaign.purge_expired_financing_inquiries() as count",
      );
      assert.equal(first.rows[0].count, 5000);
      const remaining = await ownerSql(
        f,
        "test.finance-purge-batch-left",
        "select count(*)::integer as count from campaign.financing_release_inquiries where location_id=$1::uuid and expires_at<=now()",
        [f.tenant.locationId],
      );
      assert.equal(remaining.rows[0].count, 1);
      const second = await ownerSql(
        f,
        "test.finance-purge-batch-two",
        "select campaign.purge_expired_financing_inquiries() as count",
      );
      assert.equal(second.rows[0].count, 1);
    } finally {
      await f.pool.close();
    }
  });
});
