import { createHash, randomUUID } from "node:crypto";

import { databaseRoleForApplicationRole } from "../../auth/dist/role-binding-map.js";
import { createPostgresPool } from "../dist/index.js";
import { campaignManifestFixture } from "./campaign-manifest-fixture.mjs";

export const campaignManifest = campaignManifestFixture;

export const inputVersions = Object.freeze({
  blueprintVersionRef: "blueprint_01OpenHouse",
  brandProfileVersionRef: "profile_01Brand",
  complianceProfileVersionRef: "profile_01Compliance",
  partnerProfileVersionRef: "profile_01Partner",
  routingProfileVersionRef: "profile_01Routing",
  rulesetVersionRef: "ruleset_01Policy",
});

export function canonicalHash(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function requiredTestDatabaseUrl() {
  const databaseUrl = process.env.OALO_TEST_DATABASE_URL;
  if (databaseUrl === undefined) {
    throw new Error("OALO_TEST_DATABASE_URL is required for PostgreSQL integration tests");
  }
  if (!new URL(databaseUrl).pathname.startsWith("/oalo_test_")) {
    throw new Error("OALO_TEST_DATABASE_URL must identify an oalo_test_ database");
  }
  return databaseUrl;
}

const LOOPBACK_DATABASE_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * This harness disables triggers and bulk-deletes tenant rows, so it is only ever meant to run
 * against a disposable local database. TLS stays off for loopback and becomes mandatory for
 * anything else, so an operator-supplied remote URL cannot put credentials on the wire in clear.
 */
export function testDatabaseSslMode(connectionString) {
  const { hostname } = new URL(connectionString);
  return LOOPBACK_DATABASE_HOSTNAMES.has(hostname.replace(/^\[|\]$/gu, "")) ? "disable" : "require";
}

export function testPool(connectionString) {
  return createPostgresPool({
    applicationName: "oalo-campaign-integration",
    connectionString,
    deploymentEnvironment: "test",
    maxConnections: 4,
    poolingMode: "transaction",
    preparedStatements: false,
    sslMode: testDatabaseSslMode(connectionString),
  });
}

export function request(statementName, text, values = []) {
  return Object.freeze({
    preparedStatementMode: "unnamed",
    statementName,
    text: text.trim(),
    values,
  });
}

/**
 * The foundation migration grants `migration_owner` to the login role `WITH SET TRUE, INHERIT
 * FALSE` (supabase/migrations/20260721010000_platform_foundation.sql:51-65), so the login role
 * holds no privileges on the schema objects until it explicitly assumes the owning role. Only a
 * SUPERUSER login could reach these tables without assuming it, and no role in this system is
 * SUPERUSER. Harness seeding and teardown therefore assume `migration_owner` exactly as
 * supabase/tests/*.pgtap.sql already does.
 */
export const assumeMigrationOwnerRequest = request(
  "test.assume-migration-owner",
  "set local role migration_owner",
);

/**
 * `audit.events` and the campaign evidence tables carry BEFORE UPDATE OR DELETE triggers that
 * reject every mutation, and their location foreign keys are ON DELETE RESTRICT, so teardown
 * cannot drop a tenant while its evidence rows remain. `session_replication_role = replica` would
 * bypass the triggers but that GUC is SUSET, meaning only a SUPERUSER could set it. `migration_owner`
 * owns these tables, so it can disable the named triggers instead; the change is transactional and
 * reverts on rollback.
 */
const APPEND_ONLY_TRIGGERS = Object.freeze([
  Object.freeze({ table: "audit.events", trigger: "audit_events_append_only" }),
  Object.freeze({ table: "campaign.campaign_versions", trigger: "campaign_versions_append_only" }),
  Object.freeze({ table: "campaign.preflight_results", trigger: "preflight_results_append_only" }),
  Object.freeze({
    table: "campaign.approval_decisions",
    trigger: "approval_decisions_append_only",
  }),
]);

function appendOnlyTriggerRequests(action) {
  return APPEND_ONLY_TRIGGERS.map(({ table, trigger }) =>
    request(
      `test.${action}-trigger-${trigger}`,
      `alter table ${table} ${action} trigger ${trigger}`,
    ),
  );
}

const resetRoleRequest = request("test.harness-reset-role", "reset role");
const roleRestoredRequest = request(
  "test.harness-role-restored",
  // `current_user` and `session_user` are SQL keywords, so no search_path qualification applies.
  "select current_user = session_user as restored",
);

/**
 * `SET LOCAL` reverts at transaction end, but `release()` in postgres 3.4.9 only clears the
 * reserved flag: it issues no `DISCARD ALL` and no session reset. Ending the transaction is
 * therefore the *only* thing that drops the elevation, so this asserts on the connection that the
 * role really did revert before it goes back to the pool instead of trusting the reasoning.
 */
async function assertElevationReverted(connection) {
  await connection.execute(resetRoleRequest);
  const result = await connection.execute(roleRestoredRequest);
  if (result.rows[0]?.restored !== true) {
    throw new Error(
      "Refusing to return a connection to the pool while it still holds an assumed role",
    );
  }
}

/**
 * Runs `work` inside a transaction that has assumed `migration_owner`. `SET LOCAL` keeps the role
 * change scoped to the transaction so a pooled connection is never handed back elevated. Cleanup
 * failures are aggregated rather than swallowed, because a failed ROLLBACK is exactly the event
 * that would leave an elevated connection in the pool.
 */
export async function withMigrationOwnerTransaction(pool, work) {
  const connection = await pool.connect();
  // Set before `begin` so a client-side rejection that still reached the server issues the
  // ROLLBACK that drops the elevation. ROLLBACK with no transaction open is a suppressed notice.
  let open = true;
  try {
    await connection.execute(request("test.harness-begin", "begin"));
    await connection.execute(assumeMigrationOwnerRequest);
    const result = await work(connection);
    await connection.execute(request("test.harness-commit", "commit"));
    open = false;
    await assertElevationReverted(connection);
    return result;
  } catch (error) {
    const failures = [error];
    if (open) {
      try {
        await connection.execute(request("test.harness-rollback", "rollback"));
        open = false;
        await assertElevationReverted(connection);
      } catch (cleanupError) {
        failures.push(cleanupError);
      }
    }
    if (failures.length === 1) throw error;
    throw new AggregateError(failures, "Migration owner transaction cleanup failed");
  } finally {
    await connection.release();
  }
}

export function tenantFixture(label, suffix) {
  const token = `${label}${suffix}`.replaceAll("_", "").slice(0, 24);
  return Object.freeze({
    actorId: randomUUID(),
    correlationId: `correlation_${label}_${suffix}`,
    label,
    locationId: randomUUID(),
    locationRef: `location_${token}`,
    suffix,
  });
}

export function principalFixture(tenant, role, actorLabel = tenant.label) {
  const isTenantActor = actorLabel === tenant.label;
  const token = `${actorLabel}${tenant.suffix}`.replaceAll("_", "").slice(0, 24);
  return Object.freeze({
    actorId: isTenantActor ? tenant.actorId : randomUUID(),
    actorRef: `actor_${token}`,
    authenticationMode: "embedded",
    installationRef: `installation_${tenant.label}${tenant.suffix}`,
    locationId: tenant.locationId,
    locationRef: tenant.locationRef,
    role,
    roleVersion: 1,
    sessionId: `session_${token}`,
  });
}

export async function appendVersion(repository, tenant, campaignRef, campaignVersionRef) {
  return repository.run(async (transaction) => {
    const version = {
      schemaVersion: 1,
      locationRef: tenant.locationRef,
      campaignRef,
      campaignVersionRef,
      versionNo: (await transaction.getLatestVersionNo(tenant.locationRef, campaignRef)) + 1,
      inputVersions,
      manifest: campaignManifest,
      manifestHash: canonicalHash(campaignManifest),
      createdBy: `user_${tenant.label}`,
      createdAt: new Date("2026-07-21T16:00:00.000Z").toISOString(),
    };
    await transaction.append(version);
    return version;
  });
}

export function preflightFor(version, blocking) {
  const resultBody = {
    schemaVersion: 1,
    campaignRef: version.campaignRef,
    campaignVersionRef: version.campaignVersionRef,
    manifestHash: version.manifestHash,
    inputVersions,
    rulesetVersionRef: inputVersions.rulesetVersionRef,
    findings: blocking
      ? [
          {
            severity: "blocking",
            ruleCode: "PARTNER_PERMISSION",
            description: "Partner permission is required.",
            affected: "partner.permissionConfirmed",
            remediation: "Confirm partner permission before preflight.",
          },
        ]
      : [],
    blocking,
    evaluatedAt: "2026-07-21T16:00:00.000Z",
  };
  return Object.freeze({
    ...resultBody,
    resultHash: canonicalHash(resultBody),
  });
}

export function preflightRulesFor(version) {
  return Object.freeze({
    schemaVersion: 1,
    rulesetVersionRef: version.inputVersions.rulesetVersionRef,
    evaluatedAt: "2026-07-21T16:00:00.000Z",
    minimumImageWidth: 1_200,
    minimumImageHeight: 630,
    earliestStartAt: "2026-07-21T16:00:00.000Z",
    allowedMergeTokens: [],
    bannedPhrases: ["guaranteed approval", "no credit check"],
    allowedClaims: ["Open house information is subject to change."],
    allowsFinancingTerms: false,
    minimumDailyBudgetMinor: 500,
    maximumDailyBudgetMinor: 100_000,
    maximumTotalBudgetMinor: 500_000,
    warnings: [],
  });
}

/**
 * PRD-005a 005A-AC-007. The harness no longer carries its own two-role approximation. The one
 * mapping between application session roles and `platform.role_bindings.role` lives in
 * `@oalo/auth`, and it is imported from that package's build output because this harness runs as
 * plain ESM under `node --test`.
 *
 * `@oalo/db` does not and must not depend on `@oalo/auth` (see `tooling/boundaries.json`), so the
 * import is a path into the sibling package's `dist/`. `pnpm verify` builds every package before
 * `pnpm test:db` runs, so that file is present on the canonical gate.
 */
function bindingRoleFor(applicationRole) {
  const bindingRole = databaseRoleForApplicationRole(applicationRole);
  if (bindingRole === undefined) {
    throw new Error(`No database binding role backs the application role ${applicationRole}`);
  }
  return bindingRole;
}

export async function seedTenant(pool, tenant, displayName, principals = []) {
  const actors =
    principals.length === 0 ? [principalFixture(tenant, "location_admin")] : principals;
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.campaign-location",
        "insert into platform.locations (id, display_name, status) values ($1::uuid, $2::text, 'active')",
        [tenant.locationId, displayName],
      ),
    );
    for (const actor of actors) {
      await connection.execute(
        request(
          "test.campaign-actor",
          "insert into platform.app_users (id, safe_display_name) values ($1::uuid, $2::text)",
          [actor.actorId, displayName],
        ),
      );
      await connection.execute(
        request(
          "test.campaign-role",
          "insert into platform.role_bindings (location_id, user_id, role) values ($1::uuid, $2::uuid, $3::text)",
          [tenant.locationId, actor.actorId, bindingRoleFor(actor.role)],
        ),
      );
    }
  });
}

export async function readStatus(pool, locationId, campaignRef) {
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.campaign-status",
        "select status from campaign.campaigns where location_id = $1::uuid and campaign_ref = $2::text",
        [locationId, campaignRef],
      ),
    );
    return result.rows[0]?.status;
  });
}

export async function cleanupTenants(pool, tenants, principals = []) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    for (const disableTrigger of appendOnlyTriggerRequests("disable")) {
      await connection.execute(disableTrigger);
    }
    for (const tenant of tenants) {
      for (const [statementName, text] of [
        ["test.cleanup-audit", "delete from audit.events where location_id = $1::uuid"],
        [
          "test.cleanup-commands",
          "delete from integration.command_executions where location_id = $1::uuid",
        ],
        [
          "test.cleanup-approvals",
          "delete from campaign.approval_decisions where location_id = $1::uuid",
        ],
        [
          "test.cleanup-preflight",
          "delete from campaign.preflight_results where location_id = $1::uuid",
        ],
        [
          "test.cleanup-versions",
          "delete from campaign.campaign_versions where location_id = $1::uuid",
        ],
        ["test.cleanup-campaigns", "delete from campaign.campaigns where location_id = $1::uuid"],
        ["test.cleanup-roles", "delete from platform.role_bindings where location_id = $1::uuid"],
      ]) {
        await connection.execute(request(statementName, text, [tenant.locationId]));
      }
    }
    const actorIds = new Set([
      ...tenants.map((tenant) => tenant.actorId),
      ...principals.map((principal) => principal.actorId),
    ]);
    for (const actorId of actorIds) {
      await connection.execute(
        request("test.cleanup-actors", "delete from platform.app_users where id = $1::uuid", [
          actorId,
        ]),
      );
    }
    for (const tenant of tenants) {
      await connection.execute(
        request("test.cleanup-locations", "delete from platform.locations where id = $1::uuid", [
          tenant.locationId,
        ]),
      );
    }
    for (const enableTrigger of appendOnlyTriggerRequests("enable")) {
      await connection.execute(enableTrigger);
    }
  });
}

/**
 * PRD-005a 005A-AC-013 and 005A-AC-014 seeding, for the route-level proofs in
 * `apps/web/src/server/*.postgres.test.ts`.
 *
 * These live here rather than beside those tests because this file is the one sanctioned holder of
 * owner elevation in the repository, which
 * `tests/security/database-privilege-escalation-boundary.test.ts` asserts directly. Session
 * issuance is deliberately not elevated: it runs PRD-005b's
 * `platform.issue_first_party_session`, which is `security definer` and granted to `app_runtime`,
 * so the proof exercises the real issuance path rather than an insert that could drift from it.
 */
export async function seedReviewLocation(pool, displayName) {
  const locationId = randomUUID();
  const installationId = randomUUID();
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.review-location",
        "insert into platform.locations (id, display_name, status) values ($1::uuid, $2::text, 'active')",
        [locationId, displayName],
      ),
    );
    await connection.execute(
      request(
        "test.review-installation",
        "insert into platform.marketplace_installations (id, location_id, marketplace_app_id, status)" +
          " values ($1::uuid, $2::uuid, 'oalo-review-surface', 'pending')",
        [installationId, locationId],
      ),
    );
  });
  return Object.freeze({ locationId, installationId });
}

export async function seedReviewActor(pool, locationId, displayName, bindingRole) {
  const actorId = randomUUID();
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.review-actor",
        "insert into platform.app_users (id, safe_display_name) values ($1::uuid, $2::text)",
        [actorId, displayName],
      ),
    );
    await connection.execute(
      request(
        "test.review-binding",
        "insert into platform.role_bindings (location_id, user_id, role) values ($1::uuid, $2::uuid, $3::text)",
        [locationId, actorId, bindingRole],
      ),
    );
  });
  return actorId;
}

export async function revokeReviewBinding(pool, locationId, actorId, bindingRole) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.review-revoke-binding",
        "update platform.role_bindings set revoked_at = now() where location_id = $1::uuid" +
          " and user_id = $2::uuid and role = $3::text and revoked_at is null",
        [locationId, actorId, bindingRole],
      ),
    );
  });
}

export async function grantReviewBinding(pool, locationId, actorId, bindingRole) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.review-grant-binding",
        "insert into platform.role_bindings (location_id, user_id, role) values ($1::uuid, $2::uuid, $3::text)",
        [locationId, actorId, bindingRole],
      ),
    );
  });
}

export async function countLocationRows(pool, table, locationId) {
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.review-count-rows",
        `select count(*)::text as total from ${table} where location_id = $1::uuid`,
        [locationId],
      ),
    );
    return Number(result.rows[0]?.total ?? "0");
  });
}

/** Runs one PRD-005b definer contract as `app_runtime`, with no tenant context and no elevation. */
async function withRuntimeRole(pool, work) {
  const connection = await pool.connect();
  let open = false;
  try {
    await connection.execute(request("test.review-begin", "begin"));
    open = true;
    await connection.execute(request("test.review-assume-runtime", "set local role app_runtime"));
    const result = await work(connection);
    await connection.execute(request("test.review-commit", "commit"));
    open = false;
    return result;
  } finally {
    if (open) await connection.execute(request("test.review-rollback", "rollback"));
    await connection.release();
  }
}

export async function issueReviewSession(pool, input) {
  return withRuntimeRole(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.review-issue-session",
        "select (platform.issue_first_party_session($1::uuid, $2::uuid, $3::text, $4::text," +
          " $5::text, $6::integer, 'review_sign_in', $7::text)).id::text as id",
        [
          input.locationId,
          input.actorId,
          input.bindingRole,
          input.sessionRole,
          input.secretHash,
          input.lifetimeSeconds,
          input.correlationId,
        ],
      ),
    );
    const id = result.rows[0]?.id;
    if (typeof id !== "string") {
      throw new Error("platform.issue_first_party_session returned no session id");
    }
    return id;
  });
}

export async function revokeReviewSession(pool, sessionId, reason, correlationId) {
  await withRuntimeRole(pool, async (connection) => {
    await connection.execute(
      request(
        "test.review-revoke-session",
        "select platform.revoke_first_party_session($1::uuid, $2::text, $3::text)",
        [sessionId, reason, correlationId],
      ),
    );
  });
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
}
