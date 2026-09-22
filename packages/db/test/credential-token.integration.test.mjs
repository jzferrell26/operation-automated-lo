import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import {
  cleanupCredentialFixture,
  request,
  requiredTestDatabaseUrl,
  testPool,
  withMigrationOwnerTransaction,
} from "./campaign-integration-support.mjs";

/**
 * PRD-006a 006A-AC-006. The single-use guarantee on a credential token, against a real
 * PostgreSQL rather than a mock.
 *
 * `platform.consume_credential_token` is one atomic `update ... returning`, so two callers racing
 * for the same token serialise on the row and the loser matches nothing. A test that stubbed the
 * driver could not show that: what is under test is the database's own concurrency behaviour, so
 * the two consumes run on two real connections at the same time.
 */

const databaseUrl = requiredTestDatabaseUrl();

function tokenHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * The definer functions need a caller holding EXECUTE, which only `app_runtime` does. The role
 * change is transaction-local, because a bare `set role` would ride the pooled connection out.
 */
async function asAppRuntime(pool, work) {
  const connection = await pool.connect();
  try {
    await connection.execute(request("test.token-begin", "begin"));
    try {
      await connection.execute(request("test.token-elevate", "set local role app_runtime"));
      const outcome = await work(connection);
      await connection.execute(request("test.token-commit", "commit"));
      return outcome;
    } catch (error) {
      await connection.execute(request("test.token-rollback", "rollback"));
      throw error;
    }
  } finally {
    await connection.release();
  }
}

function fixture() {
  return Object.freeze({
    locationId: randomUUID(),
    installationId: randomUUID(),
    bindingId: randomUUID(),
    userId: randomUUID(),
  });
}

async function seed(pool, ids) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.token-location",
        "insert into platform.locations (id, display_name, status) values ($1::uuid, 'Credential token workspace', 'active')",
        [ids.locationId],
      ),
    );
    await connection.execute(
      request(
        "test.token-installation",
        "insert into platform.marketplace_installations (id, location_id, marketplace_app_id, status)" +
          " values ($1::uuid, $2::uuid, 'oalo-credential-token-tests', 'pending')",
        [ids.installationId, ids.locationId],
      ),
    );
    await connection.execute(
      request(
        "test.token-user",
        "insert into platform.app_users (id, safe_display_name) values ($1::uuid, 'Credential token person')",
        [ids.userId],
      ),
    );
    await connection.execute(
      request(
        "test.token-binding",
        "insert into platform.role_bindings (id, location_id, user_id, role) values ($1::uuid, $2::uuid, $3::uuid, 'creator')",
        [ids.bindingId, ids.locationId, ids.userId],
      ),
    );
  });
}

async function issueToken(pool, ids, hash, purpose = "password_reset") {
  return asAppRuntime(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.token-issue",
        "select platform.issue_credential_token($1::uuid, $2::text, $3::text, 1800, $4::text)::text as id",
        [ids.userId, purpose, hash, `correlation_resetPassword_${hash.slice(0, 24)}`],
      ),
    );
    return result.rows[0]?.id;
  });
}

async function consumeToken(pool, hash, purpose = "password_reset") {
  return asAppRuntime(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.token-consume",
        "select consumed.user_id::text as user_id from platform.consume_credential_token($1::text, $2::text) as consumed",
        [hash, purpose],
      ),
    );
    return result.rows.length;
  });
}

describe("platform.consume_credential_token", () => {
  it("lets exactly one of two concurrent consumes win", async () => {
    const pool = testPool(databaseUrl);
    const ids = fixture();
    try {
      await seed(pool, ids);
      const hash = tokenHash(`concurrent-${ids.userId}`);
      const tokenId = await issueToken(pool, ids, hash);
      assert.equal(typeof tokenId, "string");

      const [first, second] = await Promise.all([
        consumeToken(pool, hash),
        consumeToken(pool, hash),
      ]);

      assert.equal(first + second, 1, "exactly one concurrent consume returns a row");
    } finally {
      await cleanupCredentialFixture(pool, ids);
      await pool.close();
    }
  });

  it("refuses a second consume, a wrong purpose, and an unknown hash", async () => {
    const pool = testPool(databaseUrl);
    const ids = fixture();
    try {
      await seed(pool, ids);
      const hash = tokenHash(`sequential-${ids.userId}`);
      await issueToken(pool, ids, hash);

      assert.equal(await consumeToken(pool, hash), 1);
      assert.equal(await consumeToken(pool, hash), 0);
      assert.equal(await consumeToken(pool, tokenHash("never-issued"), "password_reset"), 0);

      const otherHash = tokenHash(`purpose-${ids.userId}`);
      await issueToken(pool, ids, otherHash, "email_verification");
      assert.equal(await consumeToken(pool, otherHash, "password_reset"), 0);
      assert.equal(await consumeToken(pool, otherHash, "email_verification"), 1);
    } finally {
      await cleanupCredentialFixture(pool, ids);
      await pool.close();
    }
  });

  it("supersedes a live token when a second one is issued for the same purpose", async () => {
    const pool = testPool(databaseUrl);
    const ids = fixture();
    try {
      await seed(pool, ids);
      const first = tokenHash(`superseded-first-${ids.userId}`);
      const second = tokenHash(`superseded-second-${ids.userId}`);
      await issueToken(pool, ids, first);
      await issueToken(pool, ids, second);

      assert.equal(await consumeToken(pool, first), 0, "the superseded link stops working");
      assert.equal(await consumeToken(pool, second), 1, "the newest link is the one that works");
    } finally {
      await cleanupCredentialFixture(pool, ids);
      await pool.close();
    }
  });
});
