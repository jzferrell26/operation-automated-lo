import {
  ApplicationRoleSchema,
  type ApplicationRole,
  type ApprovalDecision,
} from "@oalo/contracts";

import type { ApprovalAuthorityPort } from "./campaign-foundation.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const OPAQUE_REFERENCE_PATTERN = /^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u;
const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,299}$/u;
const AUTHENTICATION_MODES = new Set(["embedded", "first_party", "local_synthetic"]);

export const CAMPAIGN_MUTATION_ROLES = Object.freeze([
  "location_admin",
  "campaign_creator",
] as const satisfies readonly ApplicationRole[]);

export const CAMPAIGN_APPROVAL_ROLES = Object.freeze([
  "location_admin",
  "campaign_approver",
] as const satisfies readonly ApplicationRole[]);

export type AuthenticationMode = "embedded" | "first_party" | "local_synthetic";

export interface AuthenticatedPrincipal {
  readonly actorRef: string;
  readonly actorId: string;
  readonly locationRef: string;
  readonly locationId: string;
  readonly installationRef: string;
  readonly role: ApplicationRole;
  readonly roleVersion: number;
  readonly sessionId: string;
  readonly authenticationMode: AuthenticationMode;
}

export class CampaignCommandForbiddenError extends Error {
  public constructor() {
    super("This principal is not allowed to execute the campaign command.");
    this.name = "CampaignCommandForbiddenError";
  }
}

export class CampaignResourceNotAccessibleError extends Error {
  public constructor() {
    super("The requested campaign resource is not accessible.");
    this.name = "CampaignResourceNotAccessibleError";
  }
}

export class CampaignPrincipalInvalidError extends Error {
  public constructor() {
    super("The authenticated principal is not valid.");
    this.name = "CampaignPrincipalInvalidError";
  }
}

function hasAllowedRole(role: ApplicationRole, allowed: readonly ApplicationRole[]): boolean {
  return allowed.includes(role);
}

function isOpaqueReference(value: string): boolean {
  return value.length >= 8 && value.length <= 128 && OPAQUE_REFERENCE_PATTERN.test(value);
}

export function freezeAuthenticatedPrincipal(
  principal: AuthenticatedPrincipal,
): Readonly<AuthenticatedPrincipal> {
  if (
    !UUID_PATTERN.test(principal.locationId) ||
    !UUID_PATTERN.test(principal.actorId) ||
    !isOpaqueReference(principal.actorRef) ||
    !isOpaqueReference(principal.locationRef) ||
    !isOpaqueReference(principal.installationRef) ||
    !isOpaqueReference(principal.sessionId) ||
    !AUTHENTICATION_MODES.has(principal.authenticationMode) ||
    !ApplicationRoleSchema.safeParse(principal.role).success ||
    !Number.isSafeInteger(principal.roleVersion) ||
    principal.roleVersion < 1
  ) {
    throw new CampaignPrincipalInvalidError();
  }
  return Object.freeze({ ...principal });
}

export function assertMayExecuteCampaignMutation(
  principal: Readonly<AuthenticatedPrincipal>,
): void {
  const frozen = freezeAuthenticatedPrincipal(principal);
  if (!hasAllowedRole(frozen.role, CAMPAIGN_MUTATION_ROLES)) {
    throw new CampaignCommandForbiddenError();
  }
}

export function assertPrincipalOwnsTransaction(
  principal: Readonly<AuthenticatedPrincipal>,
  context: Readonly<{ locationId: string; actorId: string }>,
): void {
  const frozen = freezeAuthenticatedPrincipal(principal);
  if (frozen.locationId !== context.locationId || frozen.actorId !== context.actorId) {
    throw new CampaignResourceNotAccessibleError();
  }
}

export function assertCampaignAccessible(
  principal: Readonly<AuthenticatedPrincipal>,
  resource: Readonly<{ locationRef: string }> | undefined,
): void {
  const frozen = freezeAuthenticatedPrincipal(principal);
  if (resource === undefined || resource.locationRef !== frozen.locationRef) {
    throw new CampaignResourceNotAccessibleError();
  }
}

export function createCampaignTenantContext(
  principal: Readonly<AuthenticatedPrincipal>,
  correlationId: string,
): Readonly<{ locationId: string; actorId: string; correlationId: string }> {
  const frozen = freezeAuthenticatedPrincipal(principal);
  if (!CORRELATION_PATTERN.test(correlationId)) {
    throw new CampaignPrincipalInvalidError();
  }
  return Object.freeze({
    locationId: frozen.locationId,
    actorId: frozen.actorId,
    correlationId,
  });
}

export function approvalActorRoleForPrincipal(
  principal: Readonly<AuthenticatedPrincipal>,
): ApprovalDecision["actorRole"] {
  const frozen = freezeAuthenticatedPrincipal(principal);
  if (frozen.role === "location_admin") return "location_admin";
  if (frozen.role === "campaign_approver") return "approver";
  throw new CampaignCommandForbiddenError();
}

export function createSessionApprovalAuthority(
  principal: Readonly<AuthenticatedPrincipal>,
): ApprovalAuthorityPort {
  const frozen = freezeAuthenticatedPrincipal(principal);
  return {
    async assertMayApprove(input) {
      if (input.locationRef !== frozen.locationRef) {
        throw new CampaignResourceNotAccessibleError();
      }
      if (input.actorRef !== frozen.actorRef) {
        throw new CampaignCommandForbiddenError();
      }
      if (input.actorRole !== approvalActorRoleForPrincipal(frozen)) {
        throw new CampaignCommandForbiddenError();
      }
    },
  };
}
