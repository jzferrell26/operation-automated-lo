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

/**
 * The tables the route-level proofs count and read. The name reaches unparameterised SQL below, so
 * it is checked against this closed set rather than trusted: a table name is the one part of these
 * statements a caller supplies, and PostgreSQL has no placeholder for it.
 */
export const REVIEW_ASSERTABLE_TABLES = Object.freeze([
  "campaign.campaigns",
  "campaign.campaign_versions",
  "campaign.preflight_results",
  "campaign.approval_decisions",
  "integration.command_executions",
  "audit.events",
]);

function assertAssertableTable(table) {
  if (!REVIEW_ASSERTABLE_TABLES.includes(table)) {
    throw new Error(`${table} is not an assertable table for the route-level proofs`);
  }
  return table;
}

export async function countLocationRows(pool, table, locationId) {
  const safeTable = assertAssertableTable(table);
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.review-count-rows",
        `select count(*)::text as total from ${safeTable} where location_id = $1::uuid`,
        [locationId],
      ),
    );
    return Number(result.rows[0]?.total ?? "0");
  });
}

/**
 * PRD-005c 005C-AC-007, 008, and 009. The stored correlation reference on a row the route wrote.
 * `integration.command_executions` and `audit.events` carry no runtime `select` grant, so reading
 * them for an assertion goes through this harness like every other owner-privileged read.
 */
export async function readLocationCorrelationIds(pool, table, locationId) {
  const safeTable = assertAssertableTable(table);
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.review-read-correlations",
        `select correlation_id from ${safeTable} where location_id = $1::uuid` +
          " order by created_at, correlation_id",
        [locationId],
      ),
    );
    return result.rows.map((row) => row.correlation_id);
  });
}

/**
 * PRD-005b 005B-AC-016. A workspace with an active person and an active binding but no
 * installation row. Everything ahead of issuance accepts it, because nothing ahead of issuance
 * looks at installations, and `platform.issue_first_party_session` then refuses it and writes
 * exactly one denied audit row. It is the one deterministic way to drive a denied issuance where
 * the location is known.
 */
export async function seedReviewLocationWithoutInstallation(pool, displayName) {
  const locationId = randomUUID();
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.review-location-no-installation",
        "insert into platform.locations (id, display_name, status) values ($1::uuid, $2::text, 'active')",
        [locationId, displayName],
      ),
    );
  });
  return locationId;
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

/**
 * PRD-006a. The credential-side reads and writes the route-level proofs need.
 *
 * `platform.user_credentials`, `platform.credential_tokens`, and `platform.auth_rate_limits`
 * carry no grant for any runtime role at all, so every assertion about them is an owner-
 * privileged read and belongs here, in the one sanctioned holder of that elevation, rather than
 * under `apps/`. Nothing below writes a password: the hash is derived by the caller and passed in.
 */

export async function seedReviewCredential(pool, input) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.credential-upsert",
        `insert into platform.user_credentials (user_id, email_normalized, email_display, password_hash)
         values ($1::uuid, $2::text, $2::text, $3::text)
         on conflict (user_id) do update
           set email_normalized = excluded.email_normalized,
               email_display = excluded.email_display,
               password_hash = excluded.password_hash,
               failed_attempt_count = 0,
               locked_until = null,
               email_verified_at = null,
               updated_at = now()`,
        [input.userId, input.emailNormalized, input.passwordHash],
      ),
    );
  });
}

export async function readReviewCredential(pool, userId) {
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.credential-read",
        `select password_hash,
                failed_attempt_count::text as failed_attempt_count,
                (locked_until is not null and locked_until > now())::text as locked,
                (email_verified_at is not null)::text as email_verified,
                (password_rotated_at is not null)::text as rotated
         from platform.user_credentials where user_id = $1::uuid`,
        [userId],
      ),
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    return Object.freeze({
      passwordHash: row.password_hash,
      failedAttemptCount: Number(row.failed_attempt_count),
      locked: isTrue(row.locked),
      emailVerified: isTrue(row.email_verified),
      rotated: isTrue(row.rotated),
    });
  });
}

function isTrue(value) {
  return value === true || value === "true" || value === "t";
}

/** Moves an account's lock into the past, which is how a proof lets a lockout lapse. */
export async function expireReviewCredentialLock(pool, userId) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.credential-expire-lock",
        "update platform.user_credentials set locked_until = now() - interval '1 minute' where user_id = $1::uuid",
        [userId],
      ),
    );
  });
}

export async function countCredentialTokens(pool, input) {
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.credential-token-count",
        `select count(*)::text as total from platform.credential_tokens
         where user_id = $1::uuid and purpose = $2::text
           and ($3::text is null or (consumed_at is null and superseded_at is null))`,
        [input.userId, input.purpose, input.liveOnly === true ? "live" : null],
      ),
    );
    return Number(result.rows[0]?.total ?? "0");
  });
}

/** The lifetime of the newest token of a purpose, in seconds, so a proof can pin thirty minutes. */
export async function newestCredentialTokenLifetimeSeconds(pool, input) {
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.credential-token-lifetime",
        `select round(extract(epoch from (expires_at - issued_at)))::text as lifetime
         from platform.credential_tokens
         where user_id = $1::uuid and purpose = $2::text
         order by issued_at desc, id desc limit 1`,
        [input.userId, input.purpose],
      ),
    );
    const lifetime = result.rows[0]?.lifetime;
    return lifetime === undefined ? undefined : Number(lifetime);
  });
}

/** Every audit row a correlation reference produced, in insertion order. */
export async function readAuditEventsForCorrelation(pool, correlationId) {
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.audit-read-by-correlation",
        `select action, result, subject_type, subject_id
         from audit.events where correlation_id = $1::text
         order by created_at, id`,
        [correlationId],
      ),
    );
    return Object.freeze(
      result.rows.map((row) =>
        Object.freeze({
          action: row.action,
          result: row.result,
          subjectType: row.subject_type,
          subjectId: row.subject_id,
        }),
      ),
    );
  });
}

/** The session rows a person holds, newest first, for the revocation proofs. */
export async function readFirstPartySessionsForUser(pool, userId) {
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.session-read-by-user",
        `select id::text as id, issued_by, revocation_reason,
                (revoked_at is not null)::text as revoked,
                round(extract(epoch from (expires_at - issued_at)))::text as lifetime
         from platform.first_party_sessions where user_id = $1::uuid
         order by issued_at desc, id desc`,
        [userId],
      ),
    );
    return Object.freeze(
      result.rows.map((row) =>
        Object.freeze({
          id: row.id,
          issuedBy: row.issued_by,
          revocationReason: row.revocation_reason,
          revoked: isTrue(row.revoked),
          lifetimeSeconds: Number(row.lifetime),
        }),
      ),
    );
  });
}

/**
 * Clears the fixed-window counters for ONE key, so a proof can start from a known count.
 *
 * It takes a key on purpose. The route-level suites run as separate vitest files against one
 * database, and vitest runs files in parallel, so a helper that emptied the table would delete
 * counters another file was in the middle of counting. That is not a hypothetical: it is what an
 * earlier version of this helper did, and it made both rate-limit proofs fail intermittently
 * while the product was correct.
 */
export async function clearAuthRateLimitsForKey(pool, keyHash) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.rate-limit-clear-key",
        "delete from platform.auth_rate_limits where key_hash = $1::text",
        [keyHash],
      ),
    );
  });
}

/** The person a seeded email address names, for a proof that needs the id the route never returns. */
export async function readUserIdForEmail(pool, emailNormalized) {
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.credential-user-for-email",
        "select user_id::text as user_id from platform.user_credentials where email_normalized = $1::text",
        [emailNormalized],
      ),
    );
    return result.rows[0]?.user_id;
  });
}

/** Suspends a seeded person, so a proof can show a suspended account is refused a session. */
export async function suspendReviewActor(pool, actorId) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    await connection.execute(
      request(
        "test.review-suspend-actor",
        "update platform.app_users set status = 'suspended', updated_at = now() where id = $1::uuid",
        [actorId],
      ),
    );
  });
}

/**
 * PRD-006a. Tears down one credential fixture so the seeding script's guard still means what it
 * says: it refuses a database holding an active workspace it does not own, and a proof that left
 * its own workspaces behind would turn that guard into noise.
 *
 * The order is the foreign-key order, and the audit rows go first because every other delete here
 * is blocked by them. `platform.first_party_sessions` refuses deletes outright, so a fixture that
 * issued one cannot be torn down this way; nothing that uses this helper issues one.
 */
export async function cleanupCredentialFixture(pool, input) {
  await withMigrationOwnerTransaction(pool, async (connection) => {
    for (const disableTrigger of appendOnlyTriggerRequests("disable")) {
      await connection.execute(disableTrigger);
    }
    await connection.execute(
      request(
        "test.credential-cleanup-audit",
        "delete from audit.events where location_id = $1::uuid",
        [input.locationId],
      ),
    );
    await connection.execute(
      request(
        "test.credential-cleanup-tokens",
        "delete from platform.credential_tokens where user_id = $1::uuid",
        [input.userId],
      ),
    );
    await connection.execute(
      request(
        "test.credential-cleanup-credential",
        "delete from platform.user_credentials where user_id = $1::uuid",
        [input.userId],
      ),
    );
    await connection.execute(
      request(
        "test.credential-cleanup-bindings",
        "delete from platform.role_bindings where location_id = $1::uuid",
        [input.locationId],
      ),
    );
    await connection.execute(
      request(
        "test.credential-cleanup-installations",
        "delete from platform.marketplace_installations where location_id = $1::uuid",
        [input.locationId],
      ),
    );
    await connection.execute(
      request(
        "test.credential-cleanup-actor",
        "delete from platform.app_users where id = $1::uuid",
        [input.userId],
      ),
    );
    await connection.execute(
      request(
        "test.credential-cleanup-location",
        "delete from platform.locations where id = $1::uuid",
        [input.locationId],
      ),
    );
    for (const enableTrigger of appendOnlyTriggerRequests("enable")) {
      await connection.execute(enableTrigger);
    }
  });
}

/** PRD-006a 006A-AC-009. The counter rows themselves, so a proof can see the window it made. */
export async function readAuthRateLimitRows(pool, scope) {
  return withMigrationOwnerTransaction(pool, async (connection) => {
    const result = await connection.execute(
      request(
        "test.rate-limit-read",
        `select scope, key_hash, attempt_count::text as attempt_count,
                window_start::text as window_start
         from platform.auth_rate_limits
         where $1::text is null or scope = $1::text
         order by scope, key_hash, window_start`,
        [scope ?? null],
      ),
    );
    return Object.freeze(
      result.rows.map((row) =>
        Object.freeze({
          scope: row.scope,
          keyHash: row.key_hash,
          attemptCount: Number(row.attempt_count),
          windowStart: row.window_start,
        }),
      ),
    );
  });
}
