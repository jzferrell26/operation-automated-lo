import assert from "node:assert/strict";
import { it } from "node:test";
import { randomUUID } from "node:crypto";
import { canonicalCampaignHash } from "@oalo/application";
import { formatSessionRef, parseInstallationRef } from "@oalo/contracts";
import { publisherFixture } from "./webinar-publisher-fixture.mjs";
import {
  PostgresWebinarPublisherCommandAuthenticationRepository,
  PostgresWebinarPublisherAuthenticationResolver,
} from "../dist/index.js";

function setup() {
  const f = publisherFixture();
  f.principal.authenticationMode = "first_party";
  f.principal.sessionId = formatSessionRef(randomUUID());
  f.operation.requestHash = canonicalCampaignHash({
    requestId: f.operation.requestId,
    projectionRef: f.operation.projectionRef,
    expectedProjectionHash: f.operation.projectionHash,
    expectedRowVersion: 1,
    action: f.operation.action,
    confirmationHash: f.operation.confirmationHash,
  });
  const calls = [];
  const row = {
    actorId: f.principal.actorId,
    locationId: f.principal.locationId,
    installationId: parseInstallationRef(f.principal.installationRef),
    sessionId: f.principal.sessionId
      .slice(8)
      .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/u, "$1-$2-$3-$4-$5"),
    role: "location_admin",
    roleVersion: 1,
    authenticationMode: "first_party",
  };
  const pool = {
    connect: async () => ({
      execute: async (r) => {
        calls.push(r);
        return {
          rows:
            r.statementName === "publisher-auth.resolve.v1"
              ? [{ value: row }]
              : ["publisher-auth.reserve.v1", "publisher-auth.recheck.v1"].includes(r.statementName)
                ? [{ value: f.operation }]
                : [],
          rowCount: 1,
        };
      },
      release: async () => {
        calls.push({ statementName: "released" });
      },
    }),
  };
  const candidate = {
    operationRef: f.operation.operationRef,
    principal: f.principal,
    authenticatedAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    verificationHash: "a".repeat(64),
  };
  const verifier = { verify: async () => candidate, assertCommandCurrent: async () => {} };
  const input = {
    reservation: {
      projectionRef: f.operation.projectionRef,
      operation: f.operation,
      task: f.task,
      expectedRowVersion: 1,
      expectedState: "reserved",
    },
    authenticationEvidence: { testOnly: "synthetic independent verifier" },
  };
  return { f, pool, calls, row, candidate, verifier, input };
}
it("requires an operation identity before taking a connection", async () => {
  const s = setup(),
    r = new PostgresWebinarPublisherAuthenticationResolver(s.pool);
  await assert.rejects(
    r.current({ actorId: s.f.principal.actorId, locationId: s.f.principal.locationId }),
    /unavailable/u,
  );
  assert.equal(s.calls.length, 0);
});
it("returns exactly persisted original identity and rejects a substituted login", async () => {
  const s = setup(),
    r = new PostgresWebinarPublisherAuthenticationResolver(s.pool);
  assert.deepEqual(
    await r.current({
      operationRef: s.f.operation.operationRef,
      actorId: s.row.actorId,
      locationId: s.row.locationId,
    }),
    s.f.principal,
  );
  await assert.rejects(
    r.revalidate(s.f.operation.operationRef, {
      ...s.f.principal,
      sessionId: formatSessionRef(randomUUID()),
    }),
    /unavailable/u,
  );
  assert.ok(s.calls.some((c) => c.text === "set local role publisher_authentication_resolver"));
});
it("refuses a foreign row and rolls back without returning a principal", async () => {
  const s = setup();
  s.row.actorId = randomUUID();
  await assert.rejects(
    new PostgresWebinarPublisherAuthenticationResolver(s.pool).current({
      operationRef: s.f.operation.operationRef,
      actorId: s.f.principal.actorId,
      locationId: s.f.principal.locationId,
    }),
    /unavailable/u,
  );
  assert.ok(s.calls.some((c) => c.statementName === "publisher-auth.rollback"));
});
it("requires independent verification and excludes original credentials from SQL", async () => {
  const s = setup();
  const token = "secret_test_only_never_sql";
  s.input.authenticationEvidence = { token };
  await new PostgresWebinarPublisherCommandAuthenticationRepository(s.pool, s.verifier).reserve(
    s.input,
  );
  assert.ok(!JSON.stringify(s.calls).includes(token));
  const q = s.calls.find((c) => c.statementName === "publisher-auth.reserve.v1");
  assert.match(q.text, /\$9::text::jsonb/u);
  assert.equal(JSON.parse(q.values[8]).operation.operationRef, s.f.operation.operationRef);
  assert.throws(
    () => new PostgresWebinarPublisherCommandAuthenticationRepository(s.pool, {}),
    /unavailable/u,
  );
});
for (const mode of ["local_synthetic", "embedded"])
  it(`rejects ${mode} without authentic UUID session provenance`, async () => {
    const s = setup();
    s.candidate.principal = {
      ...s.f.principal,
      authenticationMode: mode,
      sessionId: "session_signedFixture001",
    };
    await assert.rejects(
      new PostgresWebinarPublisherCommandAuthenticationRepository(s.pool, s.verifier).reserve(
        s.input,
      ),
      /unavailable/u,
    );
    assert.equal(s.calls.length, 0);
  });
it("independent verifier refusal cannot become a shaped proof", async () => {
  const s = setup();
  s.verifier.verify = async () => {
    throw new Error("test only signature refusal");
  };
  await assert.rejects(
    new PostgresWebinarPublisherCommandAuthenticationRepository(s.pool, s.verifier).reserve(
      s.input,
    ),
    /unavailable/u,
  );
  assert.equal(s.calls.length, 0);
});
it("authentication withdrawal under reservation locks rolls back command and provenance", async () => {
  const s = setup();
  let count = 0;
  s.verifier.verify = async () => ({
    ...s.candidate,
    principal: {
      ...s.f.principal,
      sessionId: count++ === 0 ? s.f.principal.sessionId : formatSessionRef(randomUUID()),
    },
  });
  await assert.rejects(
    new PostgresWebinarPublisherCommandAuthenticationRepository(s.pool, s.verifier).reserve(
      s.input,
    ),
    /unavailable/u,
  );
  assert.ok(s.calls.some((c) => c.statementName === "publisher-auth.reserve.v1"));
  assert.ok(s.calls.some((c) => c.statementName === "publisher-auth.rollback"));
  assert.ok(!s.calls.some((c) => c.statementName === "publisher-auth.commit"));
});
it("a shaped command with a changed canonical request hash never reaches reservation", async () => {
  const s = setup();
  s.f.operation.requestHash = "9".repeat(64);
  await assert.rejects(
    new PostgresWebinarPublisherCommandAuthenticationRepository(s.pool, s.verifier).reserve(
      s.input,
    ),
    /unavailable/u,
  );
  assert.equal(s.calls.length, 0);
});
