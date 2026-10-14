import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  financingSourceFixture,
  sourceEvidence,
  admissionFixture,
  cryptoFixture,
  prepareRequest,
} from "./financing-release-fixture.mjs";

export function runFinancingReleaseAdapterCases(db, app, testkit) {
  const {
    PostgresFinancingReleaseRepository,
    VerifiedFinancingEvidenceAdmissionSchema,
    financingReleaseSqlContracts,
    admitVerifiedFinancingEvidence,
    PostgresPublicFinancingReleaseRepository,
    findPublicFinancingRelease,
    purgeExpiredMarketingInquiries,
  } = db;
  const { canonicalCampaignHash: hash, prepareFinancingRelease } = app;
  const { describe, it } = testkit;
  const principal = {
    actorId: randomUUID(),
    actorRef: "actor_synthetic001",
    authenticationMode: "embedded",
    installationRef: "installation_synthetic001",
    locationId: randomUUID(),
    locationRef: "location_synthetic001",
    role: "location_admin",
    roleVersion: 1,
    sessionId: "session_synthetic001",
  };
  const source = financingSourceFixture(principal);
  async function recordFixture() {
    const outputs = new Map();
    return prepareFinancingRelease(
      prepareRequest(source),
      { actorRef: principal.actorRef, locationRef: principal.locationRef },
      {
        now: () => new Date(),
        newReleaseRef: () => "release_synthetic001",
        newPublicationId: randomUUID,
        authorize: async () => {},
        resolve: async () => source,
        readMedia: async () => new Uint8Array(),
        assertNormalizedMedia: async () => {},
        render: async (plan) =>
          ["site", "pdf"].map((kind) => ({
            kind,
            mimeType: kind === "site" ? "text/html" : "application/pdf",
            artifactRef: `artifact_${kind}001`,
            rendererVersion: "synthetic-1",
            bindingHash: hash(plan),
            bytes: Buffer.from(`synthetic ${kind}`),
          })),
        assertOutputParity: async () => {},
        putOutput: async (seal, bytes) => {
          outputs.set(seal.artifactRef, bytes);
        },
        readOutput: async (seal) => outputs.get(seal.artifactRef),
        transaction: async (_location, work) =>
          work({
            reserve: async () => ({ state: "new" }),
            save: async () => {},
            complete: async () => {},
            assertEvidenceCurrent: async () => {},
          }),
        findPublication: async () => null,
      },
    );
  }
  function poolFixture() {
    const requests = [],
      receipts = [],
      state = {
        authorize: true,
        current: true,
        changed: false,
        malformed: false,
        failing: null,
        connections: 0,
      };
    return {
      requests,
      receipts,
      state,
      async connect() {
        state.connections++;
        return {
          async execute(input) {
            requests.push(input);
            if (state.failing === input.statementName)
              throw { code: "40001", message: "Raw private SQL detail" };
            if (input.statementName === "transaction.read-context")
              return {
                rows: [
                  {
                    actor_id: principal.actorId,
                    location_id: principal.locationId,
                    correlation_id: "correlation_synthetic001",
                  },
                ],
                rowCount: 1,
              };
            const name = input.statementName;
            let value = null;
            if (name.endsWith("authorize.v1")) value = state.authorize;
            if (name.endsWith("source-save.v1") || name.endsWith("source-read.v1")) value = source;
            if (name.endsWith("current.v1")) value = state.current;
            if (name.endsWith("public-context.v1")) value = state.publicContext ?? null;
            if (name.endsWith("publication.v1")) value = state.record ?? null;
            if (name.endsWith("purge.v1"))
              value = state.purge ?? { funnel: 0, financing: 0, total: 0 };
            if (name.endsWith("reserve.v1")) value = { state: "new" };
            if (
              ["save", "complete", "remove", "withdraw", "admit"].some(
                (part) => name === `financing-release.${part}.v1`,
              )
            )
              value = !state.changed;
            if (name.endsWith("capture.v1")) {
              const [, requestId, , cipher, inquiryId, acceptedAt, expiresAt] = input.values;
              value = {
                inquiryId,
                publicationId: state.record.snapshot.publicationId,
                requestId,
                acceptedAt,
                expiresAt,
                deliveryState: "pending",
              };
              receipts.push({ receipt: value, cipher });
            }
            if (name.endsWith("export.v1")) value = receipts;
            if (name.endsWith("load.v1")) value = state.record ?? null;
            if (state.malformed && name.endsWith("export.v1")) value = [{}];
            return { rows: [{ value }], rowCount: 1 };
          },
          async release() {
            requests.push({ statementName: "released" });
          },
        };
      },
    };
  }
  const repo = (pool, config = cryptoFixture()) =>
    new PostgresFinancingReleaseRepository(pool, principal, "correlation_synthetic001", config);
  function captureInput(record) {
    const request = {
      requestId: randomUUID(),
      firstName: "Synthetic",
      email: "synthetic@example.invalid",
      honeypot: "",
      consent: true,
      intent: "property-information",
    };
    const acceptedAt = new Date().toISOString();
    return {
      request,
      snapshot: record.snapshot,
      acceptedAt,
      expiresAt: new Date(Date.parse(acceptedAt) + 30 * 86400000).toISOString(),
      contentHash: hash({
        publicationId: record.snapshot.publicationId,
        request,
        consentHash: record.snapshot.authority.consentHash,
      }),
    };
  }
  async function publicFixture() {
    const pool = poolFixture(),
      record = await recordFixture();
    pool.state.record = record;
    pool.state.publicContext = {
      locationId: principal.locationId,
      actorId: principal.actorId,
      correlationId: "correlation_synthetic001",
      locationRef: principal.locationRef,
      releaseRef: record.snapshot.releaseRef,
    };
    const publicRepo = new PostgresPublicFinancingReleaseRepository(
      pool,
      record.snapshot.publicationId,
      "https://property.example.invalid",
      cryptoFixture(),
    );
    return { pool, record, publicRepo };
  }
  describe("public financing database adapter unit boundary", () => {
    it("sets serializable isolation before any context query, verifies context and rechecks current authority at end", async () => {
      const pool = poolFixture();
      await repo(pool).transaction(principal.locationRef, async (tx) =>
        tx.reserve("prepare", randomUUID(), "a".repeat(64)),
      );
      assert.equal(pool.requests[0].text, "begin isolation level serializable");
      assert.equal(pool.requests.filter((q) => q.statementName.endsWith("authorize.v1")).length, 2);
      assert.ok(
        pool.requests.every(
          (q) => q.preparedStatementMode === undefined || q.preparedStatementMode === "unnamed",
        ),
      );
    });
    it("refuses synthetic principal and absent or invalid key configurations before opening a connection", () => {
      const pool = poolFixture();
      assert.throws(
        () =>
          new PostgresFinancingReleaseRepository(
            pool,
            { ...principal, authenticationMode: "local_synthetic" },
            "correlation_synthetic001",
            cryptoFixture(),
          ),
      );
      for (const config of [
        { ...cryptoFixture(), currentKeyId: "unknown" },
        { ...cryptoFixture(), requestHashKey: Buffer.alloc(31) },
        { ...cryptoFixture(), keys: { key1: Buffer.alloc(31) } },
      ])
        assert.throws(() => repo(pool, config));
      assert.equal(pool.requests.length, 0);
    });
    it("foreign location cannot enter transaction or save detached source", async () => {
      const pool = poolFixture();
      await assert.rejects(
        repo(pool).transaction("location_foreign001", async () => {}),
        { code: "NOT_FOUND" },
      );
      await assert.rejects(
        repo(pool).saveSource({
          ...source,
          sourceVersion: { ...source.sourceVersion, locationRef: "location_foreign001" },
        }),
        { code: "INELIGIBLE" },
      );
      assert.equal(pool.requests.length, 0);
    });
    it("withdrawal rejects malformed refs and an authorization refusal rolls back", async () => {
      const pool = poolFixture();
      pool.state.authorize = false;
      await assert.rejects(
        repo(pool).withdrawEvidence("evidence_sample001", "revision_sample001"),
        {
          code: "INELIGIBLE",
        },
      );
      assert.ok(pool.requests.some((q) => q.text === "rollback"));
      assert.equal(
        pool.requests.some((q) => q.statementName.endsWith("withdraw.v1")),
        false,
      );
    });
    it("serializable failures are sanitized and rolled back with the same external retry identity", async () => {
      const pool = poolFixture();
      pool.state.failing = financingReleaseSqlContracts.reserve.name;
      await assert.rejects(
        repo(pool).transaction(principal.locationRef, (tx) =>
          tx.reserve("prepare", randomUUID(), "a".repeat(64)),
        ),
        (error) => error.code === "UNAVAILABLE" && !error.message.includes("SQL"),
      );
      assert.ok(pool.requests.some((q) => q.text === "rollback"));
    });
    it("checked evidence is revalidated after awaited work and refuses late withdrawal", async () => {
      const pool = poolFixture(),
        record = await recordFixture();
      await assert.rejects(
        repo(pool).transaction(principal.locationRef, async (tx) => {
          await tx.assertEvidenceCurrent(record.snapshot, new Date().toISOString());
          pool.state.current = false;
        }),
        { code: "INELIGIBLE" },
      );
      assert.equal(pool.requests.filter((q) => q.statementName.endsWith("current.v1")).length, 2);
      assert.ok(pool.requests.some((q) => q.text === "rollback"));
    });
    it("encrypts actual normalized payload and immutable consent/attribution with randomized nonces and keyed request hashes", async () => {
      const pool = poolFixture();
      pool.state.record = await recordFixture();
      const input = captureInput(pool.state.record),
        repository = repo(pool);
      await repository.transaction(principal.locationRef, (tx) => tx.capture(input));
      await repository.transaction(principal.locationRef, (tx) => tx.capture(input));
      const capture = pool.requests.filter((q) => q.statementName.endsWith("capture.v1"));
      assert.notEqual(capture[0].values[3], capture[1].values[3]);
      assert.equal(capture[0].values[2], capture[1].values[2]);
      assert.notEqual(capture[0].values[2], input.contentHash);
      assert.equal(capture[0].values[3].includes(input.request.email), false);
      const exported = await repository.exportInquiries();
      assert.equal(exported[0].payload.request.email, input.request.email);
      assert.equal(exported[0].payload.consent.hash, input.snapshot.authority.consentHash);
      assert.equal(exported[0].payload.attribution.bundleHash, input.snapshot.bundleHash);
    });
    it("requires content hash and exact 30-day policy before encryption/persistence", async () => {
      const pool = poolFixture();
      pool.state.record = await recordFixture();
      const input = captureInput(pool.state.record);
      for (const changed of [
        { ...input, contentHash: "e".repeat(64) },
        { ...input, expiresAt: input.acceptedAt },
      ])
        await assert.rejects(
          repo(pool).transaction(principal.locationRef, (tx) => tx.capture(changed)),
          { code: "INELIGIBLE" },
        );
      assert.equal(
        pool.requests.some((q) => q.statementName.endsWith("capture.v1")),
        false,
      );
    });
    it("rotation retains old named decryption keys and fails closed when a retained-data key is missing", async () => {
      const pool = poolFixture();
      pool.state.record = await recordFixture();
      const input = captureInput(pool.state.record);
      await repo(pool).transaction(principal.locationRef, (tx) => tx.capture(input));
      const config = {
        ...cryptoFixture(),
        currentKeyId: "key2",
        keys: { ...cryptoFixture().keys, key2: Buffer.alloc(32, 33) },
      };
      assert.equal(
        (await repo(pool, config).exportInquiries())[0].payload.request.email,
        input.request.email,
      );
      await assert.rejects(
        repo(pool, { ...config, keys: { key2: config.keys.key2 } }).exportInquiries(),
        { code: "UNAVAILABLE" },
      );
    });
    it("ciphertext tampering and cross-publication replay are refused without exposing raw crypto details", async () => {
      const pool = poolFixture();
      pool.state.record = await recordFixture();
      await repo(pool).transaction(principal.locationRef, (tx) =>
        tx.capture(captureInput(pool.state.record)),
      );
      const original = pool.receipts[0].cipher;
      pool.receipts[0].cipher = `${original.slice(0, -4)}AAAA`;
      await assert.rejects(repo(pool).exportInquiries(), { code: "UNAVAILABLE" });
      pool.receipts[0].cipher = original;
      pool.receipts[0].receipt.publicationId = randomUUID();
      await assert.rejects(repo(pool).exportInquiries(), { code: "UNAVAILABLE" });
    });
    it("unknown result shapes fail closed and owner inquiry removal is a fixed UUID query", async () => {
      const pool = poolFixture();
      pool.state.malformed = true;
      await assert.rejects(repo(pool).exportInquiries(), { code: "UNAVAILABLE" });
      const id = randomUUID();
      assert.equal(await repo(pool).removeInquiry(id), true);
      assert.deepEqual(pool.requests.find((q) => q.statementName.endsWith("remove.v1")).values, [
        id,
      ]);
    });
    it("strict admission rejects inferred authority, private-use permission and unknown trust fields", () => {
      const input = admissionFixture(
        principal.locationId,
        "quote",
        source.authority.quoteEvidence[0].authority,
      );
      assert.equal(VerifiedFinancingEvidenceAdmissionSchema.safeParse(input).success, true);
      for (const changed of [
        { ...input, approved: true },
        { ...input, provenance: { ...input.provenance, method: "platform-record" } },
        { ...input, evidence: { ...input.evidence, scope: "tenant-private-financing" } },
      ])
        assert.equal(VerifiedFinancingEvidenceAdmissionSchema.safeParse(changed).success, false);
      assert.equal(sourceEvidence(source).length, 10);
    });
    it("the verifier service assumes only its narrowly scoped role and does not use runtime tenant admission", async () => {
      const pool = poolFixture();
      await admitVerifiedFinancingEvidence(
        pool,
        admissionFixture(
          principal.locationId,
          "quote",
          source.authority.quoteEvidence[0].authority,
        ),
      );
      assert.equal(pool.requests[1].text, "set local role financing_verifier_runtime");
      assert.equal(
        pool.requests.some((q) => q.statementName.endsWith("authorize.v1")),
        false,
      );
    });
    it("source setup and lookup preserve the immutable source and calculate hashes in the server adapter", async () => {
      const pool = poolFixture();
      assert.deepEqual(await repo(pool).saveSource(source), source);
      assert.deepEqual(
        await repo(pool).resolveSource(
          source.sourceVersion.campaignRef,
          source.sourceVersion.campaignVersionRef,
          hash(source.authority),
        ),
        source,
      );
      const write = pool.requests.find((q) => q.statementName.endsWith("source-save.v1"));
      assert.deepEqual(write.values, [
        JSON.stringify(source),
        hash(source),
        hash(source.authority),
      ]);
      await assert.rejects(
        repo(pool).saveSource({
          ...source,
          sourceVersion: { ...source.sourceVersion, manifestHash: "a".repeat(64) },
        }),
        { code: "INELIGIBLE" },
      );
    });
    it("private source resolution during a release transaction also reuses its reserved connection", async () => {
      const pool = poolFixture(),
        repository = repo(pool);
      await repository.transaction(principal.locationRef, async () =>
        repository.resolveSource(
          source.sourceVersion.campaignRef,
          source.sourceVersion.campaignVersionRef,
          hash(source.authority),
        ),
      );
      assert.equal(pool.state.connections, 1);
      assert.equal(
        pool.requests.filter((item) => item.statementName.endsWith("authorize.v1")).length,
        2,
      );
    });
    it("save and complete CAS refusals conflict instead of implying publication", async () => {
      const pool = poolFixture(),
        record = await recordFixture();
      pool.state.changed = true;
      await assert.rejects(
        repo(pool).transaction(principal.locationRef, (tx) => tx.save(record, null)),
        { code: "CONFLICT" },
      );
      await assert.rejects(
        repo(pool).transaction(principal.locationRef, (tx) =>
          tx.complete("prepare", randomUUID(), "a".repeat(64), record.snapshot.releaseRef),
        ),
        { code: "CONFLICT" },
      );
    });
    it("public capability uses only the dedicated read/capture role and preserves safe null lookup", async () => {
      const pool = poolFixture(),
        id = randomUUID();
      assert.equal(
        await findPublicFinancingRelease(pool, id, "https://property.example.invalid"),
        null,
      );
      assert.equal(pool.requests[1].text, "set local role financing_public_runtime");
      pool.state.record = await recordFixture();
      assert.deepEqual(
        await findPublicFinancingRelease(
          pool,
          pool.state.record.snapshot.publicationId,
          "https://property.example.invalid",
        ),
        pool.state.record,
      );
    });
    it("anonymous source resolution reuses its own locked transaction without inventing an owner session", async () => {
      const { pool, record, publicRepo } = await publicFixture();
      await publicRepo.transaction(principal.locationRef, async (tx) => {
        assert.deepEqual(await tx.load(record.snapshot.releaseRef), record);
        assert.deepEqual(
          await publicRepo.resolveSource(
            source.sourceVersion.campaignRef,
            source.sourceVersion.campaignVersionRef,
            hash(source.authority),
          ),
          source,
        );
        await tx.assertEvidenceCurrent(record.snapshot, new Date().toISOString());
        await tx.capture(captureInput(record));
      });
      assert.equal(pool.state.connections, 2);
      assert.equal(
        pool.requests.some((q) => q.statementName.endsWith("authorize.v1")),
        false,
      );
      assert.ok(
        pool.requests
          .filter((q) => q.text?.startsWith("set local role"))
          .every((q) => q.text === "set local role financing_public_runtime"),
      );
      assert.equal(
        (await publicRepo.findPublication()).snapshot.publicationId,
        record.snapshot.publicationId,
      );
    });
    it("anonymous capability refuses admin operations and foreign location/release choices", async () => {
      const { record, publicRepo } = await publicFixture();
      for (const work of [
        (tx) => tx.reserve("revoke", randomUUID(), "a".repeat(64)),
        (tx) => tx.save(record, null),
        (tx) => tx.complete("prepare", randomUUID(), "a".repeat(64), record.snapshot.releaseRef),
      ])
        await assert.rejects(publicRepo.transaction(principal.locationRef, work), {
          code: "INELIGIBLE",
        });
      await assert.rejects(
        publicRepo.transaction("location_foreign001", async () => {}),
        { code: "NOT_FOUND" },
      );
      await assert.rejects(
        publicRepo.transaction(principal.locationRef, (tx) => tx.load("release_foreign001")),
        { code: "NOT_FOUND" },
      );
      await assert.rejects(
        publicRepo.transaction(principal.locationRef, (tx) =>
          tx.assertEvidenceCurrent(
            { ...record.snapshot, releaseRef: "release_foreign001" },
            new Date().toISOString(),
          ),
        ),
        { code: "INELIGIBLE" },
      );
    });
    it("anonymous unknown capability and verifier refusal return sanitized unavailable/ineligible results", async () => {
      const pool = poolFixture();
      const publicRepo = new PostgresPublicFinancingReleaseRepository(
        pool,
        randomUUID(),
        "https://property.example.invalid",
        cryptoFixture(),
      );
      await assert.rejects(
        publicRepo.transaction(principal.locationRef, async () => {}),
        { code: "UNAVAILABLE" },
      );
      pool.state.changed = true;
      await assert.rejects(
        admitVerifiedFinancingEvidence(
          pool,
          admissionFixture(
            principal.locationId,
            "quote",
            source.authority.quoteEvidence[0].authority,
          ),
        ),
        { code: "INELIGIBLE" },
      );
      assert.throws(
        () =>
          new PostgresPublicFinancingReleaseRepository(
            pool,
            randomUUID(),
            "https://foreign.example.invalid/path",
            cryptoFixture(),
          ),
      );
    });
    it("combined purge uses only the scheduler role and validates the 25000 total bound", async () => {
      const pool = poolFixture();
      pool.state.purge = { funnel: 15000, financing: 10000, total: 25000 };
      assert.deepEqual(await purgeExpiredMarketingInquiries(pool), pool.state.purge);
      assert.equal(pool.requests[1].text, "set local role scheduler_runtime");
      for (const result of [
        { funnel: 15000, financing: 10001, total: 25001 },
        { funnel: 0, financing: 1, total: 0 },
      ]) {
        pool.state.purge = result;
        await assert.rejects(purgeExpiredMarketingInquiries(pool), { code: "UNAVAILABLE" });
      }
    });
  });
}
