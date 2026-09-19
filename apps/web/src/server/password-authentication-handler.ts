import { createHash, createHmac, randomBytes } from "node:crypto";

import {
  CSRF_REQUEST_HEADER,
  DUMMY_PASSWORD_HASH,
  FIRST_PARTY_SESSION_COOKIE,
  applicationRoleForDatabaseRole,
  evaluatePassword,
  hashPassword,
  serializeFirstPartySessionCookie,
  verifyPassword,
} from "@oalo/auth";
import { parseSessionRef } from "@oalo/contracts";
import { z } from "zod";

import {
  UnauthenticatedPrincipalError,
  resolveAuthenticatedPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import { jsonCommandError } from "./campaign-command-http.js";
import {
  correlationReferenceForRequest,
  withCorrelationHeaders,
  type CorrelationRouteName,
  type RequestCorrelation,
} from "./correlation-boundary.js";
import type {
  AuthRateLimitScope,
  CredentialPort,
  EmailDeliveryAction,
  SignInBinding,
} from "./credential-ports.js";
import { buildEmailVerificationEmail, buildPasswordResetEmail } from "./email/email-templates.js";
import {
  emailDeliveryResult,
  emailDeliverySubject,
  type TransactionalEmailMessage,
  type TransactionalEmailPort,
} from "./email/transactional-email.js";
import { SIGN_IN_PATH, resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

/**
 * PRD-006a D4 and D5. The email and password exchange that replaces PRD-005b D4's persona
 * selector.
 *
 * The refusal order is the security contract and is deliberate:
 *
 * 1. A deployment that is not serving the signed-in product answers 404, so the routes do not
 *    advertise themselves. That is synthetic mode, and it is also staging or production without
 *    the review flag, where `authenticatedWorkspaceMode` throws. Neither branch reads a
 *    connection string or takes a connection.
 * 2. Origin and host are checked next. A pre-session request carries no session-bound token to
 *    check, so exact origin, exact host, and their agreement with each other are the whole
 *    cross-site defence, together with `SameSite=Lax` and the rate limits below.
 * 3. The rate limits run before any credential work, so a caller cannot make the deployment
 *    derive thousands of Argon2id hashes.
 * 4. A malformed body is a 400: an unexpected key is a mistake, not a credential guess.
 * 5. From the credential lookup onwards every refusal, including the database's own 42501, is one
 *    401 with one byte-identical body. Sign-up's duplicate-address answer is the single
 *    deliberate exception, for the reason D5 gives.
 *
 * Nothing in this module logs, echoes, or stores a password, a password hash, a URL token, a
 * token hash, or a session secret.
 */

export const SIGN_IN_CHOICE_PATH = "/sign-in/choose";
export const OVERVIEW_PATH = "/overview";
export const RESET_PASSWORD_PATH = "/reset-password";
export const VERIFY_EMAIL_PATH = "/verify-email";

/** PRD-005b's default, carried forward unchanged, and D5's opt-in extension. */
export const DEFAULT_SESSION_LIFETIME_SECONDS = 43_200;
export const EXTENDED_SESSION_LIFETIME_SECONDS = 2_592_000;

export const PASSWORD_RESET_TOKEN_LIFETIME_SECONDS = 1_800;
export const EMAIL_VERIFICATION_TOKEN_LIFETIME_SECONDS = 86_400;
export const SIGN_IN_CHOICE_TOKEN_LIFETIME_SECONDS = 300;

/** PRD-006a D4, with the window each limit is counted in. */
export const AUTH_RATE_LIMITS: Readonly<
  Record<AuthRateLimitScope, Readonly<{ attemptLimit: number; windowSeconds: number }>>
> = Object.freeze({
  sign_in_ip: Object.freeze({ attemptLimit: 20, windowSeconds: 900 }),
  sign_up_ip: Object.freeze({ attemptLimit: 10, windowSeconds: 3_600 }),
  forgot_ip: Object.freeze({ attemptLimit: 20, windowSeconds: 3_600 }),
  forgot_email: Object.freeze({ attemptLimit: 5, windowSeconds: 3_600 }),
  reset_ip: Object.freeze({ attemptLimit: 10, windowSeconds: 3_600 }),
  verify_ip: Object.freeze({ attemptLimit: 20, windowSeconds: 3_600 }),
});

const AuthSurfaceEnvironmentSchema = z
  .object({
    OALO_ENVIRONMENT: z.enum(["local", "preview", "staging", "production"]).default("local"),
    OALO_REVIEW_SURFACE: z.string().optional(),
    OALO_APP_URL: z.string().optional(),
    OALO_SELF_SERVE_SIGNUP: z.string().optional(),
  })
  .passthrough();

type AuthSurfaceEnvironment = z.infer<typeof AuthSurfaceEnvironmentSchema>;

export class AuthSurfaceUnavailableError extends Error {
  public constructor() {
    super("The sign-in path is not available on this deployment.");
    this.name = "AuthSurfaceUnavailableError";
  }
}

class AuthRequestBodyError extends Error {
  public constructor() {
    super("The request body could not be read.");
    this.name = "AuthRequestBodyError";
  }
}

class AuthRateLimitedError extends Error {
  public constructor() {
    super("Too many attempts.");
    this.name = "AuthRateLimitedError";
  }
}

/**
 * D5. Every route reads the workspace mode first. Synthetic mode and a mode function that throws
 * both answer 404, before any connection is taken, and `authenticatedWorkspaceMode` itself is
 * unchanged by this sub-PRD.
 */
export function assertAuthSurface(input: unknown): AuthSurfaceEnvironment {
  const parsed = AuthSurfaceEnvironmentSchema.safeParse(input);
  if (!parsed.success) throw new AuthSurfaceUnavailableError();
  let mode: string;
  try {
    mode = authenticatedWorkspaceMode(parsed.data);
  } catch {
    throw new AuthSurfaceUnavailableError();
  }
  if (mode !== "review") throw new AuthSurfaceUnavailableError();
  return parsed.data;
}

/** D5. Sign-up is off unless the operator turns it on, by name, on the deployment. */
export function selfServeSignUpEnabled(environment: AuthSurfaceEnvironment): boolean {
  return environment.OALO_SELF_SERVE_SIGNUP?.trim() === "enabled";
}

export function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

const EmailSchema = z.string().min(6).max(254);
const PasswordSchema = z.string().min(1).max(512);
const TokenSchema = z.string().min(1).max(512);

/**
 * 005B-AC-014, carried forward by 006A-AC-016 and 006A-AC-020. Every schema is `.strict()`, so a
 * `locationId`, `userId`, `role`, `bindingId`, or `installationId` in a body is a 400 rather than
 * a silently ignored extra. The browser never names identity on any of these routes.
 */
export const SignInRequestSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    keepSignedIn: z.boolean().optional(),
  })
  .strict();

export const ChooseWorkspaceRequestSchema = z
  .object({ choiceToken: TokenSchema, workspaceIndex: z.number().int().min(0).max(99) })
  .strict();

export const SignUpRequestSchema = z
  .object({
    name: z.string().min(1).max(200),
    email: EmailSchema,
    password: PasswordSchema,
    companyName: z.string().max(200).optional(),
  })
  .strict();

export const ForgotPasswordRequestSchema = z.object({ email: EmailSchema }).strict();

export const ResetPasswordRequestSchema = z
  .object({
    token: TokenSchema,
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
  })
  .strict();

export const VerifyEmailRequestSchema = z.object({ token: TokenSchema }).strict();

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: PasswordSchema,
    newPassword: PasswordSchema,
    confirmPassword: PasswordSchema,
  })
  .strict();

/** The sign-out control is a form, so its token travels in the body. */
export const SignOutRequestSchema = z
  .object({ csrfToken: z.string().min(1).max(512).optional() })
  .strict();

export interface AuthHandlerDependencies {
  readonly nowEpochSeconds?: () => number;
  /** The cookie secret. 32 random bytes, base64url, exactly what PRD-005b minted. */
  readonly randomSessionSecret?: () => string;
  /** The URL token. 32 random bytes, base64url, 43 characters. */
  readonly randomUrlToken?: () => string;
  /**
   * D5. The email send runs after the response is committed, so the response time of
   * forgot-password does not depend on whether an account exists. Next 16.3.3 exports `after`
   * from `next/server`, confirmed on the pinned version; the route files pass it in, and the
   * default here detaches the work so a test can drive the handler without a Next request
   * context.
   */
  readonly afterResponse?: (task: () => Promise<void>) => void;
}

const pendingBackgroundWork = new Set<Promise<void>>();

function detachBackgroundWork(task: () => Promise<void>): void {
  const promise = task().catch(() => undefined);
  pendingBackgroundWork.add(promise);
  void promise.finally(() => {
    pendingBackgroundWork.delete(promise);
  });
}

/**
 * D5. The scheduler the `/api/auth/*` routes install. Next's `after` needs a request context, and
 * a route-level proof drives the exported route outside one, so a missing context falls back to
 * detaching the work instead of turning a background send into a request-path failure. Production
 * always has the context and always takes the first branch.
 */
export function scheduleThroughNextAfter(
  after: (task: () => Promise<void>) => void,
): (task: () => Promise<void>) => void {
  return (task) => {
    try {
      after(task);
    } catch {
      detachBackgroundWork(task);
    }
  };
}

/** Lets a test wait for a detached send without the handler awaiting it on the request path. */
export async function flushAuthBackgroundWork(): Promise<void> {
  while (pendingBackgroundWork.size > 0) {
    await Promise.all(pendingBackgroundWork);
  }
}

function nowSeconds(dependencies: AuthHandlerDependencies): number {
  return dependencies.nowEpochSeconds?.() ?? Math.floor(Date.now() / 1000);
}

function defaultRandomSecret(): string {
  return randomBytes(32).toString("base64url");
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * D4. The counter table never holds a client address or an email address, only a keyed hash of
 * one. Rotating `OALO_CSRF_SERVER_SECRET` therefore discards every window and nothing else.
 */
export function rateLimitKeyHash(
  serverSecret: Uint8Array,
  scope: AuthRateLimitScope,
  value: string,
): string {
  return createHmac("sha256", serverSecret).update(`rate-limit\0${scope}\0${value}`).digest("hex");
}

let loggedMissingClientAddressHeader = false;

/**
 * D4, open question. The platform presents the client address in a forwarded header, and the
 * exact header on Vercel is the one thing about this rate limiter the author could not verify
 * against Vercel's own documentation: the agent that wrote it had no network access. Both
 * conventional spellings are read, most-specific first.
 *
 * When neither is present the address is unknown, and the honest answer is to skip the
 * per-address limits rather than collapse every caller into one bucket, which on a twenty-attempt
 * sign-in limit would be a deployment-wide outage after twenty sign-ins. The per-account lockout
 * (ten failures, fifteen minutes) and the per-email forgot-password limit both still apply, and
 * the absence is logged once per process, by header name and never by value, so it is visible
 * rather than silent.
 */
export function clientAddressFor(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first !== undefined && first.length > 0 && first.length <= 100) return first;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp !== undefined && realIp.length > 0 && realIp.length <= 100) return realIp;
  if (!loggedMissingClientAddressHeader) {
    loggedMissingClientAddressHeader = true;
    console.warn(
      "password-authentication: neither x-forwarded-for nor x-real-ip is present; per-address rate limits are not applied on this deployment.",
    );
  }
  return undefined;
}

export function resetAuthHandlerProcessStateForTests(): void {
  loggedMissingClientAddressHeader = false;
}

interface AuthContext {
  readonly environment: AuthSurfaceEnvironment;
  readonly ports: CampaignCommandPorts;
  readonly credentials: CredentialPort;
  readonly correlation: RequestCorrelation;
  readonly dependencies: AuthHandlerDependencies;
}

function requiredCredentialPort(ports: CampaignCommandPorts): CredentialPort {
  const credentials = ports.credentials;
  if (credentials === undefined) throw new UnauthenticatedPrincipalError();
  return credentials;
}

/**
 * The origin and host half of the 005a mutation gate, applied to a request that carries no
 * session yet. A mismatched origin or host is refused with the same body a wrong password earns,
 * and without touching the database.
 */
function assertPreSessionOrigin(request: Request, ports: CampaignCommandPorts): void {
  const gate = ports.mutation;
  if (gate === undefined) throw new UnauthenticatedPrincipalError();
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? "";
  if (origin === null || host.length === 0 || host !== gate.expectedHost) {
    throw new UnauthenticatedPrincipalError();
  }
  if (!gate.allowedBrowserOrigins.includes(origin)) throw new UnauthenticatedPrincipalError();
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new UnauthenticatedPrincipalError();
  }
  if (originHost !== host) throw new UnauthenticatedPrincipalError();
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AuthRequestBodyError();
  }
}

async function consumeAddressLimit(
  request: Request,
  context: AuthContext,
  scope: AuthRateLimitScope,
): Promise<void> {
  const gate = context.ports.mutation;
  if (gate === undefined) throw new UnauthenticatedPrincipalError();
  const address = clientAddressFor(request);
  if (address === undefined) return;
  const limit = AUTH_RATE_LIMITS[scope];
  const allowed = await context.credentials.consumeRateLimit({
    scope,
    keyHash: rateLimitKeyHash(gate.csrfServerSecret, scope, address),
    attemptLimit: limit.attemptLimit,
    windowSeconds: limit.windowSeconds,
  });
  if (!allowed) throw new AuthRateLimitedError();
}

function jsonResponse(
  status: number,
  body: Readonly<Record<string, unknown>>,
  cookie?: string,
): Response {
  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (cookie !== undefined) headers.set("set-cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

/** One body for every credential refusal, so no refusal is distinguishable from another. */
function genericRefusal(): Response {
  return jsonResponse(401, { error: "AUTH_CREDENTIALS_REJECTED" });
}

function rateLimitedResponse(): Response {
  return jsonResponse(429, { error: "AUTH_RATE_LIMITED" });
}

function clearedSessionCookie(): string {
  return `${FIRST_PARTY_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

interface IssuedSession {
  readonly cookie: string;
}

/**
 * D5. Issuance is the definer function's decision. The cookie secret is generated here, hashed
 * here, and the hash is the only thing that becomes a statement parameter; the secret itself
 * leaves this process exactly once, in the `Set-Cookie` header.
 */
async function issueSessionFor(
  context: AuthContext,
  input: Readonly<{
    userId: string;
    binding: Readonly<SignInBinding>;
    lifetimeSeconds: number;
    issuedBy: "password_sign_in" | "password_reset";
  }>,
): Promise<IssuedSession> {
  const issuance = context.ports.sessionIssuance;
  if (issuance === undefined) throw new UnauthenticatedPrincipalError();
  const sessionRole = applicationRoleForDatabaseRole(input.binding.bindingRole);
  if (sessionRole === undefined) throw new UnauthenticatedPrincipalError();
  const sessionSecret = (context.dependencies.randomSessionSecret ?? defaultRandomSecret)();
  try {
    await issuance.issue({
      locationId: input.binding.locationId,
      userId: input.userId,
      bindingRole: input.binding.bindingRole,
      sessionRole,
      sessionSecretHash: sha256Hex(sessionSecret),
      lifetimeSeconds: input.lifetimeSeconds,
      issuedBy: input.issuedBy,
      correlationRef: context.correlation.correlationRef,
    });
  } catch (error) {
    // 005B-AC-016, carried forward. The refusal took its own audit row down with it, so the
    // attempt is recorded here instead, in a transaction of its own. A failure to record must not
    // turn the refusal into a different answer.
    try {
      await issuance.recordDeniedAttempt({
        locationId: input.binding.locationId,
        userId: input.userId,
        correlationRef: context.correlation.correlationRef,
      });
    } catch (auditFailure) {
      void auditFailure;
    }
    throw error;
  }
  return Object.freeze({
    cookie: serializeFirstPartySessionCookie({
      sessionSecret,
      maxAgeSeconds: input.lifetimeSeconds,
    }),
  });
}

interface WorkspaceChoice {
  readonly index: number;
  readonly workspaceName: string;
  readonly bindingRole: string;
}

function workspaceChoices(
  bindings: readonly Readonly<SignInBinding>[],
): readonly WorkspaceChoice[] {
  return Object.freeze(
    bindings.map((binding, index) =>
      Object.freeze({
        index,
        workspaceName: binding.locationDisplayName,
        bindingRole: binding.bindingRole,
      }),
    ),
  );
}

/**
 * D5. Several workspaces means the person picks one. The list is the closed set the database
 * returned, the token that carries the choice is single-use and lives five minutes, and the
 * choose request names an index into that list rather than a location, so there is nothing in it
 * to forge.
 */
async function offerWorkspaceChoice(
  context: AuthContext,
  userId: string,
  bindings: readonly Readonly<SignInBinding>[],
): Promise<Response> {
  const token = (context.dependencies.randomUrlToken ?? defaultRandomSecret)();
  await context.credentials.issueToken({
    userId,
    purpose: "sign_in_choice",
    tokenHash: sha256Hex(token),
    lifetimeSeconds: SIGN_IN_CHOICE_TOKEN_LIFETIME_SECONDS,
    correlationRef: context.correlation.correlationRef,
  });
  return jsonResponse(200, {
    next: SIGN_IN_CHOICE_PATH,
    choiceToken: token,
    workspaces: workspaceChoices(bindings),
  });
}

async function openAuthContext(
  request: Request,
  routeName: CorrelationRouteName,
  environment: unknown,
  ports: CampaignCommandPorts,
  dependencies: AuthHandlerDependencies,
): Promise<AuthContext> {
  const parsedEnvironment = assertAuthSurface(environment);
  assertPreSessionOrigin(request, ports);
  return Object.freeze({
    environment: parsedEnvironment,
    ports,
    credentials: requiredCredentialPort(ports),
    correlation: correlationReferenceForRequest(request, routeName),
    dependencies,
  });
}

function refusalResponse(error: unknown, correlation?: RequestCorrelation): Response {
  const response =
    error instanceof AuthSurfaceUnavailableError
      ? jsonCommandError(404, "NOT_FOUND")
      : error instanceof AuthRateLimitedError
        ? rateLimitedResponse()
        : error instanceof AuthRequestBodyError
          ? jsonResponse(400, { error: "INVALID_AUTH_REQUEST" })
          : genericRefusal();
  return correlation === undefined ? response : withCorrelationHeaders(response, correlation);
}

function schemaRefusal(issues: unknown): Response {
  return jsonResponse(400, { error: "INVALID_AUTH_REQUEST", issues });
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

/**
 * 006A-AC-012 through 016. `POST /api/auth/sign-in`.
 *
 * Exactly one Argon2id derivation runs on every credential path, including the unknown-address
 * one, which derives against the fixed dummy hash. That is what makes "no account" and "wrong
 * password" indistinguishable in time as well as in the response body.
 */
export async function handlePasswordSignIn(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  dependencies: AuthHandlerDependencies = {},
): Promise<Response> {
  let context: AuthContext;
  try {
    context = await openAuthContext(request, "signIn", environment, ports, dependencies);
  } catch (error) {
    return refusalResponse(error);
  }
  try {
    await consumeAddressLimit(request, context, "sign_in_ip");
    const parsed = SignInRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return withCorrelationHeaders(schemaRefusal(parsed.error.issues), context.correlation);
    }

    const credential = await context.credentials.lookupCredential(
      normalizeEmailAddress(parsed.data.email),
    );
    if (credential === undefined) {
      // One derivation against a hash no password matches, so this path costs what the
      // wrong-password path costs.
      verifyPassword(DUMMY_PASSWORD_HASH, parsed.data.password);
      throw new UnauthenticatedPrincipalError();
    }

    const matched = verifyPassword(credential.passwordHash, parsed.data.password);
    const locked =
      credential.lockedUntilEpochSeconds !== undefined &&
      credential.lockedUntilEpochSeconds > nowSeconds(dependencies);
    if (!matched || locked) {
      await context.credentials.recordSignInFailure({
        userId: credential.userId,
        correlationRef: context.correlation.correlationRef,
      });
      throw new UnauthenticatedPrincipalError();
    }

    await context.credentials.recordSignInSuccess({
      userId: credential.userId,
      correlationRef: context.correlation.correlationRef,
    });
    const bindings = await context.credentials.listSignInBindings(credential.userId);
    if (bindings.length === 0) throw new UnauthenticatedPrincipalError();
    if (bindings.length > 1) {
      return withCorrelationHeaders(
        await offerWorkspaceChoice(context, credential.userId, bindings),
        context.correlation,
      );
    }

    const binding = bindings[0];
    if (binding === undefined) throw new UnauthenticatedPrincipalError();
    const session = await issueSessionFor(context, {
      userId: credential.userId,
      binding,
      lifetimeSeconds:
        parsed.data.keepSignedIn === true
          ? EXTENDED_SESSION_LIFETIME_SECONDS
          : DEFAULT_SESSION_LIFETIME_SECONDS,
      issuedBy: "password_sign_in",
    });
    return withCorrelationHeaders(
      jsonResponse(200, { next: OVERVIEW_PATH }, session.cookie),
      context.correlation,
    );
  } catch (error) {
    return refusalResponse(error, context.correlation);
  }
}

/**
 * 006A-AC-016. `POST /api/auth/choose`. The choice token is consumed here, so a replayed choice
 * is refused, and the workspace is picked by index from the list the database returns for the
 * person the token names. Nothing in the request can name a location, a role, or a binding.
 */
export async function handleChooseWorkspace(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  dependencies: AuthHandlerDependencies = {},
): Promise<Response> {
  let context: AuthContext;
  try {
    context = await openAuthContext(request, "chooseWorkspace", environment, ports, dependencies);
  } catch (error) {
    return refusalResponse(error);
  }
  try {
    await consumeAddressLimit(request, context, "sign_in_ip");
    const parsed = ChooseWorkspaceRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return withCorrelationHeaders(schemaRefusal(parsed.error.issues), context.correlation);
    }
    const consumed = await context.credentials.consumeToken({
      tokenHash: sha256Hex(parsed.data.choiceToken),
      purpose: "sign_in_choice",
    });
    if (consumed === undefined) throw new UnauthenticatedPrincipalError();

    const bindings = await context.credentials.listSignInBindings(consumed.userId);
    const binding = bindings[parsed.data.workspaceIndex];
    if (binding === undefined) throw new UnauthenticatedPrincipalError();

    const session = await issueSessionFor(context, {
      userId: consumed.userId,
      binding,
      lifetimeSeconds: DEFAULT_SESSION_LIFETIME_SECONDS,
      issuedBy: "password_sign_in",
    });
    return withCorrelationHeaders(
      jsonResponse(200, { next: OVERVIEW_PATH }, session.cookie),
      context.correlation,
    );
  } catch (error) {
    return refusalResponse(error, context.correlation);
  }
}

// ---------------------------------------------------------------------------
// Sign-up
// ---------------------------------------------------------------------------

/**
 * D5. The workspace a new account lands in. The person can name it; when they do not, it is named
 * after them, because "Dana's workspace" is a thing a loan officer recognises and an opaque
 * default is not.
 */
export function defaultWorkspaceName(personName: string): string {
  const firstName = personName.trim().split(/\s+/u)[0] ?? personName.trim();
  return `${firstName}'s workspace`;
}

/**
 * 006A-AC-020 and 021. `POST /api/auth/sign-up`.
 *
 * The duplicate-address answer is the one place in this sub-PRD where a caller learns whether an
 * account exists. D5 makes that trade deliberately: a sign-up page that pretends to succeed for
 * an existing address leaves a real person with no account and no explanation, which defeats the
 * owner's five-minute journey. The exposure is bounded by the sign-up rate limit, and sign-in and
 * forgot-password stay fully generic. `security-guardian` ratifies or overturns it at close-out.
 */
export async function handlePasswordSignUp(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  dependencies: AuthHandlerDependencies = {},
): Promise<Response> {
  let context: AuthContext;
  try {
    context = await openAuthContext(request, "signUp", environment, ports, dependencies);
    if (!selfServeSignUpEnabled(context.environment)) throw new AuthSurfaceUnavailableError();
  } catch (error) {
    return refusalResponse(error);
  }
  try {
    await consumeAddressLimit(request, context, "sign_up_ip");
    const parsed = SignUpRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return withCorrelationHeaders(schemaRefusal(parsed.error.issues), context.correlation);
    }

    const emailNormalized = normalizeEmailAddress(parsed.data.email);
    const policy = evaluatePassword(parsed.data.password, {
      email: emailNormalized,
      displayName: parsed.data.name,
    });
    if (!policy.acceptable) {
      return withCorrelationHeaders(
        jsonResponse(400, { error: policy.reason }),
        context.correlation,
      );
    }

    const companyName = parsed.data.companyName?.trim() ?? "";
    const outcome = await context.credentials.registerAccount({
      emailNormalized,
      emailDisplay: parsed.data.email.trim(),
      passwordHash: hashPassword(parsed.data.password),
      displayName: parsed.data.name.trim(),
      locationDisplayName:
        companyName.length > 0 ? companyName : defaultWorkspaceName(parsed.data.name),
      correlationRef: context.correlation.correlationRef,
    });
    if (!outcome.registered) {
      return withCorrelationHeaders(jsonResponse(200, { state: "existing" }), context.correlation);
    }

    const session = await issueSessionFor(context, {
      userId: outcome.account.userId,
      binding: Object.freeze({
        locationId: outcome.account.locationId,
        locationDisplayName:
          companyName.length > 0 ? companyName : defaultWorkspaceName(parsed.data.name),
        bindingRole: "location_admin" as const,
      }),
      lifetimeSeconds: DEFAULT_SESSION_LIFETIME_SECONDS,
      issuedBy: "password_sign_in",
    });

    scheduleVerificationEmail(context, {
      userId: outcome.account.userId,
      to: parsed.data.email.trim(),
      name: parsed.data.name.trim(),
    });

    return withCorrelationHeaders(
      jsonResponse(200, { next: OVERVIEW_PATH }, session.cookie),
      context.correlation,
    );
  } catch (error) {
    return refusalResponse(error, context.correlation);
  }
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

function applicationOrigin(environment: AuthSurfaceEnvironment): string | undefined {
  const raw = environment.OALO_APP_URL?.trim();
  if (raw === undefined || raw.length === 0) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

/**
 * D6. Sending is one fact with three outcomes, and each one is audited. A failure to send is
 * never an exception on the request path: it must not turn forgot-password into a response a
 * caller can tell apart from the one an unknown address gets.
 *
 * The URL token appears in the message and nowhere else: not in the audit row, not in a log line,
 * not in the response.
 */
async function sendAndAudit(
  context: AuthContext,
  input: Readonly<{
    port: TransactionalEmailPort;
    message: TransactionalEmailMessage;
    userId: string;
    action: EmailDeliveryAction;
  }>,
): Promise<void> {
  const result = await input.port.send(input.message);
  await context.credentials.recordEmailDelivery({
    userId: input.userId,
    action: input.action,
    result: emailDeliveryResult(result),
    subjectId: emailDeliverySubject(result),
    correlationRef: context.correlation.correlationRef,
  });
}

function scheduleVerificationEmail(
  context: AuthContext,
  input: Readonly<{ userId: string; to: string; name: string }>,
): void {
  const port = context.ports.transactionalEmail;
  const origin = applicationOrigin(context.environment);
  // 006A-AC-021. No sending domain means no verification token, no attempted send, and no notice
  // in the shell, so the product never asks a person to check an inbox nothing was sent to.
  if (port === undefined || !port.configured || origin === undefined) return;
  const schedule = context.dependencies.afterResponse ?? detachBackgroundWork;
  schedule(async () => {
    const token = (context.dependencies.randomUrlToken ?? defaultRandomSecret)();
    const tokenId = await context.credentials.issueToken({
      userId: input.userId,
      purpose: "email_verification",
      tokenHash: sha256Hex(token),
      lifetimeSeconds: EMAIL_VERIFICATION_TOKEN_LIFETIME_SECONDS,
      correlationRef: context.correlation.correlationRef,
    });
    await sendAndAudit(context, {
      port,
      message: buildEmailVerificationEmail({
        to: input.to,
        name: input.name,
        link: `${origin}${VERIFY_EMAIL_PATH}?token=${encodeURIComponent(token)}`,
        idempotencyKey: tokenId,
      }),
      userId: input.userId,
      action: "auth.verification-email",
    });
  });
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

/**
 * 006A-AC-017. `POST /api/auth/forgot-password`.
 *
 * One body, always, whatever happened: a known address, an unknown address, a deployment with no
 * sending domain, and a provider that refused the message all produce byte-identical 200s. The
 * unknown-address path still generates and hashes a token so the work is the same; it just never
 * persists one.
 */
export async function handleForgotPassword(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  dependencies: AuthHandlerDependencies = {},
): Promise<Response> {
  let context: AuthContext;
  try {
    context = await openAuthContext(request, "forgotPassword", environment, ports, dependencies);
  } catch (error) {
    return refusalResponse(error);
  }
  const confirmation = () => jsonResponse(200, { state: "sent" });
  try {
    await consumeAddressLimit(request, context, "forgot_ip");
    const parsed = ForgotPasswordRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return withCorrelationHeaders(schemaRefusal(parsed.error.issues), context.correlation);
    }
    const emailNormalized = normalizeEmailAddress(parsed.data.email);

    const gate = context.ports.mutation;
    if (gate === undefined) throw new UnauthenticatedPrincipalError();
    const withinEmailLimit = await context.credentials.consumeRateLimit({
      scope: "forgot_email",
      keyHash: rateLimitKeyHash(gate.csrfServerSecret, "forgot_email", emailNormalized),
      attemptLimit: AUTH_RATE_LIMITS.forgot_email.attemptLimit,
      windowSeconds: AUTH_RATE_LIMITS.forgot_email.windowSeconds,
    });

    const credential = await context.credentials.lookupCredential(emailNormalized);
    // The token is generated and hashed on both paths, so an unknown address costs the same
    // work. Only the persistence and the send are conditional.
    const token = (context.dependencies.randomUrlToken ?? defaultRandomSecret)();
    const tokenHash = sha256Hex(token);
    if (credential === undefined || !withinEmailLimit) {
      return withCorrelationHeaders(confirmation(), context.correlation);
    }

    const userId = credential.userId;
    const port = context.ports.transactionalEmail;
    const origin = applicationOrigin(context.environment);
    const schedule = context.dependencies.afterResponse ?? detachBackgroundWork;
    const tokenId = await context.credentials.issueToken({
      userId,
      purpose: "password_reset",
      tokenHash,
      lifetimeSeconds: PASSWORD_RESET_TOKEN_LIFETIME_SECONDS,
      correlationRef: context.correlation.correlationRef,
    });

    // 006A-AC-017. All three outcomes are audited, including the one where no sending domain is
    // configured. The token is still issued in that case, so an operator can hand the person a
    // reset link out of band, and the row says `not_configured` rather than nothing at all.
    schedule(async () => {
      if (port === undefined || !port.configured || origin === undefined) {
        await context.credentials.recordEmailDelivery({
          userId,
          action: "auth.reset-email",
          result: "failed",
          subjectId: "not_configured",
          correlationRef: context.correlation.correlationRef,
        });
        return;
      }
      await sendAndAudit(context, {
        port,
        message: buildPasswordResetEmail({
          to: parsed.data.email.trim(),
          name: parsed.data.email.trim().split("@")[0] ?? "there",
          link: `${origin}${RESET_PASSWORD_PATH}?token=${encodeURIComponent(token)}`,
          idempotencyKey: tokenId,
        }),
        userId,
        action: "auth.reset-email",
      });
    });
    return withCorrelationHeaders(confirmation(), context.correlation);
  } catch (error) {
    if (error instanceof AuthRateLimitedError || error instanceof AuthRequestBodyError) {
      return refusalResponse(error, context.correlation);
    }
    // Everything else, including a database refusal, still answers the one confirmation: a caller
    // must not learn from a forgot-password response that something went wrong for this address
    // and not for another.
    return withCorrelationHeaders(confirmation(), context.correlation);
  }
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * 006A-AC-018. `POST /api/auth/reset-password`.
 *
 * The order matters: the passwords are compared and the policy is applied before the token is
 * consumed, so a mistyped confirmation leaves the link usable rather than burning it and costing
 * the person another email.
 *
 * On success the person is signed in directly rather than sent back to the sign-in page. They
 * have just proved control of the inbox and chosen the password; a second sign-in adds friction
 * and a second chance to mistype for no security gain, because a compromised inbox already
 * yields the password.
 */
export async function handleResetPassword(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  dependencies: AuthHandlerDependencies = {},
): Promise<Response> {
  let context: AuthContext;
  try {
    context = await openAuthContext(request, "resetPassword", environment, ports, dependencies);
  } catch (error) {
    return refusalResponse(error);
  }
  try {
    await consumeAddressLimit(request, context, "reset_ip");
    const parsed = ResetPasswordRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return withCorrelationHeaders(schemaRefusal(parsed.error.issues), context.correlation);
    }
    if (parsed.data.password !== parsed.data.confirmPassword) {
      return withCorrelationHeaders(
        jsonResponse(400, { error: "AUTH_PASSWORDS_DO_NOT_MATCH" }),
        context.correlation,
      );
    }
    const policy = evaluatePassword(parsed.data.password);
    if (!policy.acceptable) {
      return withCorrelationHeaders(
        jsonResponse(400, { error: policy.reason }),
        context.correlation,
      );
    }

    const consumed = await context.credentials.consumeToken({
      tokenHash: sha256Hex(parsed.data.token),
      purpose: "password_reset",
    });
    if (consumed === undefined) {
      return withCorrelationHeaders(
        jsonResponse(400, { error: "AUTH_RESET_LINK_EXPIRED" }),
        context.correlation,
      );
    }

    await context.credentials.setPassword({
      userId: consumed.userId,
      passwordHash: hashPassword(parsed.data.password),
      reason: "reset",
      correlationRef: context.correlation.correlationRef,
    });

    const bindings = await context.credentials.listSignInBindings(consumed.userId);
    if (bindings.length === 0) {
      return withCorrelationHeaders(jsonResponse(200, { next: SIGN_IN_PATH }), context.correlation);
    }
    if (bindings.length > 1) {
      return withCorrelationHeaders(
        await offerWorkspaceChoice(context, consumed.userId, bindings),
        context.correlation,
      );
    }
    const binding = bindings[0];
    if (binding === undefined) throw new UnauthenticatedPrincipalError();
    const session = await issueSessionFor(context, {
      userId: consumed.userId,
      binding,
      lifetimeSeconds: DEFAULT_SESSION_LIFETIME_SECONDS,
      issuedBy: "password_reset",
    });
    return withCorrelationHeaders(
      jsonResponse(200, { next: OVERVIEW_PATH }, session.cookie),
      context.correlation,
    );
  } catch (error) {
    return refusalResponse(error, context.correlation);
  }
}

// ---------------------------------------------------------------------------
// Verify email
// ---------------------------------------------------------------------------

/** 006A-AC-021. `POST /api/auth/verify-email`. */
export async function handleVerifyEmail(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  dependencies: AuthHandlerDependencies = {},
): Promise<Response> {
  let context: AuthContext;
  try {
    context = await openAuthContext(request, "verifyEmail", environment, ports, dependencies);
  } catch (error) {
    return refusalResponse(error);
  }
  try {
    await consumeAddressLimit(request, context, "verify_ip");
    const parsed = VerifyEmailRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return withCorrelationHeaders(schemaRefusal(parsed.error.issues), context.correlation);
    }
    const consumed = await context.credentials.consumeToken({
      tokenHash: sha256Hex(parsed.data.token),
      purpose: "email_verification",
    });
    if (consumed === undefined) {
      return withCorrelationHeaders(
        jsonResponse(400, { error: "AUTH_VERIFICATION_LINK_EXPIRED" }),
        context.correlation,
      );
    }
    await context.credentials.markEmailVerified({
      userId: consumed.userId,
      correlationRef: context.correlation.correlationRef,
    });
    return withCorrelationHeaders(jsonResponse(200, { state: "confirmed" }), context.correlation);
  } catch (error) {
    return refusalResponse(error, context.correlation);
  }
}

// ---------------------------------------------------------------------------
// Sign-out and change password
// ---------------------------------------------------------------------------

function isFormSubmission(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return (
    contentType.startsWith("application/x-www-form-urlencoded") ||
    contentType.startsWith("multipart/form-data")
  );
}

/**
 * The sign-out control is a form, and a form post cannot set `x-csrf-token`. The token travels in
 * the body instead and is promoted to the header here, before the request reaches the 005a gate,
 * so sign-out is checked by exactly the same code as every other authenticated mutation rather
 * than by a weaker copy of it.
 */
async function withPromotedCsrfHeader(request: Request): Promise<Request> {
  if (request.headers.get(CSRF_REQUEST_HEADER) !== null || !isFormSubmission(request)) {
    return request;
  }
  let fields: Record<string, string> = {};
  try {
    const form = await request.formData();
    for (const [key, value] of form.entries()) {
      fields[key] = typeof value === "string" ? value : "";
    }
  } catch {
    fields = {};
  }
  const parsed = SignOutRequestSchema.safeParse(fields);
  const csrfToken = parsed.success ? parsed.data.csrfToken : undefined;
  const headers = new Headers(request.headers);
  if (csrfToken !== undefined) headers.set(CSRF_REQUEST_HEADER, csrfToken);
  return new Request(request.url, { method: request.method, headers });
}

/**
 * 006A-AC-022, carried forward from 005B-AC-015. `POST /api/auth/sign-out`.
 *
 * The session is resolved through `resolveAuthenticatedPrincipal` with mutations required, so the
 * cookie, the origin, the host, the CSRF token, and the role version are all checked before a row
 * moves. A request that fails any of them returns 401 and revokes nothing.
 */
export async function handleSignOut(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  try {
    assertAuthSurface(environment);
  } catch (error) {
    return refusalResponse(error);
  }
  const correlation = correlationReferenceForRequest(request, "signOut");
  try {
    const gated = await withPromotedCsrfHeader(request);
    const principal = await resolveAuthenticatedPrincipal(gated, environment, ports);
    const issuance = ports.sessionIssuance;
    if (issuance === undefined) throw new UnauthenticatedPrincipalError();
    await issuance.revoke({
      sessionRef: principal.sessionId,
      reason: "sign_out",
      correlationRef: correlation.correlationRef,
    });
    const headers = new Headers({
      "set-cookie": clearedSessionCookie(),
      "cache-control": "no-store",
      location: SIGN_IN_PATH,
    });
    return withCorrelationHeaders(new Response(null, { status: 303, headers }), correlation);
  } catch {
    return withCorrelationHeaders(genericRefusal(), correlation);
  }
}

/**
 * 006A-AC-023. `POST /api/auth/change-password`.
 *
 * The current password is verified against the credential the session names, read by person
 * rather than by address, so nothing in the request can point the verification at somebody else's
 * account. The session doing the change survives it; every other session the person holds is
 * revoked.
 */
export async function handleChangePassword(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  dependencies: AuthHandlerDependencies = {},
): Promise<Response> {
  try {
    assertAuthSurface(environment);
  } catch (error) {
    return refusalResponse(error);
  }
  const correlation = correlationReferenceForRequest(request, "changePassword");
  try {
    const credentials = requiredCredentialPort(ports);
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    const parsed = ChangePasswordRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return withCorrelationHeaders(schemaRefusal(parsed.error.issues), correlation);
    }
    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
      return withCorrelationHeaders(
        jsonResponse(400, { error: "AUTH_PASSWORDS_DO_NOT_MATCH" }),
        correlation,
      );
    }

    const credential = await credentials.lookupCredentialForUser(principal.actorId);
    if (credential === undefined) throw new UnauthenticatedPrincipalError();
    if (!verifyPassword(credential.passwordHash, parsed.data.currentPassword)) {
      return withCorrelationHeaders(
        jsonResponse(401, { error: "AUTH_CURRENT_PASSWORD_REJECTED" }),
        correlation,
      );
    }

    const policy = evaluatePassword(parsed.data.newPassword);
    if (!policy.acceptable) {
      return withCorrelationHeaders(jsonResponse(400, { error: policy.reason }), correlation);
    }

    await credentials.setPassword({
      userId: principal.actorId,
      passwordHash: hashPassword(parsed.data.newPassword),
      reason: "change",
      correlationRef: correlation.correlationRef,
      keepSessionId: parseSessionRef(principal.sessionId),
    });
    void dependencies;
    return withCorrelationHeaders(jsonResponse(200, { state: "changed" }), correlation);
  } catch (error) {
    if (error instanceof AuthRequestBodyError) {
      return withCorrelationHeaders(
        jsonResponse(400, { error: "INVALID_AUTH_REQUEST" }),
        correlation,
      );
    }
    return withCorrelationHeaders(genericRefusal(), correlation);
  }
}
