import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createWebinarPublicationRepository } from "../dist/index.js";

const principal = {
  actorId: "00000000-0000-4000-8000-000000002311",
  locationId: "00000000-0000-4000-8000-000000002301",
  actorRef: "actor_00000000000040008000000000002311",
  locationRef: "location_00000000000040008000000000002301",
  installationRef: "installation_00000000000040008000000000002351",
  role: "campaign_creator",
  roleVersion: 123456,
  sessionId: "session_00000000000040008000000000002361",
  authenticationMode: "first_party",
};
const correlation = "correlation_webinarDbTest01";
function poolFor(value, mismatch = false) {
  const calls = [];
  const pool = {
    connect: async () => ({
      execute: async (request) => {
        calls.push(request);
        return {
          rowCount: 1,
          rows:
            request.statementName === "transaction.read-context"
              ? [
                  {
                    location_id: principal.locationId,
                    actor_id: mismatch ? "00000000-0000-4000-8000-000000002312" : principal.actorId,
                    correlation_id: correlation,
                  },
                ]
              : request.statementName.startsWith("webinar-destination.")
                ? [{ value }]
                : [],
        };
      },
      release: async () => {},
    }),
  };
  return { calls, pool };
}
describe("fixed webinar publication repository boundary", () => {
  it("version lookup has no caller publisher or publication argument and binds native session", async () => {
    const { pool, calls } = poolFor(null);
    assert.equal(
      await createWebinarPublicationRepository(pool, principal, correlation).forVersion(
        "campaign_test01",
        "version_test01",
      ),
      null,
    );
    const call = calls.find((item) => item.statementName === "webinar-destination.version.v1");
    assert.deepEqual(call.values, [
      "campaign_test01",
      "version_test01",
      "campaign_creator",
      123456,
      "first_party",
      "00000000-0000-4000-8000-000000002361",
    ]);
    assert.match(call.text, /^select campaign\.webinar_destination_for_version/);
    assert.equal(call.preparedStatementMode, "unnamed");
    assert.ok(calls.some((item) => item.statementName === "transaction.set-context"));
  });
  it("refuses synthetic or malformed session identity before any query", () => {
    const { pool, calls } = poolFor(null);
    assert.throws(() =>
      createWebinarPublicationRepository(
        pool,
        { ...principal, authenticationMode: "local_synthetic" },
        correlation,
      ),
    );
    assert.throws(() =>
      createWebinarPublicationRepository(
        pool,
        { ...principal, sessionId: "session_fake01" },
        correlation,
      ),
    );
    assert.equal(calls.length, 0);
  });
  it("context mismatch rolls back before invoking ownership capability", async () => {
    const { pool, calls } = poolFor(null, true);
    await assert.rejects(
      createWebinarPublicationRepository(pool, principal, correlation).owned(
        "00000000-0000-4000-8000-000000002321",
      ),
    );
    assert.equal(
      calls.some((item) => item.statementName.startsWith("webinar-destination.")),
      false,
    );
    assert.equal(calls.at(-1).statementName, "transaction.rollback");
  });
  it("malformed capability result rolls back instead of inventing a destination", async () => {
    const { pool, calls } = poolFor({
      publication: { id: "fake" },
      publisherActorRef: principal.actorRef,
      frozenDestination: null,
    });
    await assert.rejects(
      createWebinarPublicationRepository(pool, principal, correlation).owned(
        "00000000-0000-4000-8000-000000002321",
      ),
    );
    assert.equal(calls.at(-1).statementName, "transaction.rollback");
  });
});
