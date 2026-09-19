import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import {
  CSRF_REQUEST_HEADER,
  FIRST_PARTY_SESSION_COOKIE,
  applicationRoleForDatabaseRole,
  serializeFirstPartySessionCookie,
  type DatabaseBindingRole,
} from "@oalo/auth";
import type { ApplicationRole } from "@oalo/contracts";
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
  type RequestCorrelation,
} from "./correlation-boundary.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

/**
 * PRD-005b D4. Review session issuance and revocation.
 *
 * This is not HighLevel SSO and it satisfies no `DEFERRED: LIVE HIGHLEVEL AUTH` criterion. It is
 * the operator-authorized way to obtain a real first-party session on the review deployment, so
 * that everything downstream (the mutation gate, the role-version check, the tenant policies, the
 * audit trail) is exercised by a session that is a row rather than a constant. When the HighLevel
 * signed-context exchange lands, it calls the same `platform.issue_first_party_session` with
 * `issued_by = 'embedded_exchange'` and this path does not change.
 *
 * The refusal order is the security contract and is deliberate:
 *
 * 1. Production is refused first, with 403, before the environment is read and before any
 *    connection is taken. `OALO_REVIEW_SURFACE=authorized` in production cannot reach past this.
 * 2. A deployment that is not in review mode answers 404, so the route does not advertise itself.
 * 3. A missing or malformed operator variable answers 503, naming nothing.
 * 4. Everything after that answers one generic 401 with an identical body, so a caller cannot
 *    learn whether the secret, the origin, the persona, or the database refused it.
 */

export const REVIEW_SESSION_VARIABLES = Object.freeze([
  "OALO_REVIEW_SIGNIN_SECRET",
  "OALO_REVIEW_LOCATION_ID",
  "OALO_REVIEW_OUTSIDER_LOCATION_ID",
] as const);

export type ReviewSessionVariable = (typeof REVIEW_SESSION_VARIABLES)[number];

export const REVIEW_PERSONAS = Object.freeze(["creator", "approver", "outsider"] as const);
export type ReviewPersona = (typeof REVIEW_PERSONAS)[number];

export const REVIEW_SESSION_LIFETIME_SECONDS = 43_200;
export const REVIEW_OVERVIEW_PATH = "/overview";
export const REVIEW_SIGN_IN_PATH = "/review/sign-in";

/**
 * 005B-AC-014. The request carries exactly two fields and `.strict()` rejects every other one, so
 * `locationId`, `userId`, `role`, `installationId`, and `roleVersion` are 400s rather than
 * silently ignored extras. `persona` is the only identity-bearing field the browser sends: the
 * location, the user, the binding role, and the session role are all derived server side from it.
 *
 * `persona` is typed as a string here, not as the enum, and the enum is applied separately below.
 * The split is deliberate. An unrecognised key is a malformed request and earns a 400; an
 * unrecognised persona *value* is a guess at the closed vocabulary, is indistinguishable from a
 * guess at the secret, and earns the same generic 401 every other credential failure earns
 * (005B-AC-012).
 */
export const ReviewSignInRequestSchema = z
  .object({ persona: z.string().min(1).max(64), secret: z.string().min(1).max(512) })
  .strict();

export const ReviewPersonaSchema = z.enum(REVIEW_PERSONAS);

/** The sign-out form carries its CSRF token in the body because a form post cannot set a header. */
export const ReviewSignOutRequestSchema = z
  .object({ csrfToken: z.string().min(1).max(512).optional() })
  .strict();

const PERSONA_BINDING_ROLE: Readonly<Record<ReviewPersona, DatabaseBindingRole>> = Object.freeze({
  creator: "creator",
  approver: "approver",
  outsider: "location_admin",
});

const PERSONA_LOCATION_VARIABLE: Readonly<Record<ReviewPersona, ReviewSessionVariable>> =
  Object.freeze({
    creator: "OALO_REVIEW_LOCATION_ID",
    approver: "OALO_REVIEW_LOCATION_ID",
    outsider: "OALO_REVIEW_OUTSIDER_LOCATION_ID",
  });

const ReviewSessionEnvironmentSchema = z
  .object({
    OALO_ENVIRONMENT: z.enum(["local", "preview", "staging", "production"]).default("local"),
    OALO_REVIEW_SIGNIN_SECRET: z.string().optional(),
    OALO_REVIEW_LOCATION_ID: z.string().optional(),
    OALO_REVIEW_OUTSIDER_LOCATION_ID: z.string().optional(),
  })
  .passthrough();

type ReviewSessionEnvironment = z.infer<typeof ReviewSessionEnvironmentSchema>;

/** Lowercase canonical UUID. The seeding script prints exactly this form. */
const REVIEW_LOCATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/**
 * At least 32 printable, non-whitespace characters. The length floor is the entropy floor the
 * sub-PRD sets; refusing whitespace keeps a pasted trailing newline from becoming a silent
 * mismatch that reads as a wrong secret.
 */
const REVIEW_SIGNIN_SECRET_PATTERN = /^[\x21-\x7e]{32,512}$/u;

export interface ReviewSessionConfiguration {
  readonly signInSecret: string;
  readonly locationIdByVariable: Readonly<Record<ReviewSessionVariable, string>>;
}

export class ReviewSurfaceUnavailableError extends Error {
  public constructor() {
    super("The review session path is not available on this deployment.");
    this.name = "ReviewSurfaceUnavailableError";
  }
}

export class ReviewSessionProductionRefusalError extends Error {
  public constructor() {
    super("The review session path is refused in production.");
    this.name = "ReviewSessionProductionRefusalError";
  }
}

export class ReviewSessionConfigurationError extends Error {
  public readonly variable: ReviewSessionVariable;

  public constructor(variable: ReviewSessionVariable) {
    super(`The review session path is not configured: ${variable}`);
    this.name = "ReviewSessionConfigurationError";
    this.variable = variable;
  }
}

/**
 * 005B-AC-011 and 005B-AC-020. Production loses before review mode is even consulted, so no
 * combination of flags can open this path on a production deployment, and neither branch reads a
 * connection string or takes a connection.
 */
export function assertReviewSessionSurface(input: unknown): ReviewSessionEnvironment {
  const parsed = ReviewSessionEnvironmentSchema.safeParse(input);
  if (!parsed.success) throw new ReviewSurfaceUnavailableError();
  if (parsed.data.OALO_ENVIRONMENT === "production") {
    throw new ReviewSessionProductionRefusalError();
  }
  let mode: string;
  try {
    mode = authenticatedWorkspaceMode(parsed.data);
  } catch {
    throw new ReviewSurfaceUnavailableError();
  }
  if (mode !== "review") throw new ReviewSurfaceUnavailableError();
  return parsed.data;
}

/** 005B-AC-011. Every operator variable is present and well formed, or the path is 503. */
export function readReviewSessionConfiguration(
  environment: ReviewSessionEnvironment,
): ReviewSessionConfiguration {
  const signInSecret = environment.OALO_REVIEW_SIGNIN_SECRET?.trim() ?? "";
  if (!REVIEW_SIGNIN_SECRET_PATTERN.test(signInSecret)) {
    throw new ReviewSessionConfigurationError("OALO_REVIEW_SIGNIN_SECRET");
  }
  const locationIdByVariable: Record<string, string> = {};
  for (const variable of ["OALO_REVIEW_LOCATION_ID", "OALO_REVIEW_OUTSIDER_LOCATION_ID"] as const) {
    const value = environment[variable]?.trim() ?? "";
    if (!REVIEW_LOCATION_ID_PATTERN.test(value)) {
      throw new ReviewSessionConfigurationError(variable);
    }
    locationIdByVariable[variable] = value;
  }
  return Object.freeze({
    signInSecret,
    locationIdByVariable: Object.freeze(
      locationIdByVariable as Record<ReviewSessionVariable, string>,
    ),
  });
}

export interface ResolvedReviewPersona {
  readonly locationId: string;
  readonly bindingRole: DatabaseBindingRole;
  readonly sessionRole: ApplicationRole;
}

/**
 * 005B-AC-014. The persona name is the only browser input, and it is mapped here: the location
 * comes from the operator's environment and the session role comes from
 * `packages/auth/src/role-binding-map.ts`, the one mapping in production code (005A-AC-007).
 */
export function resolvePersonaBinding(
  persona: ReviewPersona,
  configuration: ReviewSessionConfiguration,
): ResolvedReviewPersona {
  const bindingRole = PERSONA_BINDING_ROLE[persona];
  const sessionRole = applicationRoleForDatabaseRole(bindingRole);
  if (sessionRole === undefined) {
    throw new UnauthenticatedPrincipalError();
  }
  return Object.freeze({
    locationId: configuration.locationIdByVariable[PERSONA_LOCATION_VARIABLE[persona]],
    bindingRole,
    sessionRole,
  });
}

export type TimingSafeEqual = (a: NodeJS.ArrayBufferView, b: NodeJS.ArrayBufferView) => boolean;

export interface ReviewSessionDependencies {
  readonly timingSafeEqual?: TimingSafeEqual;
  readonly randomSecret?: () => string;
}

/**
 * 005B-AC-013. The explicit length check comes first because `timingSafeEqual` throws on unequal
 * lengths, and the comparison itself is constant time over the bytes. The candidate is never
 * logged, never echoed, and never reaches a database parameter, so the only thing a caller learns
 * from a wrong secret is the same generic 401 every other failure returns.
 */
export function signInSecretMatches(
  expected: string,
  candidate: string,
  compare: TimingSafeEqual = timingSafeEqual,
): boolean {
  const expectedBytes = Buffer.from(expected, "utf8");
  const candidateBytes = Buffer.from(candidate, "utf8");
  if (expectedBytes.byteLength !== candidateBytes.byteLength) return false;
  return compare(expectedBytes, candidateBytes);
}

function isFormSubmission(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return (
    contentType.startsWith("application/x-www-form-urlencoded") ||
    contentType.startsWith("multipart/form-data")
  );
}

/** A body that cannot be read at all is malformed, which is a 400 rather than a credential answer. */
class ReviewRequestBodyError extends Error {
  public constructor() {
    super("The review session request body could not be read.");
    this.name = "ReviewRequestBodyError";
  }
}

async function readRequestFields(request: Request): Promise<unknown> {
  try {
    if (!isFormSubmission(request)) return await request.json();
    const form = await request.formData();
    const fields: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      fields[key] = typeof value === "string" ? value : "";
    }
    return fields;
  } catch {
    throw new ReviewRequestBodyError();
  }
}

/**
 * The origin and host half of the 005a mutation gate. Sign-in carries no session, so there is no
 * session-bound CSRF token to check yet; the origin, the host, and their agreement with each other
 * are what a cross-site form post cannot forge.
 */
function assertReviewRequestOrigin(request: Request, ports: CampaignCommandPorts): void {
  const gate = ports.mutation;
  if (gate === undefined) throw new UnauthenticatedPrincipalError();
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? "";
  if (origin === null || host.length === 0 || host !== gate.expectedHost) {
    throw new UnauthenticatedPrincipalError();
  }
  if (!gate.allowedBrowserOrigins.includes(origin)) {
    throw new UnauthenticatedPrincipalError();
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new UnauthenticatedPrincipalError();
  }
  if (originHost !== host) throw new UnauthenticatedPrincipalError();
}

function surfaceRefusalResponse(error: unknown): Response | undefined {
  if (error instanceof ReviewSessionProductionRefusalError) {
    return jsonCommandError(403, "REVIEW_SESSION_REFUSED");
  }
  if (error instanceof ReviewSurfaceUnavailableError) {
    return jsonCommandError(404, "NOT_FOUND");
  }
  if (error instanceof ReviewSessionConfigurationError) {
    return jsonCommandError(503, "REVIEW_SESSION_UNCONFIGURED");
  }
  return undefined;
}

/** One body for every post-configuration failure, so no refusal is distinguishable from another. */
function genericRefusal(): Response {
  return jsonCommandError(401, "UNAUTHENTICATED");
}

function redirectOrJson(input: {
  readonly request: Request;
  readonly location: string;
  readonly cookie: string;
  readonly payload: Readonly<Record<string, string>>;
}): Response {
  const headers = new Headers({ "set-cookie": input.cookie, "cache-control": "no-store" });
  if (isFormSubmission(input.request)) {
    headers.set("location", input.location);
    return new Response(null, { status: 303, headers });
  }
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(input.payload), { status: 200, headers });
}

function clearedSessionCookie(): string {
  return `${FIRST_PARTY_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

interface SignInAttempt {
  readonly configuration: ReviewSessionConfiguration;
  readonly correlation: RequestCorrelation;
  readonly ports: CampaignCommandPorts;
  readonly dependencies: ReviewSessionDependencies;
}

async function mintReviewSession(request: Request, attempt: SignInAttempt): Promise<Response> {
  assertReviewRequestOrigin(request, attempt.ports);
  const parsed = ReviewSignInRequestSchema.safeParse(await readRequestFields(request));
  if (!parsed.success) {
    return Response.json(
      { error: "INVALID_REVIEW_SIGN_IN", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (
    !signInSecretMatches(
      attempt.configuration.signInSecret,
      parsed.data.secret,
      attempt.dependencies.timingSafeEqual,
    )
  ) {
    throw new UnauthenticatedPrincipalError();
  }
  const persona = ReviewPersonaSchema.safeParse(parsed.data.persona);
  if (!persona.success) throw new UnauthenticatedPrincipalError();
  const reviewSessions = attempt.ports.reviewSessions;
  if (reviewSessions === undefined) throw new UnauthenticatedPrincipalError();

  const binding = resolvePersonaBinding(persona.data, attempt.configuration);
  const userId = await reviewSessions.resolvePersona({
    locationId: binding.locationId,
    bindingRole: binding.bindingRole,
  });
  const sessionSecret = (attempt.dependencies.randomSecret ?? defaultSessionSecret)();
  let sessionRef: string;
  try {
    sessionRef = await reviewSessions.issue({
      locationId: binding.locationId,
      userId,
      bindingRole: binding.bindingRole,
      sessionRole: binding.sessionRole,
      sessionSecretHash: createHash("sha256").update(sessionSecret).digest("hex"),
      lifetimeSeconds: REVIEW_SESSION_LIFETIME_SECONDS,
      correlationRef: attempt.correlation.correlationRef,
    });
  } catch (error) {
    // 005B-AC-016. The refusal took its own audit row down with it, so the attempt is recorded
    // here instead. The location and the actor are both known at this point, which is exactly the
    // condition the sub-PRD attaches to auditing a denied attempt. A failure to record must not
    // turn the refusal into something else, so it is swallowed and the refusal is re-thrown.
    try {
      await reviewSessions.recordDeniedAttempt({
        locationId: binding.locationId,
        userId,
        correlationRef: attempt.correlation.correlationRef,
      });
    } catch (auditFailure) {
      // Named and discarded on purpose: the caller receives the refusal, and a failure to record
      // the attempt must not turn a refusal into a different answer.
      void auditFailure;
    }
    throw error;
  }
  return redirectOrJson({
    request,
    location: REVIEW_OVERVIEW_PATH,
    cookie: serializeFirstPartySessionCookie({
      sessionSecret,
      maxAgeSeconds: REVIEW_SESSION_LIFETIME_SECONDS,
    }),
    payload: { sessionRef },
  });
}

function defaultSessionSecret(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * 005B-AC-011, 012, 013, 014, 016, 020. `POST /api/review/session`.
 *
 * The persona schema is parsed before the secret is compared so a malformed body is a 400 rather
 * than a credential probe that costs a comparison, and the secret is compared before any database
 * call so a caller without the operator's secret never reaches a connection. From the comparison
 * onwards every failure, including the database's own `42501` refusals, collapses into one 401.
 */
export async function handleReviewSignIn(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  dependencies: ReviewSessionDependencies = {},
): Promise<Response> {
  let configuration: ReviewSessionConfiguration;
  try {
    configuration = readReviewSessionConfiguration(assertReviewSessionSurface(environment));
  } catch (error) {
    const refusal = surfaceRefusalResponse(error);
    if (refusal !== undefined) return refusal;
    throw error;
  }
  const correlation = correlationReferenceForRequest(request, "session");
  try {
    return withCorrelationHeaders(
      await mintReviewSession(request, { configuration, correlation, ports, dependencies }),
      correlation,
    );
  } catch (error) {
    if (error instanceof ReviewRequestBodyError) {
      return withCorrelationHeaders(jsonCommandError(400, "INVALID_REVIEW_SIGN_IN"), correlation);
    }
    return withCorrelationHeaders(genericRefusal(), correlation);
  }
}

/**
 * The sign-out control is a form, and a form post cannot set `x-csrf-token`. The token travels in
 * the body instead and is promoted to the header here, before the request reaches the 005a gate,
 * so sign-out is checked by exactly the same code as every other authenticated mutation rather
 * than by a weaker copy of it. The token is the session-bound HMAC either way, so the double
 * submit property is unchanged.
 */
async function withPromotedCsrfHeader(request: Request): Promise<Request> {
  if (request.headers.get(CSRF_REQUEST_HEADER) !== null || !isFormSubmission(request)) {
    return request;
  }
  let fields: unknown;
  try {
    fields = await readRequestFields(request);
  } catch {
    return request;
  }
  const parsed = ReviewSignOutRequestSchema.safeParse(fields);
  const csrfToken = parsed.success ? parsed.data.csrfToken : undefined;
  const headers = new Headers(request.headers);
  if (csrfToken !== undefined) headers.set(CSRF_REQUEST_HEADER, csrfToken);
  return new Request(request.url, { method: request.method, headers });
}

/**
 * 005B-AC-015 and 005B-AC-016. `POST /api/review/session/sign-out`.
 *
 * The session is resolved through `resolveAuthenticatedPrincipal` with mutations required, so the
 * cookie, the origin, the host, the CSRF token, and the role version are all checked before a row
 * moves. A request that fails any of them returns 401 and revokes nothing.
 */
export async function handleReviewSignOut(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  try {
    readReviewSessionConfiguration(assertReviewSessionSurface(environment));
  } catch (error) {
    const refusal = surfaceRefusalResponse(error);
    if (refusal !== undefined) return refusal;
    throw error;
  }
  const correlation = correlationReferenceForRequest(request, "signOut");
  try {
    const gated = await withPromotedCsrfHeader(request);
    const principal = await resolveAuthenticatedPrincipal(gated, environment, ports);
    const reviewSessions = ports.reviewSessions;
    if (reviewSessions === undefined) throw new UnauthenticatedPrincipalError();
    await reviewSessions.revoke({
      sessionRef: principal.sessionId,
      reason: "sign_out",
      correlationRef: correlation.correlationRef,
    });
    return withCorrelationHeaders(
      redirectOrJson({
        request,
        location: REVIEW_SIGN_IN_PATH,
        cookie: clearedSessionCookie(),
        payload: { signedOut: "true" },
      }),
      correlation,
    );
  } catch {
    return withCorrelationHeaders(genericRefusal(), correlation);
  }
}
