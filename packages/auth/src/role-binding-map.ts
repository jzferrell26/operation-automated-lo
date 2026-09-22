import { SESSION_APPLICATION_ROLES, type SessionApplicationRole } from "./session-policy.js";

/**
 * PRD-005a D2. The only mapping between the database binding roles in
 * `platform.role_bindings.role` and the application session roles in `ApplicationRoleSchema`.
 *
 * Two entries deliberately map to nothing:
 *
 * - `realtor_collaborator` has no session role. `viewer` would grant read access to every campaign
 *   in the location, and a collaborator's scope is narrower than that, so a collaborator is
 *   refused a session rather than over-granted one.
 * - `platform_support` has no binding. Support access is a `platform.support_grants` concern that
 *   runs under `support_runtime` with an explicit support context, not a tenant session.
 */

export const DATABASE_BINDING_ROLES = Object.freeze([
  "location_admin",
  "creator",
  "approver",
  "publisher",
  "analyst",
  "realtor_collaborator",
] as const);

export type DatabaseBindingRole = (typeof DATABASE_BINDING_ROLES)[number];

const APPLICATION_ROLE_BY_DATABASE_ROLE: Readonly<
  Record<DatabaseBindingRole, SessionApplicationRole | undefined>
> = Object.freeze({
  location_admin: "location_admin",
  creator: "campaign_creator",
  approver: "campaign_approver",
  publisher: "campaign_publisher",
  analyst: "viewer",
  realtor_collaborator: undefined,
});

const DATABASE_ROLE_BY_APPLICATION_ROLE: Readonly<
  Record<SessionApplicationRole, DatabaseBindingRole | undefined>
> = Object.freeze({
  location_admin: "location_admin",
  campaign_creator: "creator",
  campaign_approver: "approver",
  campaign_publisher: "publisher",
  viewer: "analyst",
  platform_support: undefined,
});

const databaseBindingRoleSet: ReadonlySet<string> = new Set(DATABASE_BINDING_ROLES);
const applicationRoleSet: ReadonlySet<string> = new Set(SESSION_APPLICATION_ROLES);

export function isDatabaseBindingRole(value: unknown): value is DatabaseBindingRole {
  return typeof value === "string" && databaseBindingRoleSet.has(value);
}

export function isSessionApplicationRole(value: unknown): value is SessionApplicationRole {
  return typeof value === "string" && applicationRoleSet.has(value);
}

/** The session role a database binding grants, or `undefined` when it grants no session at all. */
export function applicationRoleForDatabaseRole(value: unknown): SessionApplicationRole | undefined {
  return isDatabaseBindingRole(value) ? APPLICATION_ROLE_BY_DATABASE_ROLE[value] : undefined;
}

/** The binding role a session role is checked against, or `undefined` when none backs it. */
export function databaseRoleForApplicationRole(value: unknown): DatabaseBindingRole | undefined {
  return isSessionApplicationRole(value) ? DATABASE_ROLE_BY_APPLICATION_ROLE[value] : undefined;
}
