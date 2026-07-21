import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PostgresAdapterError, createPostgresPool } from "../dist/index.js";

const validLocalConfiguration = Object.freeze({
  applicationName: "oalo-test-runtime",
  connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/oalo_test_adapter",
  deploymentEnvironment: "test",
  poolingMode: "transaction",
  preparedStatements: false,
  sslMode: "disable",
});

describe("PostgreSQL pool configuration", () => {
  it("accepts an explicit transaction-pool-safe configuration without connecting eagerly", async () => {
    const pool = createPostgresPool(validLocalConfiguration);
    await pool.close();
  });

  it("requires transaction pooling and explicitly disabled prepared statements", () => {
    for (const unsafeConfiguration of [
      { ...validLocalConfiguration, poolingMode: "session" },
      { ...validLocalConfiguration, preparedStatements: true },
      { ...validLocalConfiguration, preparedStatements: undefined },
    ]) {
      assert.throws(() => createPostgresPool(unsafeConfiguration), PostgresAdapterError);
    }
  });

  it("rejects plaintext production database traffic", () => {
    assert.throws(
      () =>
        createPostgresPool({
          ...validLocalConfiguration,
          deploymentEnvironment: "production",
          sslMode: "disable",
        }),
      {
        code: "DB_CONFIGURATION_INVALID",
        message: "TLS cannot be disabled outside local or test environments",
      },
    );
  });

  it("rejects unknown configuration keys", () => {
    assert.throws(
      () => createPostgresPool({ ...validLocalConfiguration, unsafeOverride: true }),
      /unknown database configuration field/u,
    );
  });
});
