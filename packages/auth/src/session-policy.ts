import { SafeTenantReferenceSchema } from "@oalo/contracts";

export const EMBEDDED_SESSION_ALGORITHM = "EdDSA" as const;

export const SESSION_APPLICATION_ROLES = [
  "location_admin",
  "campaign_creator",
  "campaign_approver",
  "campaign_publisher",
  "viewer",
  "platform_support",
] as const;

export type SessionApplicationRole = (typeof SESSION_APPLICATION_ROLES)[number];

export const SESSION_APPLICATION_ROLE_SET: ReadonlySet<string> = new Set(SESSION_APPLICATION_ROLES);

export interface FixtureSessionHeader {
  readonly alg: string;
  readonly kid: string;
}

export interface FixtureSessionClaims {
  readonly iss: string;
  readonly aud: string;
  readonly exp: number;
  readonly nbf: number;
  readonly sub: string;
  readonly sessionId: string;
  readonly nonce: string;
  readonly locationId: string;
  readonly installationId: string;
  readonly role: string;
  readonly roleVersion: number;
  readonly revoked: boolean;
}

export interface FixtureSessionPolicy {
  readonly issuer: string;
  readonly audience: string;
  readonly allowedKids: readonly string[];
  readonly nowEpochSeconds: number;
  readonly currentRoleVersion: number;
  readonly expectedLocationId: string;
  readonly expectedInstallationId: string;
  readonly resourceLocationId?: string;
  readonly clockSkewSeconds?: number;
}

export class SessionPolicyError extends Error {
  public constructor() {
    super("The session is not authorized.");
    this.name = "SessionPolicyError";
  }
}

export class LiveSessionVerificationDisabledError extends Error {
  public constructor() {
    super("Live HighLevel session verification is disabled in Phase 0.");
    this.name = "LiveSessionVerificationDisabledError";
  }
}

function assertClaim(value: boolean): void {
  if (!value) {
    throw new SessionPolicyError();
  }
}

export function validateFixtureSessionClaims(input: {
  readonly verificationState: "fixture-verified";
  readonly header: FixtureSessionHeader;
  readonly claims: FixtureSessionClaims;
  readonly policy: FixtureSessionPolicy;
}): Readonly<FixtureSessionClaims> {
  const { claims, header, policy } = input;
  const skew = policy.clockSkewSeconds ?? 0;

  assertClaim(header.alg === EMBEDDED_SESSION_ALGORITHM);
  assertClaim(policy.allowedKids.includes(header.kid));
  assertClaim(claims.iss === policy.issuer);
  assertClaim(claims.aud === policy.audience);
  assertClaim(claims.exp > policy.nowEpochSeconds - skew);
  assertClaim(claims.nbf <= policy.nowEpochSeconds + skew);
  assertClaim(claims.roleVersion === policy.currentRoleVersion);
  assertClaim(!claims.revoked);
  assertClaim(claims.locationId === policy.expectedLocationId);
  assertClaim(claims.installationId === policy.expectedInstallationId);
  assertClaim(
    policy.resourceLocationId === undefined || claims.locationId === policy.resourceLocationId,
  );
  SafeTenantReferenceSchema.parse(claims.locationId);
  SafeTenantReferenceSchema.parse(claims.installationId);

  return Object.freeze({ ...claims });
}

export interface DisabledLiveSessionVerifier {
  readonly mode: "disabled";
  verify(): Promise<never>;
}

export function createLiveSessionVerifier(): DisabledLiveSessionVerifier {
  return Object.freeze({
    mode: "disabled" as const,
    verify: () => Promise.reject(new LiveSessionVerificationDisabledError()),
  });
}

export function redactTokenPlaintext(_token: string): "[REDACTED]" {
  return "[REDACTED]";
}

export function createSafeTokenDiagnostic(input: {
  readonly installationId: string;
  readonly state: "HEALTHY" | "RECONNECT_REQUIRED" | "UNUSABLE";
  readonly tokenPresent: boolean;
}): Readonly<{ installationId: string; state: string; token: "[REDACTED]" }> {
  SafeTenantReferenceSchema.parse(input.installationId);
  return Object.freeze({
    installationId: input.installationId,
    state: input.state,
    token: "[REDACTED]",
  });
}
