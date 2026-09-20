import { z } from "zod";

import type { AuthenticatedPrincipal } from "@oalo/application";
import { createSessionBoundCsrfToken } from "@oalo/auth";
import type { ApplicationRole } from "@oalo/contracts";
import { createPostgresPool, type DatabasePool } from "@oalo/db";

import { SIGNED_IN_SOURCE, ROLE_LABELS as USER_ROLE_LABELS } from "../copy/user-language.js";
import type {
  EmailVerificationView,
  WorkspaceSessionView,
} from "../features/shell/model/navigation.js";
import type { Capability } from "../features/ui-foundation/model/synthetic-ui.js";
import {
  createDefaultCampaignCommandPorts,
  resolveAuthenticatedReadPrincipal,
  type BrowserMutationGate,
  type CampaignCommandPorts,
  type EmbeddedSessionPort,
  type IdentityDirectory,
  type RoleBindingPort,
} from "./authenticated-principal.js";
import {
  authenticatedWorkspaceMode,
  REVIEW_SURFACE_DISCLOSURE,
} from "./authenticated-workspace-data.js";
import { createNotConfiguredEmailAdapter } from "./email/not-configured-email-adapter.js";
import { createResendEmailAdapter } from "./email/resend-email-adapter.js";
import type { TransactionalEmailPort } from "./email/transactional-email.js";
import {
  createPostgresFirstPartySessionIssuancePort,
  createPostgresFirstPartySessionLookup,
  createPostgresIdentityDirectory,
  createPostgresRoleBindingPort,
  createPostgresSessionActivityPort,
  createPostgresSessionDisplayPort,
  firstPartySessionIsActive,
} from "./postgres-authentication-ports.js";
import { createPostgresCredentialPort } from "./postgres-credential-ports.js";

/**
 * PRD-005a D5 and D7. The server-only composition of `CampaignCommandPorts`.
 *
 * Two rules govern this module and both are failure-direction rules:
 *
 * 1. The static synthetic ports are constructed only when
 *    `authenticatedWorkspaceMode(environment)` is `synthetic`. There is no path from a review or
 *    production deployment to `createLocalSyntheticPrincipal`, whatever else is misconfigured.
 * 2. Outside synthetic mode, a missing or invalid input produces denying ports rather than partial
 *    ones. Denying ports supply no session lookup, no embedded policy, and no mutation gate, so the
 *    resolver in `authenticated-principal.ts` raises `UnauthenticatedPrincipalError` on every
 *    credential shape: 401 on mutations, an unauthenticated render on reads.
 *
 * Composition failures are logged once per process, naming the variable and never its value.
 */

export const RUNTIME_AUTHENTICATION_VARIABLES = Object.freeze([
  "OALO_DATABASE_URL",
  "OALO_APP_URL",
  "OALO_ALLOWED_ORIGINS",
  "OALO_CSRF_SERVER_SECRET",
  "OALO_EMBEDDED_SESSION_ISSUER",
  "OALO_EMBEDDED_SESSION_AUDIENCE",
  "OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON",
  "OALO_RESEND_API_KEY",
  "OALO_EMAIL_FROM",
] as const);

export type RuntimeAuthenticationVariable = (typeof RUNTIME_AUTHENTICATION_VARIABLES)[number];

export type RuntimeAuthenticationMode = "synthetic" | "review" | "unavailable";

export interface RuntimeAuthenticationComposition {
  readonly mode: RuntimeAuthenticationMode;
  readonly ports: CampaignCommandPorts;
  /** The variable that failed, or `undefined` when the composition is usable. */
  readonly failedVariable?: RuntimeAuthenticationVariable;
}

const RuntimeAuthenticationEnvironmentSchema = z
  .object({
    OALO_ENVIRONMENT: z.enum(["local", "preview", "staging", "production"]).default("local"),
    OALO_PROVIDER_MODE: z.enum(["stub", "contract-test", "live"]).default("stub"),
    OALO_SYNTHETIC_DATA_ONLY: z.enum(["true", "false"]).default("true"),
    OALO_REVIEW_SURFACE: z.string().optional(),
    OALO_DATABASE_SSL_MODE: z.enum(["disable", "require", "verify-full"]).optional(),
    OALO_DATABASE_URL: z.string().optional(),
    OALO_APP_URL: z.string().optional(),
    OALO_ALLOWED_ORIGINS: z.string().optional(),
    OALO_CSRF_SERVER_SECRET: z.string().optional(),
    OALO_EMBEDDED_SESSION_ISSUER: z.string().optional(),
    OALO_EMBEDDED_SESSION_AUDIENCE: z.string().optional(),
    OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON: z.string().optional(),
    OALO_RESEND_API_KEY: z.string().optional(),
    OALO_EMAIL_FROM: z.string().optional(),
    OALO_SELF_SERVE_SIGNUP: z.string().optional(),
  })
  .passthrough();

type RuntimeAuthenticationEnvironment = z.infer<typeof RuntimeAuthenticationEnvironmentSchema>;

export class RuntimeAuthenticationConfigurationError extends Error {
  public readonly variable: RuntimeAuthenticationVariable;

  public constructor(variable: RuntimeAuthenticationVariable) {
    super(`Runtime authentication is not configured: ${variable}`);
    this.name = "RuntimeAuthenticationConfigurationError";
    this.variable = variable;
  }
}

/** Ports that authenticate nobody. Every resolver branch fails closed against them. */
function createDenyingCampaignCommandPorts(): CampaignCommandPorts {
  const identityDirectory: IdentityDirectory = {
    async resolveLocationId() {
      return undefined;
    },
    async resolveActorId() {
      return undefined;
    },
  };
  const roleBindings: RoleBindingPort = {
    async currentRoleVersion() {
      return undefined;
    },
  };
  return Object.freeze({ identityDirectory, roleBindings });
}

function rawValue(
  environment: RuntimeAuthenticationEnvironment,
  variable: RuntimeAuthenticationVariable,
): string | undefined {
  const value = environment[variable];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function requiredValue(
  environment: RuntimeAuthenticationEnvironment,
  variable: RuntimeAuthenticationVariable,
): string {
  const value = rawValue(environment, variable);
  if (value === undefined) throw new RuntimeAuthenticationConfigurationError(variable);
  return value;
}

function httpsUrl(value: string, variable: RuntimeAuthenticationVariable): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new RuntimeAuthenticationConfigurationError(variable);
  }
  if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") {
    throw new RuntimeAuthenticationConfigurationError(variable);
  }
  return parsed;
}

function parseExpectedHost(environment: RuntimeAuthenticationEnvironment): string {
  const parsed = httpsUrl(requiredValue(environment, "OALO_APP_URL"), "OALO_APP_URL");
  if (parsed.host.length === 0) {
    throw new RuntimeAuthenticationConfigurationError("OALO_APP_URL");
  }
  return parsed.host;
}

/**
 * Exact origins only. `assertBrowserMutationRequest` re-checks the same shape and rejects the whole
 * request if any entry carries a path, a query, credentials, or a wildcard, so an allowlist that
 * would fail there is refused here first, where the failure names the variable.
 */
function parseAllowedOrigins(environment: RuntimeAuthenticationEnvironment): readonly string[] {
  const entries = requiredValue(environment, "OALO_ALLOWED_ORIGINS")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) {
    throw new RuntimeAuthenticationConfigurationError("OALO_ALLOWED_ORIGINS");
  }
  for (const entry of entries) {
    const parsed = httpsUrl(entry, "OALO_ALLOWED_ORIGINS");
    if (parsed.origin !== entry || parsed.pathname !== "/" || parsed.search !== "") {
      throw new RuntimeAuthenticationConfigurationError("OALO_ALLOWED_ORIGINS");
    }
  }
  return Object.freeze([...entries]);
}

function parseCsrfServerSecret(environment: RuntimeAuthenticationEnvironment): Uint8Array {
  const raw = requiredValue(environment, "OALO_CSRF_SERVER_SECRET");
  if (!/^[A-Za-z0-9_-]{43,512}$/u.test(raw)) {
    throw new RuntimeAuthenticationConfigurationError("OALO_CSRF_SERVER_SECRET");
  }
  const decoded = Buffer.from(raw, "base64url");
  if (decoded.byteLength < 32) {
    throw new RuntimeAuthenticationConfigurationError("OALO_CSRF_SERVER_SECRET");
  }
  return new Uint8Array(decoded);
}

function parseMutationGate(environment: RuntimeAuthenticationEnvironment): BrowserMutationGate {
  return Object.freeze({
    expectedHost: parseExpectedHost(environment),
    allowedBrowserOrigins: parseAllowedOrigins(environment),
    csrfServerSecret: parseCsrfServerSecret(environment),
  });
}

const EMBEDDED_VARIABLES = Object.freeze([
  "OALO_EMBEDDED_SESSION_ISSUER",
  "OALO_EMBEDDED_SESSION_AUDIENCE",
  "OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON",
] as const);

const PublicKeysSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9_]{2,63}$/u),
  z.string().includes("BEGIN PUBLIC KEY"),
);

function parsePublicKeysById(raw: string): Readonly<Record<string, string>> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new RuntimeAuthenticationConfigurationError("OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON");
  }
  const parsed = PublicKeysSchema.safeParse(decoded);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    throw new RuntimeAuthenticationConfigurationError("OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON");
  }
  return Object.freeze({ ...parsed.data });
}

/**
 * The three embedded variables are optional as a set. All absent means `ports.embedded` stays
 * undefined and every bearer request is refused, which is where this deployment sits until the
 * HighLevel signed-context exchange exists. A partial set is a composition failure, so a
 * half-configured issuer cannot silently degrade into "no embedded policy".
 *
 * 005A-AC-003. `isSessionActive` is the 005b predicate keyed by the session reference the token
 * carries, so a bearer token whose session was revoked or has expired is refused even while the
 * token's own signature and expiry still check out. A reference the predicate cannot resolve is
 * inactive, because the only safe answer to an unprovable activity check is no.
 */
function parseEmbeddedPort(
  environment: RuntimeAuthenticationEnvironment,
  pool: DatabasePool,
): EmbeddedSessionPort | undefined {
  const missing = EMBEDDED_VARIABLES.filter(
    (variable) => rawValue(environment, variable) === undefined,
  );
  if (missing.length === EMBEDDED_VARIABLES.length) return undefined;
  const firstMissing = missing[0];
  if (firstMissing !== undefined) {
    throw new RuntimeAuthenticationConfigurationError(firstMissing);
  }
  const issuer = requiredValue(environment, "OALO_EMBEDDED_SESSION_ISSUER");
  httpsUrl(issuer, "OALO_EMBEDDED_SESSION_ISSUER");
  const port: EmbeddedSessionPort = {
    issuer,
    audience: requiredValue(environment, "OALO_EMBEDDED_SESSION_AUDIENCE"),
    publicKeysById: parsePublicKeysById(
      requiredValue(environment, "OALO_EMBEDDED_SESSION_PUBLIC_KEYS_JSON"),
    ),
    isSessionActive: (claims) => firstPartySessionIsActive(pool, claims.sessionId),
  };
  return Object.freeze(port);
}

const EMAIL_VARIABLES = Object.freeze(["OALO_RESEND_API_KEY", "OALO_EMAIL_FROM"] as const);

/**
 * PRD-006a D6. Both variables present selects Resend; both absent selects the not-configured
 * adapter, which never calls `fetch`; exactly one present is a composition failure, logged by
 * variable name, in the same shape the embedded set uses. A half-configured sending domain must
 * not silently degrade into "no email", because an operator who set one of the two believes mail
 * is going out.
 *
 * Synthetic mode never reaches this function: `composeRuntimeAuthentication` returns the static
 * synthetic ports before any of it runs, and those carry no email port at all.
 */
function parseTransactionalEmailPort(
  environment: RuntimeAuthenticationEnvironment,
): TransactionalEmailPort {
  const missing = EMAIL_VARIABLES.filter(
    (variable) => rawValue(environment, variable) === undefined,
  );
  if (missing.length === EMAIL_VARIABLES.length) return createNotConfiguredEmailAdapter();
  const firstMissing = missing[0];
  if (firstMissing !== undefined) {
    throw new RuntimeAuthenticationConfigurationError(firstMissing);
  }
  return createResendEmailAdapter({
    apiKey: requiredValue(environment, "OALO_RESEND_API_KEY"),
    from: requiredValue(environment, "OALO_EMAIL_FROM"),
  });
}

function sslModeFor(
  deploymentEnvironment: "local" | "preview" | "staging" | "production",
  explicit: "disable" | "require" | "verify-full" | undefined,
): "disable" | "require" | "verify-full" {
  if (explicit !== undefined) return explicit;
  return deploymentEnvironment === "local" ? "disable" : "require";
}

function createAuthenticationPool(environment: RuntimeAuthenticationEnvironment): DatabasePool {
  const connectionString = requiredValue(environment, "OALO_DATABASE_URL");
  if (!connectionString.startsWith("postgres")) {
    throw new RuntimeAuthenticationConfigurationError("OALO_DATABASE_URL");
  }
  try {
    return createPostgresPool({
      connectionString,
      deploymentEnvironment: environment.OALO_ENVIRONMENT,
      poolingMode: "transaction",
      preparedStatements: false,
      sslMode: sslModeFor(environment.OALO_ENVIRONMENT, environment.OALO_DATABASE_SSL_MODE),
      applicationName: "oalo-runtime-authentication",
    });
  } catch {
    throw new RuntimeAuthenticationConfigurationError("OALO_DATABASE_URL");
  }
}

function buildVerifiedPorts(environment: RuntimeAuthenticationEnvironment): CampaignCommandPorts {
  const mutation = parseMutationGate(environment);
  // The pool is built before the embedded policy because the policy's activity check is a query,
  // and after the mutation gate so a bad origin list fails without opening a connection.
  const pool = createAuthenticationPool(environment);
  const embedded = parseEmbeddedPort(environment, pool);
  const ports: CampaignCommandPorts = {
    identityDirectory: createPostgresIdentityDirectory(pool),
    roleBindings: createPostgresRoleBindingPort(pool),
    firstPartySessions: createPostgresFirstPartySessionLookup(pool),
    sessionActivity: createPostgresSessionActivityPort(pool),
    sessionDisplay: createPostgresSessionDisplayPort(pool),
    sessionIssuance: createPostgresFirstPartySessionIssuancePort(pool),
    credentials: createPostgresCredentialPort(pool),
    transactionalEmail: parseTransactionalEmailPort(environment),
    mutation,
    ...(embedded === undefined ? {} : { embedded }),
  };
  return Object.freeze(ports);
}

const loggedFailures = new Set<string>();

function logCompositionFailure(variable: RuntimeAuthenticationVariable): void {
  if (loggedFailures.has(variable)) return;
  loggedFailures.add(variable);
  // Names the variable only. A composition failure must never put a candidate value in a log.
  console.error(
    `runtime-authentication: composition failed because ${variable} is missing or invalid; requests are refused.`,
  );
}

function composeRuntimeAuthentication(
  environment: RuntimeAuthenticationEnvironment,
): RuntimeAuthenticationComposition {
  let mode: RuntimeAuthenticationMode;
  try {
    mode = authenticatedWorkspaceMode(environment);
  } catch {
    return Object.freeze({ mode: "unavailable", ports: createDenyingCampaignCommandPorts() });
  }

  if (mode === "synthetic") {
    return Object.freeze({ mode, ports: createDefaultCampaignCommandPorts() });
  }

  try {
    return Object.freeze({ mode, ports: buildVerifiedPorts(environment) });
  } catch (error: unknown) {
    if (error instanceof RuntimeAuthenticationConfigurationError) {
      logCompositionFailure(error.variable);
      return Object.freeze({
        mode,
        ports: createDenyingCampaignCommandPorts(),
        failedVariable: error.variable,
      });
    }
    throw error;
  }
}

interface CachedComposition {
  readonly fingerprint: string;
  readonly composition: RuntimeAuthenticationComposition;
}

let cached: CachedComposition | undefined;

function fingerprintOf(environment: RuntimeAuthenticationEnvironment): string {
  return [
    environment.OALO_ENVIRONMENT,
    environment.OALO_PROVIDER_MODE,
    environment.OALO_SYNTHETIC_DATA_ONLY,
    environment.OALO_REVIEW_SURFACE ?? "",
    environment.OALO_DATABASE_SSL_MODE ?? "",
    ...RUNTIME_AUTHENTICATION_VARIABLES.map((variable) => rawValue(environment, variable) ?? ""),
  ].join(" ");
}

/**
 * The composition parses the environment once per process. The cache is keyed by the inputs it
 * reads so a test can vary them, while a deployment, whose environment does not change, parses once.
 */
export function resolveRuntimeAuthenticationComposition(
  input: unknown = process.env,
): RuntimeAuthenticationComposition {
  const parsed = RuntimeAuthenticationEnvironmentSchema.safeParse(input);
  if (!parsed.success) {
    return Object.freeze({ mode: "unavailable", ports: createDenyingCampaignCommandPorts() });
  }
  const fingerprint = fingerprintOf(parsed.data);
  if (cached !== undefined && cached.fingerprint === fingerprint) {
    return cached.composition;
  }
  const composition = composeRuntimeAuthentication(parsed.data);
  cached = { fingerprint, composition };
  return composition;
}

/** 005A-AC-001. The one port factory every campaign read and mutation entry point uses. */
export function resolveRuntimeCampaignCommandPorts(
  input: unknown = process.env,
): CampaignCommandPorts {
  return resolveRuntimeAuthenticationComposition(input).ports;
}

export function resetRuntimeAuthenticationForTests(): void {
  cached = undefined;
  loggedFailures.clear();
}

const CAPABILITIES_BY_ROLE: Readonly<Record<ApplicationRole, readonly Capability[]>> =
  Object.freeze({
    location_admin: Object.freeze([
      "campaign:create",
      "location:read",
      "onboarding:read",
      "pipeline:read",
      "reports:read",
      "settings:read",
    ] as const),
    campaign_creator: Object.freeze([
      "campaign:create",
      "location:read",
      "onboarding:read",
      "pipeline:read",
      "reports:read",
    ] as const),
    campaign_approver: Object.freeze([
      "location:read",
      "onboarding:read",
      "pipeline:read",
      "reports:read",
    ] as const),
    campaign_publisher: Object.freeze([
      "location:read",
      "onboarding:read",
      "pipeline:read",
      "reports:read",
    ] as const),
    viewer: Object.freeze(["location:read", "reports:read"] as const),
    platform_support: Object.freeze(["location:read"] as const),
  });

/**
 * The shell shows the user their own role. PRD-006b D3 fixes what each role is called, and the map
 * lives in the copy module so the same six words appear wherever a role is named.
 */
const ROLE_LABELS: Readonly<Record<ApplicationRole, string>> = USER_ROLE_LABELS;

/**
 * Where a signed-in user's shell identity comes from. It states two separate facts: this request
 * carried a real sign-in, and nothing is connected to the workspace behind it. Neither claim is
 * borrowed from the demo fixture's closed vocabulary, because neither means the same thing here.
 */
export const VERIFIED_SESSION_SOURCE = SIGNED_IN_SOURCE;

export const CSRF_META_NAME = "oalo-csrf-token";

/**
 * PRD-006a D9. The persona selector's two paths are gone with it. Everything that used to send a
 * visitor to `/review/sign-in` now sends them to the email and password sign-in page, and the
 * shell's sign-out control posts to the auth route rather than the review one.
 */
export const SIGN_IN_PATH = "/sign-in";
export const SIGN_OUT_PATH = "/api/auth/sign-out";

/**
 * PRD-006b D10's unverified notice ends with a control, "Resend the link.", and this is where it
 * posts. It sits beside the sign-out path because the two are the shell's only two mutations and
 * both are plain forms carrying the session-bound token as a field.
 */
export const RESEND_VERIFICATION_PATH = "/api/auth/resend-verification";

export interface RuntimeShellSession {
  readonly mode: RuntimeAuthenticationMode;
  readonly authenticated: boolean;
  readonly session: WorkspaceSessionView | undefined;
  /** `createSessionBoundCsrfToken` output. Never the session cookie value. */
  readonly csrfToken: string | undefined;
}

const UNAUTHENTICATED_SHELL: Readonly<Omit<RuntimeShellSession, "mode">> = Object.freeze({
  authenticated: false,
  session: undefined,
  csrfToken: undefined,
});

/**
 * 005A-AC-011 and 005A-AC-012. Projects the verified principal into the shape the shell paints and
 * mints the session-bound CSRF token the browser helper sends.
 *
 * Display names come from `platform.resolve_session_display`, the definer read that returns
 * `platform.locations.display_name` and `platform.app_users.safe_display_name` only while both
 * rows are active. When that read returns nothing the shell falls back to the canonical references
 * the session carries: a reference states exactly what the session proves, and inventing a
 * friendly name would not.
 */
/**
 * PRD-006a 006A-AC-021. Whether this shell has anything to say about the person's email address.
 *
 * The lookup is by the person the verified session names, through the credential port, and never
 * by an address the browser sent: a read keyed on caller-supplied text would be a credential
 * oracle even with the answer checked against the session afterwards.
 *
 * A deployment with no sending domain is `not_applicable` before the read even happens, because
 * 006A-AC-021 turns on not asking: nothing was sent, so nothing may ask anyone to look for it, and
 * the control that would resend it can do nothing. A session with no credential row is
 * `not_applicable` for the same kind of reason: there is no email address in play to confirm.
 *
 * A failed read is `not_applicable`, not `unverified`. The cost of the wrong answer is asymmetric:
 * staying quiet when the database is unreachable costs nothing, and telling a person with a
 * confirmed address to go and confirm it is the product being wrong about them.
 */
async function resolveEmailVerification(
  ports: CampaignCommandPorts,
  actorId: string,
): Promise<EmailVerificationView> {
  const email = ports.transactionalEmail;
  if (email === undefined || !email.configured) return "not_applicable";
  const credentials = ports.credentials;
  if (credentials === undefined) return "not_applicable";
  try {
    const credential = await credentials.lookupCredentialForUser(actorId);
    if (credential === undefined) return "not_applicable";
    return credential.emailVerified ? "verified" : "unverified";
  } catch {
    return "not_applicable";
  }
}

export async function resolveRuntimeShellSession(
  request: Request,
  input: unknown = process.env,
  portsOverride?: CampaignCommandPorts,
): Promise<RuntimeShellSession> {
  const composition = resolveRuntimeAuthenticationComposition(input);
  if (composition.mode !== "review") {
    return Object.freeze({ mode: composition.mode, ...UNAUTHENTICATED_SHELL });
  }
  const ports = portsOverride ?? composition.ports;
  let principal: Readonly<AuthenticatedPrincipal>;
  try {
    principal = await resolveAuthenticatedReadPrincipal(request, input, ports);
  } catch {
    return Object.freeze({ mode: composition.mode, ...UNAUTHENTICATED_SHELL });
  }
  const gate = ports.mutation;
  const csrfToken =
    gate === undefined
      ? undefined
      : createSessionBoundCsrfToken({
          serverSecret: gate.csrfServerSecret,
          sessionId: principal.sessionId,
        });
  const display = await ports.sessionDisplay?.resolve({
    locationRef: principal.locationRef,
    actorRef: principal.actorRef,
  });
  const session: WorkspaceSessionView = Object.freeze({
    emailVerification: await resolveEmailVerification(ports, principal.actorId),
    safety: Object.freeze({
      dataMode: "synthetic" as const,
      writesEnabled: false as const,
      disclosure: REVIEW_SURFACE_DISCLOSURE,
    }),
    user: Object.freeze({
      displayName: display?.userDisplayName ?? principal.actorRef,
      roleLabel: ROLE_LABELS[principal.role],
      capabilities: CAPABILITIES_BY_ROLE[principal.role],
    }),
    location: Object.freeze({
      displayName: display?.locationDisplayName ?? principal.locationRef,
      source: VERIFIED_SESSION_SOURCE,
    }),
  });
  return Object.freeze({
    mode: composition.mode,
    authenticated: true,
    session,
    ...(csrfToken === undefined ? { csrfToken: undefined } : { csrfToken }),
  });
}
