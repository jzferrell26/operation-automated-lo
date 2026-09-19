import {
  CampaignPrincipalInvalidError,
  freezeAuthenticatedPrincipal,
  type AuthenticatedPrincipal,
  type AuthenticationMode,
} from "@oalo/application";
import type { ApplicationRole } from "@oalo/contracts";
import {
  CSRF_REQUEST_HEADER,
  FIRST_PARTY_SESSION_COOKIE,
  SessionPolicyError,
  authenticateInboundEmbeddedSession,
  authenticateInboundFirstPartySession,
  assertBrowserMutationRequest,
  type DatabaseBindingRole,
  type EmbeddedSessionTokenClaims,
  type EstablishedFirstPartySession,
  type FirstPartySessionLookup,
} from "@oalo/auth";

import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";

export const LOCAL_SYNTHETIC_LOCATION_ID = "00000000-0000-4000-8000-000000000801";
export const LOCAL_SYNTHETIC_ACTOR_ID = "00000000-0000-4000-8000-000000000811";
export const LOCAL_SYNTHETIC_LOCATION_REF = "location_localWorkspace001";
export const LOCAL_SYNTHETIC_ACTOR_REF = "principal_localUser001";
export const LOCAL_SYNTHETIC_INSTALLATION_REF = "installation_localWorkspace001";
export const LOCAL_SYNTHETIC_SESSION_ID = "session_localSynthetic001";

export class UnauthenticatedPrincipalError extends Error {
  public constructor() {
    super("The request is not authenticated.");
    this.name = "UnauthenticatedPrincipalError";
  }
}

export interface IdentityDirectory {
  resolveLocationId(locationRef: string): Promise<string | undefined>;
  resolveActorId(actorRef: string): Promise<string | undefined>;
}

export interface RoleBindingPort {
  currentRoleVersion(input: {
    actorRef: string;
    locationRef: string;
    role: ApplicationRole;
  }): Promise<number | undefined>;
}

export interface BrowserMutationGate {
  readonly expectedHost: string;
  readonly allowedBrowserOrigins: readonly string[];
  readonly csrfServerSecret: Uint8Array;
}

export interface EmbeddedSessionPort {
  readonly issuer: string;
  readonly audience: string;
  readonly publicKeysById: Readonly<Record<string, string>>;
  readonly nowEpochSeconds?: () => number;
  readonly isSessionActive: (claims: EmbeddedSessionTokenClaims) => boolean | Promise<boolean>;
}

/**
 * PRD-005b D4. Authenticated mutations move `last_seen_at` on the session they used. Reads do not,
 * so a tab left open overnight does not keep a session alive on its own.
 */
export interface SessionActivityPort {
  touch(sessionRef: string): Promise<void>;
}

export interface SessionDisplayNames {
  readonly locationDisplayName: string;
  readonly userDisplayName: string;
}

/**
 * PRD-005a 005A-AC-011. The one read that turns a verified principal into the names the review
 * shell paints. It answers `undefined` whenever the location or the person is not active, so a
 * name can never outlive the row that justifies it.
 */
export interface SessionDisplayPort {
  resolve(input: {
    locationRef: string;
    actorRef: string;
  }): Promise<Readonly<SessionDisplayNames> | undefined>;
}

export interface ReviewSessionIssuance {
  readonly locationId: string;
  readonly userId: string;
  readonly bindingRole: DatabaseBindingRole;
  readonly sessionRole: ApplicationRole;
  readonly sessionSecretHash: string;
  readonly lifetimeSeconds: number;
  readonly correlationRef: string;
}

/**
 * PRD-005b D4. The three `security definer` calls the review sign-in and sign-out paths make. Every
 * decision they describe is taken inside the database function, not here: this interface exists so
 * the handler can be driven from a unit test without a connection, and so the one pool the runtime
 * composition opens is the only pool the review routes use.
 */
export interface ReviewSessionPort {
  resolvePersona(
    input: Readonly<{ locationId: string; bindingRole: DatabaseBindingRole }>,
  ): Promise<string>;
  issue(input: Readonly<ReviewSessionIssuance>): Promise<string>;
  revoke(
    input: Readonly<{ sessionRef: string; reason: "sign_out"; correlationRef: string }>,
  ): Promise<boolean>;
  /**
   * 005B-AC-016. `issue` writes its own denied audit row and then raises, so that row dies with
   * the transaction. This records the attempt afterwards, in a transaction of its own.
   */
  recordDeniedAttempt(
    input: Readonly<{ locationId: string; userId: string; correlationRef: string }>,
  ): Promise<boolean>;
}

export interface CampaignCommandPorts {
  readonly identityDirectory: IdentityDirectory;
  readonly roleBindings: RoleBindingPort;
  readonly firstPartySessions?: FirstPartySessionLookup;
  readonly embedded?: EmbeddedSessionPort;
  readonly mutation?: BrowserMutationGate;
  readonly sessionActivity?: SessionActivityPort;
  readonly sessionDisplay?: SessionDisplayPort;
  readonly reviewSessions?: ReviewSessionPort;
}

function nowEpochSeconds(clock?: () => number): number {
  return clock?.() ?? Math.floor(Date.now() / 1000);
}

function readCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (cookieHeader === null || cookieHeader.length === 0) return undefined;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    if (trimmed.slice(0, separator) === name) {
      return trimmed.slice(separator + 1);
    }
  }
  return undefined;
}

function readBearerToken(authorization: string | null): string | undefined {
  if (authorization === null) return undefined;
  const match = /^Bearer ([A-Za-z0-9._-]+)$/u.exec(authorization);
  return match?.[1];
}

export function createStaticIdentityDirectory(
  entries: ReadonlyArray<
    Readonly<{ locationRef: string; locationId: string; actorRef: string; actorId: string }>
  >,
): IdentityDirectory {
  const locations = new Map<string, string>();
  const actors = new Map<string, string>();
  for (const entry of entries) {
    locations.set(entry.locationRef, entry.locationId);
    actors.set(entry.actorRef, entry.actorId);
  }
  return {
    async resolveLocationId(locationRef) {
      return locations.get(locationRef);
    },
    async resolveActorId(actorRef) {
      return actors.get(actorRef);
    },
  };
}

export function createStaticRoleBindingPort(
  bindings: ReadonlyArray<
    Readonly<{
      actorRef: string;
      locationRef: string;
      role: ApplicationRole;
      roleVersion: number;
    }>
  >,
): RoleBindingPort {
  const versions = new Map<string, number>();
  for (const binding of bindings) {
    versions.set(
      `${binding.locationRef}\0${binding.actorRef}\0${binding.role}`,
      binding.roleVersion,
    );
  }
  return {
    async currentRoleVersion(input) {
      return versions.get(`${input.locationRef}\0${input.actorRef}\0${input.role}`);
    },
  };
}

export function createLocalSyntheticPrincipal(
  overrides: Partial<AuthenticatedPrincipal> = {},
): Readonly<AuthenticatedPrincipal> {
  return freezeAuthenticatedPrincipal({
    actorRef: LOCAL_SYNTHETIC_ACTOR_REF,
    actorId: LOCAL_SYNTHETIC_ACTOR_ID,
    locationRef: LOCAL_SYNTHETIC_LOCATION_REF,
    locationId: LOCAL_SYNTHETIC_LOCATION_ID,
    installationRef: LOCAL_SYNTHETIC_INSTALLATION_REF,
    role: "campaign_creator",
    roleVersion: 1,
    sessionId: LOCAL_SYNTHETIC_SESSION_ID,
    authenticationMode: "local_synthetic",
    ...overrides,
  });
}

export function createDefaultCampaignCommandPorts(): CampaignCommandPorts {
  return {
    identityDirectory: createStaticIdentityDirectory([
      {
        locationRef: LOCAL_SYNTHETIC_LOCATION_REF,
        locationId: LOCAL_SYNTHETIC_LOCATION_ID,
        actorRef: LOCAL_SYNTHETIC_ACTOR_REF,
        actorId: LOCAL_SYNTHETIC_ACTOR_ID,
      },
    ]),
    roleBindings: createStaticRoleBindingPort([
      {
        actorRef: LOCAL_SYNTHETIC_ACTOR_REF,
        locationRef: LOCAL_SYNTHETIC_LOCATION_REF,
        role: "campaign_creator",
        roleVersion: 1,
      },
    ]),
  };
}

async function bindPrincipal(input: {
  actorRef: string;
  locationRef: string;
  installationRef: string;
  role: ApplicationRole;
  roleVersion: number;
  sessionId: string;
  authenticationMode: AuthenticationMode;
  ports: CampaignCommandPorts;
}): Promise<Readonly<AuthenticatedPrincipal>> {
  const [locationId, actorId] = await Promise.all([
    input.ports.identityDirectory.resolveLocationId(input.locationRef),
    input.ports.identityDirectory.resolveActorId(input.actorRef),
  ]);
  if (locationId === undefined || actorId === undefined) {
    throw new UnauthenticatedPrincipalError();
  }
  try {
    return freezeAuthenticatedPrincipal({
      actorRef: input.actorRef,
      actorId,
      locationRef: input.locationRef,
      locationId,
      installationRef: input.installationRef,
      role: input.role,
      roleVersion: input.roleVersion,
      sessionId: input.sessionId,
      authenticationMode: input.authenticationMode,
    });
  } catch (error) {
    if (error instanceof CampaignPrincipalInvalidError) {
      throw new UnauthenticatedPrincipalError();
    }
    throw error;
  }
}

function assertMutationGate(
  request: Request,
  sessionId: string,
  mode: "cookie" | "embedded-bearer",
  gate: BrowserMutationGate | undefined,
): void {
  if (gate === undefined) {
    throw new UnauthenticatedPrincipalError();
  }
  const csrfToken = request.headers.get(CSRF_REQUEST_HEADER);
  assertBrowserMutationRequest({
    authenticationMode: mode,
    origin: request.headers.get("origin"),
    host: request.headers.get("host") ?? "",
    expectedHost: gate.expectedHost,
    allowedBrowserOrigins: gate.allowedBrowserOrigins,
    sessionId,
    csrfServerSecret: gate.csrfServerSecret,
    ...(csrfToken === null ? {} : { csrfToken }),
  });
}

async function resolveEmbeddedPrincipal(
  request: Request,
  token: string,
  ports: CampaignCommandPorts,
  mutationRequired: boolean,
): Promise<Readonly<AuthenticatedPrincipal>> {
  if (ports.embedded === undefined) {
    throw new UnauthenticatedPrincipalError();
  }
  const embedded = ports.embedded;
  const claims = await authenticateInboundEmbeddedSession({
    token,
    policy: {
      issuer: embedded.issuer,
      audience: embedded.audience,
      publicKeysById: embedded.publicKeysById,
      nowEpochSeconds: nowEpochSeconds(embedded.nowEpochSeconds),
      isSessionActive: embedded.isSessionActive,
      currentRoleVersion: async (candidate) => {
        const version = await ports.roleBindings.currentRoleVersion({
          actorRef: candidate.sub,
          locationRef: candidate.locationId,
          role: candidate.role,
        });
        if (version === undefined) {
          throw new SessionPolicyError();
        }
        return version;
      },
    },
  });
  if (mutationRequired) {
    assertMutationGate(request, claims.sessionId, "embedded-bearer", ports.mutation);
  }
  return bindPrincipal({
    actorRef: claims.sub,
    locationRef: claims.locationId,
    installationRef: claims.installationId,
    role: claims.role,
    roleVersion: claims.roleVersion,
    sessionId: claims.sessionId,
    authenticationMode: "embedded",
    ports,
  });
}

async function resolveFirstPartyPrincipal(
  request: Request,
  sessionSecret: string,
  ports: CampaignCommandPorts,
  mutationRequired: boolean,
): Promise<Readonly<AuthenticatedPrincipal>> {
  if (ports.firstPartySessions === undefined) {
    throw new UnauthenticatedPrincipalError();
  }
  const session: EstablishedFirstPartySession = await authenticateInboundFirstPartySession({
    sessionSecret,
    lookup: ports.firstPartySessions,
    nowEpochSeconds: nowEpochSeconds(),
    currentRoleVersion: async (candidate) => {
      const version = await ports.roleBindings.currentRoleVersion({
        actorRef: candidate.userId,
        locationRef: candidate.locationId,
        role: candidate.role,
      });
      if (version === undefined) {
        throw new SessionPolicyError();
      }
      return version;
    },
  });
  if (mutationRequired) {
    assertMutationGate(request, session.sessionId, "cookie", ports.mutation);
    // PRD-005b D4. Only after the whole gate passes, so a refused request never
    // reports activity on the session it failed to use.
    await ports.sessionActivity?.touch(session.sessionId);
  }
  return bindPrincipal({
    actorRef: session.userId,
    locationRef: session.locationId,
    installationRef: session.installationId,
    role: session.role,
    roleVersion: session.roleVersion,
    sessionId: session.sessionId,
    authenticationMode: "first_party",
    ports,
  });
}

export async function resolveAuthenticatedPrincipal(
  request: Request,
  environment: unknown,
  ports: CampaignCommandPorts,
): Promise<Readonly<AuthenticatedPrincipal>> {
  return resolveAuthenticatedSession(request, environment, ports, true);
}

export async function resolveAuthenticatedReadPrincipal(
  request: Request,
  environment: unknown,
  ports: CampaignCommandPorts,
): Promise<Readonly<AuthenticatedPrincipal>> {
  return resolveAuthenticatedSession(request, environment, ports, false);
}

async function resolveAuthenticatedSession(
  request: Request,
  environment: unknown,
  ports: CampaignCommandPorts,
  mutationRequired: boolean,
): Promise<Readonly<AuthenticatedPrincipal>> {
  const bearer = readBearerToken(request.headers.get("authorization"));
  const cookie = readCookieValue(request.headers.get("cookie"), FIRST_PARTY_SESSION_COOKIE);
  if (bearer !== undefined && cookie !== undefined) {
    throw new UnauthenticatedPrincipalError();
  }
  if (cookie !== undefined) {
    return resolveFirstPartyPrincipal(request, cookie, ports, mutationRequired);
  }
  if (bearer !== undefined) {
    return resolveEmbeddedPrincipal(request, bearer, ports, mutationRequired);
  }

  const mode = authenticatedWorkspaceMode(environment);
  if (mode !== "synthetic") {
    throw new UnauthenticatedPrincipalError();
  }
  return createLocalSyntheticPrincipal();
}
