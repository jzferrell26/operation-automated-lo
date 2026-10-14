import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "node:test";
import {
  prepareFinancingRelease,
  transitionFinancingRelease,
  captureFinancingInquiry,
} from "@oalo/application";
import {
  PostgresFinancingReleaseRepository,
  PostgresPublicFinancingReleaseRepository,
  PostgresPublicFinancingInquiryAdmissionRepository,
  admitVerifiedFinancingEvidence,
  createPostgresCampaignVersionRepository,
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

const url = requiredTestDatabaseUrl();
if (!/^\/oalo_test_[a-z0-9_]{1,40}$/u.test(new URL(url).pathname))
  throw Error("Public inquiry proof requires disposable database");
async function fixture(sharedPool, lifetime) {
  const tenant = tenantFixture("finpubadmit", randomUUID().replaceAll("-", "").slice(0, 10));
  const pool = sharedPool ?? testPool(url);
  const admin = (text, values = []) =>
    withMigrationOwnerTransaction(pool, (c) =>
      c.execute(request("test.public-admission-owner", text, values)),
    );
  await seedTenant(pool, tenant, "Public inquiry admission fixture");
  const role = await admin(
    "select id,platform.current_role_version($1::uuid,$2::uuid,'location_admin') as version from platform.role_bindings where location_id=$1::uuid and user_id=$2::uuid",
    [tenant.locationId, tenant.actorId],
  );
  const principal = {
    ...principalFixture(tenant, "location_admin"),
    roleVersion: Number(role.rows[0].version),
  };
  async function close() {
    await admin(
      "update platform.locations set status='deleted' where id=$1::uuid and display_name='Public inquiry admission fixture'",
      [tenant.locationId],
    );
    await admin(
      "update platform.app_users set status='deleted' where id=$1::uuid and safe_display_name='Public inquiry admission fixture'",
      [tenant.actorId],
    );
    await admin(
      "update platform.role_bindings set revoked_at=coalesce(revoked_at,clock_timestamp()) where id=$1::uuid and location_id=$2::uuid and user_id=$3::uuid",
      [role.rows[0].id, tenant.locationId, tenant.actorId],
    );
    if (sharedPool === undefined) await pool.close();
  }
  try {
    const source = financingSourceFixture(principal, lifetime);
    await createPostgresCampaignVersionRepository(pool, {
      resolveTenantDatabaseContext: async () => tenant,
    }).run((tx) => tx.append(source.sourceVersion));
    for (const [kind, proof] of sourceEvidence(source))
      await admitVerifiedFinancingEvidence(pool, admissionFixture(tenant.locationId, kind, proof));
    const owner = new PostgresFinancingReleaseRepository(
      pool,
      principal,
      tenant.correlationId,
      cryptoFixture(),
    );
    await owner.saveSource(source);
    const ports = releasePorts(owner, source);
    const appPrincipal = { actorRef: principal.actorRef, locationRef: principal.locationRef };
    let record = await prepareFinancingRelease(prepareRequest(source), appPrincipal, ports);
    for (const action of ["approve", "publish"])
      record = await transitionFinancingRelease(
        action,
        {
          requestId: randomUUID(),
          releaseRef: record.snapshot.releaseRef,
          expectedRevision: record.revision,
          expectedBundleHash: record.snapshot.bundleHash,
          expectedEvidenceHash: record.snapshot.evidenceHash,
        },
        appPrincipal,
        ports,
      );
    const publicationId = record.snapshot.publicationId,
      canonicalOrigin = record.snapshot.authority.origin.canonicalOrigin;
    const publicRepo = new PostgresPublicFinancingReleaseRepository(
      pool,
      publicationId,
      canonicalOrigin,
      cryptoFixture(),
    );
    const publicPorts = {
      ...ports,
      transaction: (location, work) => publicRepo.transaction(location, work),
      resolve: (_principal, selection) =>
        publicRepo.resolveSource(
          selection.campaignRef,
          selection.campaignVersionRef,
          selection.evidenceHash ?? selection.expectedEvidenceHash,
        ),
      findPublication: () => publicRepo.findPublication(),
    };
    const limiter = new PostgresPublicFinancingInquiryAdmissionRepository(
      pool,
      Buffer.alloc(32, 41),
    );
    const admit = (requestId = randomUUID(), client = "synthetic-client") =>
      limiter.admit({
        publicationId,
        canonicalOrigin,
        requestId,
        trustedClientKey: Buffer.from(client),
      });
    const capture = (input) =>
      captureFinancingInquiry(publicationId, canonicalOrigin, input, publicPorts);
    return {
      pool,
      tenant,
      principal,
      source,
      owner,
      record,
      publicationId,
      canonicalOrigin,
      admin,
      close,
      admit,
      capture,
      limiter,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
describe("durable public financing inquiry admission", { concurrency: false }, () => {
  it("denies public capture without admission, consumes once and preserves exact response-loss retries", async () => {
    const f = await fixture();
    try {
      const input = inquiryFixture();
      await assert.rejects(f.capture(input));
      assert.deepEqual(await f.admit(input.requestId), { allowed: true, retryAfterSeconds: 0 });
      const receipt = await f.capture(input);
      assert.deepEqual(await f.admit(input.requestId), { allowed: true, retryAfterSeconds: 0 });
      assert.deepEqual(await f.capture(input), receipt);
      await assert.rejects(f.capture({ ...input, firstName: "Changed" }), { code: "CONFLICT" });
      await assert.rejects(f.admit(input.requestId, "other-client"), { code: "CONFLICT" });
      const count = await f.admin(
        "select count(*)::integer as total,bool_and(content_hash is not null and consumed_at is not null) as consumed from campaign.financing_public_inquiry_admissions where location_id=$1::uuid",
        [f.tenant.locationId],
      );
      assert.deepEqual(count.rows[0], { total: 1, consumed: true });
      assert.equal((await f.owner.exportInquiries()).length, 1);
    } finally {
      await f.close();
    }
  });
  it("enforces20 per client/publication in10minutes while exact retry does not take a slot", async () => {
    const f = await fixture();
    try {
      const first = randomUUID();
      for (let i = 0; i < 20; i++)
        assert.equal((await f.admit(i === 0 ? first : randomUUID())).allowed, true);
      const limited = await f.admit();
      assert.equal(limited.allowed, false);
      assert.ok(limited.retryAfterSeconds >= 1 && limited.retryAfterSeconds <= 600);
      assert.equal(
        (
          await f.limiter.admit({
            publicationId: f.publicationId.toUpperCase(),
            canonicalOrigin: f.canonicalOrigin,
            requestId: randomUUID(),
            trustedClientKey: Buffer.from("synthetic-client"),
          })
        ).allowed,
        false,
      );
      assert.equal((await f.admit(first)).allowed, true);
      assert.equal((await f.admit(randomUUID(), "other-client")).allowed, true);
      const count = await f.admin(
        "select count(*)::integer as total from campaign.financing_public_inquiry_admissions where location_id=$1::uuid",
        [f.tenant.locationId],
      );
      assert.equal(count.rows[0].total, 21);
      await f.admin(
        "update campaign.financing_public_inquiry_admissions set admitted_at=clock_timestamp()-interval '11 minutes' where location_id=$1::uuid",
        [f.tenant.locationId],
      );
      assert.equal((await f.admit()).allowed, true);
    } finally {
      await f.close();
    }
  });
  it("serializes concurrent last-slot admissions and same-request retry", async () => {
    const f = await fixture();
    try {
      for (let i = 0; i < 19; i++) await f.admit();
      const attempts = await Promise.allSettled([f.admit(), f.admit()]);
      const allowed = attempts.filter((item) => item.status === "fulfilled" && item.value.allowed);
      assert.equal(allowed.length, 1);
      const count = await f.admin(
        "select count(*)::integer as total from campaign.financing_public_inquiry_admissions where location_id=$1::uuid",
        [f.tenant.locationId],
      );
      assert.equal(count.rows[0].total, 20);
      const retry = randomUUID();
      const same = await Promise.allSettled([
        f.admit(retry, "retry-client"),
        f.admit(retry, "retry-client"),
      ]);
      assert.ok(same.some((item) => item.status === "fulfilled" && item.value.allowed));
      assert.equal((await f.admit(retry, "retry-client")).allowed, true);
      const rows = await f.admin(
        "select count(*)::integer as total from campaign.financing_public_inquiry_admissions where location_id=$1::uuid and request_id=$2::uuid",
        [f.tenant.locationId, retry],
      );
      assert.equal(rows.rows[0].total, 1);
    } finally {
      await f.close();
    }
  });
  it("enforces5000 admissions per publication rolling day across distinct clients", async () => {
    const f = await fixture();
    try {
      const first = randomUUID();
      await f.admit(first);
      await f.admin(
        "insert into campaign.financing_public_inquiry_admissions(location_id,publication_id,release_ref,request_id,client_hash) select $1::uuid,$2::uuid,$3::text,gen_random_uuid(),md5(i::text)||md5(i::text) from generate_series(1,4998) i",
        [f.tenant.locationId, f.publicationId, f.record.snapshot.releaseRef],
      );
      const race = await Promise.allSettled([
        f.admit(randomUUID(), "daily-race-one"),
        f.admit(randomUUID(), "daily-race-two"),
      ]);
      assert.equal(
        race.filter((item) => item.status === "fulfilled" && item.value.allowed).length,
        1,
      );
      const limited = await f.admit();
      assert.equal(limited.allowed, false);
      assert.ok(limited.retryAfterSeconds >= 1 && limited.retryAfterSeconds <= 86400);
      assert.equal((await f.admit(first)).allowed, true);
      const oldCount = await f.admin(
        "select count(*)::integer as total from campaign.financing_public_inquiry_admissions where location_id=$1::uuid",
        [f.tenant.locationId],
      );
      assert.equal(oldCount.rows[0].total, 5000);
      await f.admin(
        "update campaign.financing_public_inquiry_admissions set admitted_at=clock_timestamp()-interval '25 hours' where location_id=$1::uuid",
        [f.tenant.locationId],
      );
      assert.equal((await f.admit()).allowed, true);
    } finally {
      await f.close();
    }
  });
  it("refuses expiry after admission and keeps the reservation unconsumed", async () => {
    const f = await fixture(undefined, 2000);
    try {
      const input = inquiryFixture();
      await f.admit(input.requestId);
      await delay(Math.max(0, Date.parse(f.record.snapshot.validUntil) - Date.now()) + 20);
      await assert.rejects(f.capture(input));
      await assert.rejects(f.admit(input.requestId), { code: "INELIGIBLE" });
      const row = await f.admin(
        "select consumed_at,content_hash from campaign.financing_public_inquiry_admissions where location_id=$1::uuid and request_id=$2::uuid",
        [f.tenant.locationId, input.requestId],
      );
      assert.deepEqual(row.rows[0], { consumed_at: null, content_hash: null });
    } finally {
      await f.close();
    }
  });
  it("isolates publication buckets and refuses retargeting an existing protected public scope", async () => {
    const f = await fixture(),
      other = await fixture(f.pool);
    try {
      for (let i = 0; i < 20; i++) await f.admit();
      assert.equal((await f.admit()).allowed, false);
      assert.equal((await other.admit()).allowed, true);
      const connection = await f.pool.connect();
      const execute = (text, values = []) =>
        connection.execute(request("test.public-admission-scope", text, values));
      try {
        await execute("begin");
        await execute("set local role financing_public_runtime");
        await execute("select campaign.financing_release_public_context($1::uuid,$2::text)", [
          f.publicationId,
          f.canonicalOrigin,
        ]);
        const retarget = await execute(
          "select campaign.financing_public_inquiry_admit($1::uuid,$2::text,$3::uuid,$4::text) as value",
          [other.publicationId, other.canonicalOrigin, randomUUID(), "a".repeat(64)],
        );
        assert.deepEqual(retarget.rows[0].value, { status: "unavailable" });
        await execute("savepoint private_entry");
        await assert.rejects(
          execute(
            "select campaign.financing_release_capture_private($1,$2::uuid,$3,$4,$5::uuid,clock_timestamp(),clock_timestamp()+interval '30 days')",
            [
              f.record.snapshot.releaseRef,
              randomUUID(),
              "a".repeat(64),
              "synthetic ciphertext payload unavailable",
              randomUUID(),
            ],
          ),
          { code: "42501" },
        );
        await execute("rollback to savepoint private_entry");
        await execute("savepoint no_admission");
        await assert.rejects(
          execute(
            "select campaign.financing_release_capture($1,$2::uuid,$3,$4,$5::uuid,clock_timestamp(),clock_timestamp()+interval '30 days')",
            [
              f.record.snapshot.releaseRef,
              randomUUID(),
              "a".repeat(64),
              "synthetic ciphertext payload unavailable",
              randomUUID(),
            ],
          ),
          { code: "42501" },
        );
        await execute("rollback to savepoint no_admission");
      } finally {
        await execute("rollback");
        await connection.release();
      }
    } finally {
      await other.close();
      await f.close();
    }
  });
  it("rechecks withdrawal after admission and fences removed inquiry retries", async () => {
    const f = await fixture();
    try {
      const input = inquiryFixture();
      await f.admit(input.requestId);
      const receipt = await f.capture(input);
      assert.equal(await f.owner.removeInquiry(receipt.inquiryId), true);
      await assert.rejects(f.capture(input), { code: "INELIGIBLE" });
      const pending = inquiryFixture();
      await f.admit(pending.requestId);
      await f.owner.withdrawEvidence(
        f.source.authority.quoteEvidence[0].authority.recordRef,
        f.source.authority.quoteEvidence[0].authority.revisionRef,
      );
      await assert.rejects(f.capture(pending));
      await assert.rejects(f.admit(pending.requestId), { code: "INELIGIBLE" });
    } finally {
      await f.close();
    }
  });
  it("preserves the original capture body privately, RLS and indexed tenant FKs without runtime raw access", async () => {
    const f = await fixture();
    try {
      const rights = await f.admin(
        "select has_function_privilege('financing_public_runtime','campaign.financing_release_capture_private(text,uuid,text,text,uuid,timestamptz,timestamptz)','EXECUTE') as private_public,has_function_privilege('app_runtime','campaign.financing_release_capture_private(text,uuid,text,text,uuid,timestamptz,timestamptz)','EXECUTE') as private_owner,has_function_privilege('financing_public_runtime','campaign.financing_release_capture(text,uuid,text,text,uuid,timestamptz,timestamptz)','EXECUTE') as wrapper,has_table_privilege('financing_public_runtime','campaign.financing_public_inquiry_admissions','SELECT,INSERT,UPDATE,DELETE') as raw,(select relrowsecurity and relforcerowsecurity from pg_class where oid='campaign.financing_public_inquiry_admissions'::regclass) as rls",
      );
      assert.deepEqual(rights.rows[0], {
        private_public: false,
        private_owner: false,
        wrapper: true,
        raw: false,
        rls: true,
      });
      const count = await f.admin(
        "select count(*)::integer as total from pg_constraint where conrelid='campaign.financing_public_inquiry_admissions'::regclass and contype='f'",
      );
      assert.equal(count.rows[0].total, 3);
      const body = await f.admin(
        "select prosrc as body from pg_proc where oid='campaign.financing_release_capture_private(text,uuid,text,text,uuid,timestamptz,timestamptz)'::regprocedure",
      );
      const original = await readFile(
        new URL(
          "../../../supabase/migrations/20261014051000_financing_release.sql",
          import.meta.url,
        ),
        "utf8",
      );
      const match = original.match(
        /create function campaign\.financing_release_capture\([\s\S]*?as \$f\$([\s\S]*?)\$f\$;/u,
      );
      assert.ok(match);
      assert.equal(body.rows[0].body, match[1]);
    } finally {
      await f.close();
    }
  });
});
