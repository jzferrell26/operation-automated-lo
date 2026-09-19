import { createHash, randomBytes } from "node:crypto";

import { CorrelationReferenceSchema } from "@oalo/contracts";

/**
 * Matches the shape of an inbound HTTP tracing header (a UUID, a vendor trace id, or the
 * canonical opaque form). This is deliberately wider than {@link CorrelationReferenceSchema}:
 * it decides only whether a header value is worth echoing back to the caller, never whether it
 * is safe to store in a correlation column.
 */
export const TRACING_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,299}$/u;

export const CORRELATION_REFERENCE_HEADER = "x-oalo-correlation-ref";
export const TRACING_ID_HEADER = "x-correlation-id";

/**
 * The route segment of a canonical reference. Each value is camel case because
 * {@link CorrelationReferenceSchema} allows only underscores as separators, so a hyphenated route
 * name would produce a reference the schema rejects at its own boundary.
 */
export type CorrelationRouteName =
  | "approve"
  | "preflight"
  | "session"
  | "signOut"
  | "signIn"
  | "signUp"
  | "chooseWorkspace"
  | "forgotPassword"
  | "resetPassword"
  | "verifyEmail"
  | "changePassword"
  // PRD-006c D4. The guided setup's two preference writes.
  | "setupProgress"
  | "setupProfile";

export interface RequestCorrelation {
  /** The canonical, schema-verified reference that may reach a database correlation column. */
  readonly correlationRef: string;
  /** The caller's own tracing id, present only when it matched {@link TRACING_ID_PATTERN}. */
  readonly tracingId: string | undefined;
}

function hexDigestFor(tracingId: string | undefined): string {
  if (tracingId !== undefined) {
    return createHash("sha256").update(tracingId).digest("hex").slice(0, 24);
  }
  return randomBytes(16).toString("hex").slice(0, 24);
}

/**
 * Derives one canonical correlation reference per request. The inbound `x-correlation-id`
 * header is read but never trusted directly: when it matches the tracing pattern it seeds a
 * deterministic hash (so retries of the same trace map to the same reference); otherwise a
 * fresh reference is generated. The header itself is returned separately as `tracingId` so
 * callers can echo it without ever assigning it to a `correlationRef` or `correlationId` field.
 */
export function correlationReferenceForRequest(
  request: Request,
  routeName: CorrelationRouteName,
): RequestCorrelation {
  const header = request.headers.get(TRACING_ID_HEADER);
  const tracingId = header !== null && TRACING_ID_PATTERN.test(header) ? header : undefined;
  const correlationRef = `correlation_${routeName}_${hexDigestFor(tracingId)}`;
  return {
    correlationRef: CorrelationReferenceSchema.parse(correlationRef),
    tracingId,
  };
}

/**
 * Attaches the canonical correlation reference (and the caller's tracing id, when accepted) to
 * a response, mutating and returning the same `Response`. Used on every campaign command
 * response, success or error, so the header is present regardless of outcome.
 */
export function withCorrelationHeaders(
  response: Response,
  correlation: Readonly<RequestCorrelation>,
): Response {
  response.headers.set(CORRELATION_REFERENCE_HEADER, correlation.correlationRef);
  if (correlation.tracingId !== undefined) {
    response.headers.set(TRACING_ID_HEADER, correlation.tracingId);
  }
  return response;
}
