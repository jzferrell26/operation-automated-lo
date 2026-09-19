import { createHash } from "node:crypto";

import {
  databaseRoleForApplicationRole,
  isSessionApplicationRole,
  type EstablishedFirstPartySession,
  type FirstPartySessionLookup,
} from "@oalo/auth";
import {
  actorReference,
  formatActorRef,
  formatInstallationRef,
  formatLocationRef,
  formatSessionRef,
  locationReference,
  sessionReference,
} from "@oalo/contracts";
import {
  defineSqlContract,
  queryRuntimeFunction,
  type DatabasePool,
  type SqlScalar,
} from "@oalo/db";

import type { IdentityDirectory, RoleBindingPort } from "./authenticated-principal.js";

/**
 * PRD-005a: the Postgres-backed halves of `CampaignCommandPorts`. Every statement here is one of
 * the PRD-005b `security definer` contracts, run through the allowlisted context-free helper in
 * `@oalo/db` because identity, role, and session lookups all happen before any principal (and
 * therefore any tenant context) exists.
 *
 * Nothing in this module reads a reference from the browser. References arrive either from the
 * verified session row or from a value the resolver already bound to a principal, and each one is
 * parsed back to a UUID through the canonical codec before it reaches SQL.
 */

interface ActiveRow {
  readonly active: boolean;
}

interface RoleVersionRow {
  readonly roleVersion: number | undefined;
}

interface SessionRow {
  readonly sessionId: string;
  readonly locationId: string;
  readonly userId: string;
  readonly installationId: string;
  readonly sessionRole: string;
  readonly roleVersion: number;
  readonly expiresAtEpochSeconds: number;
}

function recordRow(row: unknown): Readonly<Record<string, unknown>> {
  if (typeof row !== "object" || row === null) {
    throw new Error("Runtime function returned a non-object row");
  }
  return row as Readonly<Record<string, unknown>>;
}

function decodeActive(row: unknown): ActiveRow {
  const record = recordRow(row);
  return Object.freeze({ active: record.active === true });
}

/**
 * `bigint` arrives as text from the driver. PRD-005b D2 bounds the derived version below 2^53, so
 * a value that is not a safe integer is a contract violation rather than a large legitimate
 * version, and it fails closed as `undefined`.
 */
function decodeOptionalBigint(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return undefined;
  return parsed;
}

function decodeRoleVersion(row: unknown): RoleVersionRow {
  const record = recordRow(row);
  return Object.freeze({ roleVersion: decodeOptionalBigint(record.role_version) });
}

function requiredText(value: unknown, column: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Runtime function column ${column} must be text`);
  }
  return value;
}

function decodeEpochSeconds(value: unknown, column: string): number {
  const milliseconds = value instanceof Date ? value.getTime() : Date.parse(String(value));
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`Runtime function column ${column} must be a timestamp`);
  }
  return Math.floor(milliseconds / 1000);
}

function decodeSession(row: unknown): SessionRow {
  const record = recordRow(row);
  const roleVersion = decodeOptionalBigint(record.role_version);
  if (roleVersion === undefined) {
    throw new Error("Runtime function column role_version must be a positive safe integer");
  }
  return Object.freeze({
    sessionId: formatSessionRef(requiredText(record.id, "id")),
    locationId: formatLocationRef(requiredText(record.location_id, "location_id")),
    userId: formatActorRef(requiredText(record.user_id, "user_id")),
    installationId: formatInstallationRef(requiredText(record.installation_id, "installation_id")),
    sessionRole: requiredText(record.session_role, "session_role"),
    roleVersion,
    expiresAtEpochSeconds: decodeEpochSeconds(record.expires_at, "expires_at"),
  });
}

export const locationIsActiveContract = defineSqlContract<ActiveRow>({
  name: "runtime.location-is-active.v1",
  access: "read",
  text: "select platform.location_is_active($1::uuid) as active",
  decode: decodeActive,
});

export const actorIsActiveContract = defineSqlContract<ActiveRow>({
  name: "runtime.actor-is-active.v1",
  access: "read",
  text: "select platform.actor_is_active($1::uuid) as active",
  decode: decodeActive,
});

export const currentRoleVersionContract = defineSqlContract<RoleVersionRow>({
  name: "runtime.current-role-version.v1",
  access: "read",
  text: "select platform.current_role_version($1::uuid, $2::uuid, $3::text)::text as role_version",
  decode: decodeRoleVersion,
});

export const lookupFirstPartySessionContract = defineSqlContract<SessionRow>({
  name: "runtime.lookup-first-party-session.v1",
  access: "read",
  text: `
select
  lookup.id::text as id,
  lookup.location_id::text as location_id,
  lookup.user_id::text as user_id,
  lookup.installation_id::text as installation_id,
  lookup.session_role,
  lookup.role_version::text as role_version,
  lookup.expires_at
from platform.lookup_first_party_session($1::text) as lookup
  `.trim(),
  decode: decodeSession,
});

/**
 * Declared for PRD-005b's authenticated mutation path. It is a `select` of a `void` function, so
 * it is a read at the statement level and may run on the context-free path like the others.
 */
export const touchFirstPartySessionContract = defineSqlContract<Record<string, never>>({
  name: "runtime.touch-first-party-session.v1",
  access: "read",
  text: "select platform.touch_first_party_session($1::uuid)",
  decode(): Record<string, never> {
    return Object.freeze({});
  },
});

async function isActive(
  pool: DatabasePool,
  contract: typeof locationIsActiveContract,
  id: string,
): Promise<boolean> {
  const values: readonly SqlScalar[] = [id];
  const rows = await queryRuntimeFunction(pool, contract, values);
  return rows[0]?.active === true;
}

/**
 * 005A-AC-005. A reference resolves only when it is canonical for its kind and the backing row is
 * active. A well-formed reference for a missing, suspended, or inactive row resolves to
 * `undefined`, which the principal resolver turns into an unauthenticated request.
 */
export function createPostgresIdentityDirectory(pool: DatabasePool): IdentityDirectory {
  return {
    async resolveLocationId(locationRef) {
      const locationId = locationReference.tryParse(locationRef);
      if (locationId === undefined) return undefined;
      return (await isActive(pool, locationIsActiveContract, locationId)) ? locationId : undefined;
    },
    async resolveActorId(actorRef) {
      const actorId = actorReference.tryParse(actorRef);
      if (actorId === undefined) return undefined;
      return (await isActive(pool, actorIsActiveContract, actorId)) ? actorId : undefined;
    },
  };
}

/**
 * 005A-AC-006. The application role is mapped to its database binding role through the single
 * shared map before the version is read, so an application role with no binding (`platform_support`)
 * never produces a version and never yields a session.
 */
export function createPostgresRoleBindingPort(pool: DatabasePool): RoleBindingPort {
  return {
    async currentRoleVersion(input) {
      const locationId = locationReference.tryParse(input.locationRef);
      const actorId = actorReference.tryParse(input.actorRef);
      const bindingRole = databaseRoleForApplicationRole(input.role);
      if (locationId === undefined || actorId === undefined || bindingRole === undefined) {
        return undefined;
      }
      const values: readonly SqlScalar[] = [locationId, actorId, bindingRole];
      const rows = await queryRuntimeFunction(pool, currentRoleVersionContract, values);
      return rows[0]?.roleVersion;
    },
  };
}

/**
 * 005A-AC-008. The cookie value is hashed with SHA-256 before it leaves this function; the raw
 * secret is never a statement parameter, never logged, and never compared in plaintext. Expiry is
 * enforced by the 005b function and re-checked here against the caller's clock.
 */
export function createPostgresFirstPartySessionLookup(pool: DatabasePool): FirstPartySessionLookup {
  return {
    async getActive(sessionSecret, nowEpochSeconds) {
      const secretHash = createHash("sha256").update(sessionSecret).digest("hex");
      const values: readonly SqlScalar[] = [secretHash];
      const rows = await queryRuntimeFunction(pool, lookupFirstPartySessionContract, values);
      const row = rows[0];
      if (row === undefined) return undefined;
      if (row.expiresAtEpochSeconds <= nowEpochSeconds) return undefined;
      if (!isSessionApplicationRole(row.sessionRole)) return undefined;
      const session: EstablishedFirstPartySession = {
        sessionId: row.sessionId,
        userId: row.userId,
        locationId: row.locationId,
        installationId: row.installationId,
        role: row.sessionRole,
        roleVersion: row.roleVersion,
        expiresAtEpochSeconds: row.expiresAtEpochSeconds,
      };
      return Object.freeze(session);
    },
  };
}

/** PRD-005b calls this on authenticated mutations. Nothing in PRD-005a reads its result. */
export async function touchFirstPartySession(
  pool: DatabasePool,
  sessionRef: string,
): Promise<void> {
  const sessionId = sessionReference.tryParse(sessionRef);
  if (sessionId === undefined) return;
  const values: readonly SqlScalar[] = [sessionId];
  await queryRuntimeFunction(pool, touchFirstPartySessionContract, values);
}
