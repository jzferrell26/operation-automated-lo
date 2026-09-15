import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DatabaseContextError,
  defineSqlContract,
  withSupportTransaction,
  withTenantTransaction,
} from "../dist/index.js";

const tenantContext = Object.freeze({
  locationId: "11111111-1111-4111-8111-111111111111",
  actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  correlationId: "corr.db-test-001",
});

const rowContract = defineSqlContract({
  name: "test.read-value.v1",
  access: "read",
  text: "select 'verified' as value",
  decode(row) {
    if (typeof row !== "object" || row === null || !("value" in row)) {
      throw new Error("Missing value");
    }
    if (typeof row.value !== "string") throw new Error("Invalid value");
    return Object.freeze({ value: row.value });
  },
});

class FakeConnection {
  requests = [];
  released = false;

  async execute(request) {
    this.requests.push(request);
    if (request.statementName === "transaction.read-context") {
      return {
        rows: [
          {
            location_id: tenantContext.locationId,
            actor_id: tenantContext.actorId,
            correlation_id: tenantContext.correlationId,
          },
        ],
        rowCount: 1,
      };
    }
    if (request.statementName === rowContract.name) {
      return { rows: [{ value: "verified" }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  async release() {
    this.released = true;
  }
}

class FakePool {
  connection = new FakeConnection();
  connectCalls = 0;

  async connect() {
    this.connectCalls += 1;
    return this.connection;
  }
}

describe("tenant transaction boundary", () => {
  it("sets and verifies transaction-local context before repository work", async () => {
    const pool = new FakePool();
    const result = await withTenantTransaction(
      pool,
      { resolveTenantDatabaseContext: async () => tenantContext },
      async (transaction) => (await transaction.read(rowContract))[0]?.value,
    );

    assert.equal(result, "verified");
    assert.deepEqual(
      pool.connection.requests.map((entry) => entry.statementName),
      [
        "transaction.begin",
        "transaction.assume-app-runtime-role",
        "transaction.set-context",
        "transaction.read-context",
        rowContract.name,
        "transaction.commit",
      ],
    );
    assert.equal(
      pool.connection.requests.every((entry) => entry.preparedStatementMode === "unnamed"),
      true,
    );
    assert.equal(pool.connection.released, true);
  });

  it("rolls back the same pinned connection when repository work fails", async () => {
    const pool = new FakePool();
    await assert.rejects(
      withTenantTransaction(
        pool,
        { resolveTenantDatabaseContext: async () => tenantContext },
        async () => {
          throw new Error("business state rejected");
        },
      ),
      /business state rejected/u,
    );

    assert.equal(
      pool.connection.requests.some((entry) => entry.statementName === "transaction.rollback"),
      true,
    );
    assert.equal(
      pool.connection.requests.some((entry) => entry.statementName === "transaction.commit"),
      false,
    );
    assert.equal(pool.connection.released, true);
  });

  it("prevents a repository from retaining the transaction after commit", async () => {
    const pool = new FakePool();
    let escapedTransaction;
    await withTenantTransaction(
      pool,
      { resolveTenantDatabaseContext: async () => tenantContext },
      async (transaction) => {
        escapedTransaction = transaction;
      },
    );

    await assert.rejects(escapedTransaction.read(rowContract), {
      code: "DB_TRANSACTION_CLOSED",
    });
  });

  it("uses the audited support context function", async () => {
    const pool = new FakePool();
    await withSupportTransaction(
      pool,
      {
        resolveSupportDatabaseContext: async () => ({
          ...tenantContext,
          subjectType: "campaign",
          subjectId: "campaign.safe-ref",
        }),
      },
      async () => undefined,
    );

    const contextRequest = pool.connection.requests.find(
      (entry) => entry.statementName === "transaction.set-context",
    );
    assert.match(contextRequest.text, /platform\.begin_support_access/u);
    assert.deepEqual(contextRequest.values, [
      tenantContext.locationId,
      tenantContext.actorId,
      tenantContext.correlationId,
      "campaign",
      "campaign.safe-ref",
    ]);
  });

  it("rejects unverified context shapes before acquiring a connection", async () => {
    const pool = new FakePool();
    await assert.rejects(
      withTenantTransaction(
        pool,
        {
          resolveTenantDatabaseContext: async () => ({
            ...tenantContext,
            locationId: "not-a-uuid",
          }),
        },
        async () => undefined,
      ),
      DatabaseContextError,
    );
    assert.equal(pool.connectCalls, 0);
  });
});
