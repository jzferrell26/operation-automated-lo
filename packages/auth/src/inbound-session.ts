import { SafeTenantReferenceSchema } from "@oalo/contracts";

import {
  BrowserSessionPolicyError,
  type EstablishedFirstPartySession,
  type FirstPartySessionLookup,
} from "./browser-session.js";
import {
  assertEmbeddedSessionLifetime,
  readSignedEmbeddedSessionToken,
  type EmbeddedSessionTokenClaims,
} from "./embedded-session.js";
import { SESSION_APPLICATION_ROLE_SET, SessionPolicyError } from "./session-policy.js";

export interface InboundEmbeddedSessionPolicy {
  readonly issuer: string;
  readonly audience: string;
  readonly publicKeysById: Readonly<Record<string, string>>;
  readonly nowEpochSeconds: number;
  readonly clockSkewSeconds?: number;
  readonly isSessionActive: (claims: EmbeddedSessionTokenClaims) => boolean | Promise<boolean>;
  readonly currentRoleVersion: (claims: EmbeddedSessionTokenClaims) => number | Promise<number>;
}

export async function authenticateInboundEmbeddedSession(input: {
  readonly token: string;
  readonly policy: InboundEmbeddedSessionPolicy;
}): Promise<Readonly<EmbeddedSessionTokenClaims>> {
  const claims = readSignedEmbeddedSessionToken({
    token: input.token,
    publicKeysById: input.policy.publicKeysById,
  });
  assertEmbeddedSessionLifetime(claims, input.policy);
  const active = await input.policy.isSessionActive(claims);
  const currentRoleVersion = await input.policy.currentRoleVersion(claims);
  if (
    active !== true ||
    !Number.isSafeInteger(currentRoleVersion) ||
    currentRoleVersion !== claims.roleVersion
  ) {
    throw new SessionPolicyError();
  }
  return Object.freeze({ ...claims });
}

export async function authenticateInboundFirstPartySession(input: {
  readonly sessionSecret: string;
  readonly lookup: FirstPartySessionLookup;
  readonly nowEpochSeconds: number;
  readonly currentRoleVersion: (session: EstablishedFirstPartySession) => number | Promise<number>;
}): Promise<Readonly<EstablishedFirstPartySession>> {
  if (
    !/^[A-Za-z0-9_-]{32,256}$/u.test(input.sessionSecret) ||
    !Number.isSafeInteger(input.nowEpochSeconds)
  ) {
    throw new BrowserSessionPolicyError();
  }
  const session = await input.lookup.getActive(input.sessionSecret, input.nowEpochSeconds);
  if (session === undefined || session.expiresAtEpochSeconds <= input.nowEpochSeconds) {
    throw new BrowserSessionPolicyError();
  }
  if (
    !SafeTenantReferenceSchema.safeParse(session.sessionId).success ||
    !SafeTenantReferenceSchema.safeParse(session.userId).success ||
    !SafeTenantReferenceSchema.safeParse(session.locationId).success ||
    !SafeTenantReferenceSchema.safeParse(session.installationId).success ||
    !SESSION_APPLICATION_ROLE_SET.has(session.role) ||
    !Number.isSafeInteger(session.roleVersion) ||
    session.roleVersion < 1
  ) {
    throw new BrowserSessionPolicyError();
  }
  const currentRoleVersion = await input.currentRoleVersion(session);
  if (!Number.isSafeInteger(currentRoleVersion) || currentRoleVersion !== session.roleVersion) {
    throw new BrowserSessionPolicyError();
  }
  return Object.freeze({ ...session });
}
