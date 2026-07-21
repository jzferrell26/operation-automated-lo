import { FixtureRateLimitHeadersSchema, SafeTenantReferenceSchema } from "@oalo/contracts";

import { hashFixtureValue } from "./evidence.js";
import { UnsafeFixtureError, assertFixtureOnlyRequest } from "./sanitization.js";

export type FixtureProviderClassification =
  | "SUCCESS"
  | "AUTH_RECONNECT_REQUIRED"
  | "RATE_LIMITED"
  | "TRANSIENT_PROVIDER"
  | "VALIDATION_TERMINAL"
  | "UNCERTAIN_WRITE";

export interface FixtureResilienceDecision {
  readonly locationId: string;
  readonly concurrencyKey: string;
  readonly maxConcurrentRequests: 1;
  readonly classification: FixtureProviderClassification;
  readonly retryAfterMilliseconds: number | undefined;
  readonly returnedRateLimitHeaders: Readonly<Record<string, string>>;
}

export interface FixtureRetryPlan {
  readonly retry: boolean;
  readonly attempt: number;
  readonly delayMilliseconds: number | undefined;
  readonly reason: "rate-limit" | "transient-provider" | "terminal-or-reconcile";
}

function retryAfterMilliseconds(headers: Readonly<Record<string, string>>): number | undefined {
  const seconds = headers["retry-after"];
  return seconds === undefined ? undefined : Number(seconds) * 1_000;
}

export function classifyFixtureProviderResponse(input: {
  readonly locationId: string;
  readonly request: {
    readonly transport: string;
    readonly method: string;
    readonly path: string;
  };
  readonly httpStatus: number;
  readonly rateLimitHeaders?: Readonly<Record<string, string>>;
  readonly writeMayHaveReachedProvider?: boolean;
}): FixtureResilienceDecision {
  assertFixtureOnlyRequest(input.request);
  SafeTenantReferenceSchema.parse(input.locationId);
  const parsedHeaders = FixtureRateLimitHeadersSchema.parse(input.rateLimitHeaders ?? {});
  const headers: Readonly<Record<string, string>> = Object.freeze(
    Object.fromEntries(
      Object.entries(parsedHeaders).filter((entry): entry is [string, string] => {
        return entry[1] !== undefined;
      }),
    ),
  );
  const classification: FixtureProviderClassification =
    input.writeMayHaveReachedProvider && input.httpStatus >= 500
      ? "UNCERTAIN_WRITE"
      : input.httpStatus === 429
        ? "RATE_LIMITED"
        : input.httpStatus === 401 || input.httpStatus === 403
          ? "AUTH_RECONNECT_REQUIRED"
          : input.httpStatus >= 500 || input.httpStatus === 408
            ? "TRANSIENT_PROVIDER"
            : input.httpStatus >= 400
              ? "VALIDATION_TERMINAL"
              : "SUCCESS";

  return Object.freeze({
    locationId: input.locationId,
    concurrencyKey: `ghl:${input.locationId}`,
    maxConcurrentRequests: 1 as const,
    classification,
    retryAfterMilliseconds: retryAfterMilliseconds(headers),
    returnedRateLimitHeaders: headers,
  });
}

export function planFixtureRetry(input: {
  readonly decision: FixtureResilienceDecision;
  readonly attempt: number;
  readonly baseDelayMilliseconds: number;
  readonly maximumDelayMilliseconds: number;
  readonly jitterUnit: number;
}): FixtureRetryPlan {
  if (!Number.isInteger(input.attempt) || input.attempt < 1 || input.attempt > 12) {
    throw new RangeError("Retry attempt must be an integer from one through twelve");
  }
  if (
    !Number.isInteger(input.baseDelayMilliseconds) ||
    input.baseDelayMilliseconds < 100 ||
    !Number.isInteger(input.maximumDelayMilliseconds) ||
    input.maximumDelayMilliseconds < input.baseDelayMilliseconds
  ) {
    throw new RangeError("Retry delay bounds are invalid");
  }
  if (!Number.isFinite(input.jitterUnit) || input.jitterUnit < 0 || input.jitterUnit > 1) {
    throw new RangeError("Retry jitter must be between zero and one");
  }
  if (
    input.decision.classification !== "RATE_LIMITED" &&
    input.decision.classification !== "TRANSIENT_PROVIDER"
  ) {
    return Object.freeze({
      retry: false,
      attempt: input.attempt,
      delayMilliseconds: undefined,
      reason: "terminal-or-reconcile" as const,
    });
  }
  const exponential = Math.min(
    input.maximumDelayMilliseconds,
    input.baseDelayMilliseconds * 2 ** (input.attempt - 1),
  );
  const jittered = Math.floor(exponential * (0.5 + input.jitterUnit * 0.5));
  const delayMilliseconds = Math.min(
    input.maximumDelayMilliseconds,
    Math.max(jittered, input.decision.retryAfterMilliseconds ?? 0),
  );
  return Object.freeze({
    retry: true,
    attempt: input.attempt,
    delayMilliseconds,
    reason:
      input.decision.classification === "RATE_LIMITED"
        ? ("rate-limit" as const)
        : ("transient-provider" as const),
  });
}

export interface FixtureWriteResult {
  readonly idempotencyKey: string;
  readonly requestHash: `sha256:${string}`;
  readonly duplicate: boolean;
}

export class FixtureWriteIdempotencyLedger {
  readonly #receipts = new Map<string, FixtureWriteResult>();

  public accept(input: {
    readonly locationId: string;
    readonly idempotencyKey: string;
    readonly request: {
      readonly transport: string;
      readonly method: string;
      readonly path: string;
    };
    readonly body: unknown;
  }): FixtureWriteResult {
    assertFixtureOnlyRequest(input.request);
    if (input.request.method !== "POST") {
      throw new UnsafeFixtureError("Fixture write idempotency accepts simulated POST writes only.");
    }
    SafeTenantReferenceSchema.parse(input.locationId);
    SafeTenantReferenceSchema.parse(input.idempotencyKey);
    const receiptKey = `${input.locationId}:${input.idempotencyKey}`;
    const requestHash = hashFixtureValue({ path: input.request.path, body: input.body });
    const existing = this.#receipts.get(receiptKey);
    if (existing !== undefined) {
      if (existing.requestHash !== requestHash) {
        throw new UnsafeFixtureError("Idempotency key conflicts with a different fixture request.");
      }
      return Object.freeze({ ...existing, duplicate: true });
    }

    const receipt = Object.freeze({
      idempotencyKey: input.idempotencyKey,
      requestHash,
      duplicate: false,
    });
    this.#receipts.set(receiptKey, receipt);
    return receipt;
  }
}
