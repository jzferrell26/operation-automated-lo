import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import {
  request,
  requiredTestDatabaseUrl,
  testPool,
  withMigrationOwnerTransaction,
} from "./campaign-integration-support.mjs";

const databaseUrl = requiredTestDatabaseUrl();

function secretHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * The session functions are `security definer`, so they need no tenant context.
 * What they do need is a caller holding EXECUTE, which only `app_runtime` does.
 * The role change is transaction-local: `release()` clears only the reserved
 * flag, so a bare `set role` would ride the pooled connection out.
 */
async function asAppRuntime(pool, work) {
  const connection = await pool.connect();
  try {
    await connection.execute(request("test.session-begin", "begin"));
    try {
      await connection.execute(request("test.session-elevate", "set local role app_runtime"));
      const outcome = await work(connection);
      await connection.execute(request("test.session-commit", "commit"));
      return outcome;
    } catch (error) {
      await connection.execute(request("test.session-rollback", "rollback"));
      throw error;
    }
  } finally {
    await connection.release();
  }
}

function sessionFixture() {
  return Object.freeze({
    approverUserId: randomUUID(),
    bindingId: randomUUID(),
    installationId: randomUUID(),
    locationId: randomUUID(),
    userId: randomUUID(),
  });
}

async function seedSessionFixture(pool, fixture) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.session-location",
        "insert into platform.locations (id, display_name, status) values ($1::uuid, 'Session integration tenant', 'active')",
        [fixture.locationId],
      ),
    );
    await connection.execute(
      request(
        "test.session-users",
        "insert into platform.app_users (id, safe_display_name) values ($1::uuid, 'Session integration creator'), ($2::uuid, 'Session integration approver')",
        [fixture.userId, fixture.approverUserId],
      ),
    );
    await connection.execute(
      request(
        "test.session-binding",
        "insert into platform.role_bindings (id, location_id, user_id, role, granted_at) values ($1::uuid, $2::uuid, $3::uuid, 'creator', '2026-07-21T16:00:00.000Z')",
        [fixture.bindingId, fixture.locationId, fixture.userId],
      ),
    );
    await connection.execute(
      request(
        "test.session-installation",
        "insert into platform.marketplace_installations (id, location_id, marketplace_app_id, status) values ($1::uuid, $2::uuid, 'oalo-review-surface', 'pending')",
        [fixture.installationId, fixture.locationId],
      ),
    );
  });
}

/**
 * Sessions and audit events are append-only by design and the campaign harness
 * is the repository's only sanctioned holder of the teardown escape hatch
 * (tests/security/database-privilege-escalation-boundary.test.ts). This file
 * therefore retires its tenant through the modelled lifecycle instead: the
 * location and its users move to `deleted`, which is what a real uninstall
 * does, and which leaves no active location behind for the review seeding
 * guard later in the same gate run. The disposable database is dropped and
 * recreated on every run, so the rows themselves need no removal.
 */
async function retireSessionFixture(pool, fixture) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.session-retire-location",
        "update platform.locations set status = 'deleted', updated_at = pg_catalog.now() where id = $1::uuid",
        [fixture.locationId],
      ),
    );
    for (const userId of [fixture.userId, fixture.approverUserId]) {
      await connection.execute(
        request(
          "test.session-retire-user",
          "update platform.app_users set status = 'deleted', updated_at = pg_catalog.now() where id = $1::uuid",
          [userId],
        ),
      );
    }
  });
}

describe("first-party session functions", { concurrency: false }, () => {
  it("issues, looks up, touches, and revokes a session through the definer functions", async () => {
    const fixture = sessionFixture();
    const pool = testPool(databaseUrl);
    const hash = secretHash(randomUUID());
    await seedSessionFixture(pool, fixture);
    try {
      const issued = await asAppRuntime(pool, async (connection) => {
        const result = await connection.execute(
          request(
            "test.session-issue",
            `select issued.id::text as id, issued.role_version::text as role_version,
                    issued.installation_id::text as installation_id, issued.session_role
             from platform.issue_first_party_session(
               $1::uuid, $2::uuid, 'creator', 'campaign_creator', $3::text, 43200,
               'review_sign_in', 'corr.session-integration'
             ) as issued`,
            [fixture.locationId, fixture.userId, hash],
          ),
        );
        return result.rows[0];
      });

      assert.equal(issued.session_role, "campaign_creator");
      assert.equal(issued.installation_id, fixture.installationId);

      const currentVersion = await asAppRuntime(pool, async (connection) => {
        const result = await connection.execute(
          request(
            "test.session-role-version",
            "select platform.current_role_version($1::uuid, $2::uuid, 'creator')::text as role_version",
            [fixture.locationId, fixture.userId],
          ),
        );
        return result.rows[0].role_version;
      });
      assert.equal(currentVersion, issued.role_version);
      assert.equal(currentVersion, String(Date.parse("2026-07-21T16:00:00.000Z") * 1000));

      const found = await asAppRuntime(pool, async (connection) => {
        const result = await connection.execute(
          request(
            "test.session-lookup",
            "select id::text as id, location_id::text as location_id, session_role from platform.lookup_first_party_session($1::text)",
            [hash],
          ),
        );
        return result.rows;
      });
      assert.equal(found.length, 1);
      assert.equal(found[0].id, issued.id);
      assert.equal(found[0].location_id, fixture.locationId);

      await asAppRuntime(pool, (connection) =>
        connection.execute(
          request("test.session-touch", "select platform.touch_first_party_session($1::uuid)", [
            issued.id,
          ]),
        ),
      );
      const touched = await withMigrationOwnerTransaction(pool, async (connection) => {
        const result = await connection.execute(
          request(
            "test.session-last-seen",
            "select last_seen_at is not null as seen from platform.first_party_sessions where id = $1::uuid",
            [issued.id],
          ),
        );
        return result.rows[0].seen;
      });
      assert.equal(touched, true);

      const revocations = await asAppRuntime(pool, async (connection) => {
        const first = await connection.execute(
          request(
            "test.session-revoke",
            "select platform.revoke_first_party_session($1::uuid, 'sign_out', 'corr.session-integration') as revoked",
            [issued.id],
          ),
        );
        const second = await connection.execute(
          request(
            "test.session-revoke-again",
            "select platform.revoke_first_party_session($1::uuid, 'sign_out', 'corr.session-integration') as revoked",
            [issued.id],
          ),
        );
        return [first.rows[0].revoked, second.rows[0].revoked];
      });
      assert.deepEqual(revocations, [true, false]);

      const afterRevocation = await asAppRuntime(pool, async (connection) => {
        const result = await connection.execute(
          request(
            "test.session-lookup-after-revoke",
            "select id from platform.lookup_first_party_session($1::text)",
            [hash],
          ),
        );
        return result.rows.length;
      });
      assert.equal(afterRevocation, 0);

      const auditTrail = await withMigrationOwnerTransaction(pool, async (connection) => {
        const result = await connection.execute(
          request(
            "test.session-audit",
            "select action, result from audit.events where location_id = $1::uuid order by created_at, action",
            [fixture.locationId],
          ),
        );
        return result.rows.map((row) => `${row.action}:${row.result}`);
      });
      assert.deepEqual(auditTrail, ["session.issued:success", "session.revoked:success"]);
    } finally {
      await retireSessionFixture(pool, fixture);
    }
  });

  it("refuses issuance for a binding role the actor does not hold", async () => {
    const fixture = sessionFixture();
    const pool = testPool(databaseUrl);
    await seedSessionFixture(pool, fixture);
    try {
      await assert.rejects(
        asAppRuntime(pool, (connection) =>
          connection.execute(
            request(
              "test.session-issue-refused",
              `select platform.issue_first_party_session(
                 $1::uuid, $2::uuid, 'approver', 'campaign_approver', $3::text, 43200,
                 'review_sign_in', 'corr.session-refused'
               )`,
              [fixture.locationId, fixture.approverUserId, secretHash(randomUUID())],
            ),
          ),
        ),
        (error) => {
          assert.equal(error.code, "42501");
          assert.match(error.message, /refused/u);
          return true;
        },
      );

      const sessionCount = await withMigrationOwnerTransaction(pool, async (connection) => {
        const result = await connection.execute(
          request(
            "test.session-count",
            "select pg_catalog.count(*)::text as total from platform.first_party_sessions where location_id = $1::uuid",
            [fixture.locationId],
          ),
        );
        return result.rows[0].total;
      });
      assert.equal(sessionCount, "0");
    } finally {
      await retireSessionFixture(pool, fixture);
    }
  });
});
