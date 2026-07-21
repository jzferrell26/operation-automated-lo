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
