import { createHash } from "node:crypto";

import { z } from "zod";
import { createAbortContext, raceWithAbort, utf8ByteLength } from "@oalo/config";

import { canonicalizeJson } from "./canonical-json.js";
import {
  META_ROUTE_ALLOWLIST,
  planMetaAllowedOperation,
  type MetaAllowedAction,
} from "./meta-adapter.js";
import type { ProductionMetaReadTransport } from "./production-meta-read-transport.js";

export const LEADCONNECTOR_V2_BASE_URL = "https://services.leadconnectorhq.com" as const;
export const LEADCONNECTOR_V2_API_VERSION = "2021-07-28" as const;

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_MAXIMUM_REQUEST_BYTES = 1024 * 1024;
const DEFAULT_MAXIMUM_RESPONSE_BYTES = 2 * 1024 * 1024;

const LeadConnectorOperations = [
  "get-location",
  "get-integration",
  "get-pages",
  "get-instagram-accounts",
  "get-page-forms",
  "get-ad-accounts",
  "get-pixels",
  "get-campaign",
  "get-publishing-progress",
  "get-campaign-reporting",
  "upsert-campaign-draft",
  "upsert-adset-draft",
  "upsert-ad-draft",
  "publish-campaign",
  "pause-campaign",
  "resume-campaign",
] as const;

export type LeadConnectorOperation = (typeof LeadConnectorOperations)[number];
export type LeadConnectorMethod = "GET" | "POST" | "PUT";

export const LEADCONNECTOR_V2_ROUTE_ALLOWLIST = Object.freeze({
  "get-location": Object.freeze({ method: "GET", route: "/locations/:locationId" }),
  ...META_ROUTE_ALLOWLIST,
} as const satisfies Readonly<
  Record<LeadConnectorOperation, Readonly<{ method: LeadConnectorMethod; route: string }>>
>);

export type LeadConnectorFailureClassification =
  | "AUTH_RECONNECT_REQUIRED"
  | "DEPENDENCY_BLOCKED"
  | "NOT_FOUND"
  | "PRODUCT_CONFLICT"
  | "RATE_LIMITED"
  | "TRANSIENT_PROVIDER"
  | "UNCERTAIN_WRITE"
  | "VALIDATION_TERMINAL";

const SafeReferenceSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_.:-]{2,127}$/u);
const ProviderLocationIdSchema = z.string().regex(/^[A-Za-z0-9_-]{3,128}$/u);
const AccessTokenSchema = z.string().min(20).max(4_096).regex(/^\S+$/u);
const ProviderRequestReferenceSchema = z.string().regex(/^[A-Za-z0-9_.:/-]{1,256}$/u);
const SafeHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u);

const LeadConnectorTransportConfigSchema = z
  .object({
    requestTimeoutMs: z.number().int().min(1).max(60_000).default(DEFAULT_REQUEST_TIMEOUT_MS),
    maximumRequestBytes: z
      .number()
      .int()
      .min(1_024)
      .max(8 * 1024 * 1024)
      .default(DEFAULT_MAXIMUM_REQUEST_BYTES),
    maximumResponseBytes: z
      .number()
      .int()
      .min(1_024)
      .max(8 * 1024 * 1024)
      .default(DEFAULT_MAXIMUM_RESPONSE_BYTES),
  })
  .strict();

const LocationTokenSchema = z
  .object({
    locationId: ProviderLocationIdSchema,
    accessToken: AccessTokenSchema,
  })
  .strict();

const RequestParametersSchema = z
  .object({
    pageId: SafeReferenceSchema.optional(),
    campaignId: SafeReferenceSchema.optional(),
  })
  .strict();

const LeadConnectorRequestSchema = z
  .object({
    operation: z.enum(LeadConnectorOperations),
    locationRef: SafeReferenceSchema,
    parameters: RequestParametersSchema.default({}),
    body: z.record(z.string(), z.json()).optional(),
    idempotencyKey: SafeReferenceSchema.optional(),
  })
  .strict();

const LocationProbeEnvelopeSchema = z
  .object({
    location: z
      .object({
        id: ProviderLocationIdSchema,
      })
      .loose(),
  })
  .loose();

type LeadConnectorRequest = z.infer<typeof LeadConnectorRequestSchema>;
type LocationToken = z.infer<typeof LocationTokenSchema>;

export interface LeadConnectorRateLimitMetadata {
  readonly dailyLimit?: number;
  readonly dailyRemaining?: number;
  readonly intervalMilliseconds?: number;
  readonly intervalLimit?: number;
  readonly intervalRemaining?: number;
  readonly retryAfterMilliseconds?: number;
  readonly resetAtEpochMilliseconds?: number;
}

interface LeadConnectorHeaders {
  get(name: string): string | null;
}

export interface LeadConnectorHttpResponse {
  readonly status: number;
  readonly headers: LeadConnectorHeaders;
  text(): Promise<string>;
}

export type LeadConnectorFetchTransport = (
  url: string,
  init: Readonly<{
    method: LeadConnectorMethod;
    headers: Readonly<Record<string, string>>;
    body?: string;
    signal: AbortSignal;
  }>,
) => Promise<LeadConnectorHttpResponse>;

export type LeadConnectorLocationTokenResolver = (
  input: Readonly<{
    locationRef: string;
    signal: AbortSignal;
  }>,
) => Promise<unknown>;

export interface LeadConnectorV2HttpTransportDependencies {
  readonly fetch?: LeadConnectorFetchTransport;
  readonly resolveLocationToken?: LeadConnectorLocationTokenResolver;
  readonly nowMs?: () => number;
}

export interface LeadConnectorSafeAttempt {
  readonly schemaVersion: 1;
  readonly operation: LeadConnectorOperation;
  readonly method: LeadConnectorMethod;
  readonly requestHash: `sha256:${string}`;
  readonly normalizedResultHash: `sha256:${string}`;
  readonly classification: "SUCCESS";
  readonly providerRequestRef?: string;
  readonly rateLimit: LeadConnectorRateLimitMetadata;
}

export interface LeadConnectorTransportResult<Result> {
  readonly normalized: Readonly<Result>;
  readonly attempt: LeadConnectorSafeAttempt;
}

export interface LeadConnectorReadinessProbe {
  readonly ready: boolean;
  readonly classification: "SUCCESS" | LeadConnectorFailureClassification;
  readonly latencyMilliseconds: number;
  readonly providerLocationHash?: `sha256:${string}`;
  readonly rateLimit: LeadConnectorRateLimitMetadata;
}

export interface LeadConnectorV2HttpTransport extends ProductionMetaReadTransport {
  execute<Result>(
    input: unknown,
    responseSchema: z.ZodType<Result>,
    signal?: AbortSignal,
  ): Promise<LeadConnectorTransportResult<Result>>;
  probe(input: unknown, signal?: AbortSignal): Promise<LeadConnectorReadinessProbe>;
}

export class LeadConnectorTransportConfigurationError extends Error {
  public constructor() {
    super("LeadConnector transport configuration is invalid.");
    this.name = "LeadConnectorTransportConfigurationError";
  }
}

export class LeadConnectorTransportInputError extends Error {
  public constructor() {
    super("LeadConnector request is not an allowlisted valid operation.");
    this.name = "LeadConnectorTransportInputError";
  }
}

export class LeadConnectorTransportError extends Error {
  public readonly classification: LeadConnectorFailureClassification;
  public readonly operation: LeadConnectorOperation;
  public readonly method: LeadConnectorMethod;
  public readonly requestHash: `sha256:${string}`;
  public readonly rateLimit: LeadConnectorRateLimitMetadata;
  public readonly retrySafe: boolean;
  public readonly requiresReconciliation: boolean;
  public readonly timedOut: boolean;
  public readonly status: number | undefined;

  public constructor(
    input: Readonly<{
      classification: LeadConnectorFailureClassification;
      operation: LeadConnectorOperation;
      method: LeadConnectorMethod;
      requestHash: `sha256:${string}`;
      rateLimit?: LeadConnectorRateLimitMetadata;
      timedOut?: boolean;
      status?: number;
    }>,
  ) {
    super(`LeadConnector request failed with classification ${input.classification}.`);
    this.name = "LeadConnectorTransportError";
    this.classification = input.classification;
    this.operation = input.operation;
    this.method = input.method;
    this.requestHash = input.requestHash;
    this.rateLimit = input.rateLimit ?? Object.freeze({});
    this.requiresReconciliation = input.classification === "UNCERTAIN_WRITE";
    this.retrySafe =
      input.method === "GET" &&
      (input.classification === "RATE_LIMITED" || input.classification === "TRANSIENT_PROVIDER");
    this.timedOut = input.timedOut ?? false;
    this.status = input.status;
  }
}

function parseTransportConfig(input: unknown): z.infer<typeof LeadConnectorTransportConfigSchema> {
  const parsed = LeadConnectorTransportConfigSchema.safeParse(input);
  if (!parsed.success) throw new LeadConnectorTransportConfigurationError();
  return Object.freeze(parsed.data);
}

function safeHash(value: unknown): `sha256:${string}` {
  const parsed = z.json().parse(value);
  const canonical = JSON.stringify(canonicalizeJson(parsed));
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

function deepFreeze<Result>(value: Result): Readonly<Result> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function operationMethod(operation: LeadConnectorOperation): LeadConnectorMethod {
  return LEADCONNECTOR_V2_ROUTE_ALLOWLIST[operation].method;
}

function parseRequest(input: unknown): LeadConnectorRequest {
  const parsed = LeadConnectorRequestSchema.safeParse(input);
  if (!parsed.success) throw new LeadConnectorTransportInputError();
  const request = parsed.data;
  const method = operationMethod(request.operation);
  const parameterKeys = Object.keys(request.parameters);
  if (request.operation === "get-location") {
    if (
      parameterKeys.length !== 0 ||
      request.body !== undefined ||
      request.idempotencyKey !== undefined
    ) {
      throw new LeadConnectorTransportInputError();
    }
    return request;
  }
  const routeTemplate = META_ROUTE_ALLOWLIST[request.operation].route;
  for (const parameterKey of parameterKeys) {
    if (!routeTemplate.includes(`:${parameterKey}`)) throw new LeadConnectorTransportInputError();
  }
  for (const requiredParameter of ["pageId", "campaignId"] as const) {
    if (
      routeTemplate.includes(`:${requiredParameter}`) &&
      request.parameters[requiredParameter] === undefined
    ) {
      throw new LeadConnectorTransportInputError();
    }
  }
  if (method === "GET") {
    if (request.body !== undefined || request.idempotencyKey !== undefined) {
      throw new LeadConnectorTransportInputError();
    }
  } else if (request.body === undefined || request.idempotencyKey === undefined) {
    throw new LeadConnectorTransportInputError();
  }
  return request;
}

function requestRoute(request: LeadConnectorRequest, locationId: string): string {
  if (request.operation === "get-location") {
    return `/locations/${encodeURIComponent(locationId)}`;
  }
  return planMetaAllowedOperation({
    action: request.operation,
    locationRef: request.locationRef,
    parameters: request.parameters,
  }).route;
}

function parseNonNegativeInteger(value: string | null): number | undefined {
  if (value === null || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function retryAfterMilliseconds(value: string | null, nowMs: number): number | undefined {
  if (value === null) return undefined;
  if (/^\d+(?:\.\d+)?$/u.test(value)) {
    const milliseconds = Math.ceil(Number(value) * 1_000);
    return Number.isSafeInteger(milliseconds) && milliseconds >= 0 ? milliseconds : undefined;
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.ceil(date - nowMs)) : undefined;
}

function resetAtEpochMilliseconds(
  headers: LeadConnectorHeaders,
  nowMs: number,
): number | undefined {
  const providerReset = parseNonNegativeInteger(headers.get("x-ratelimit-reset"));
  if (providerReset !== undefined) {
    return providerReset >= 1_000_000_000_000 ? providerReset : providerReset * 1_000;
  }
  const standardReset = parseNonNegativeInteger(headers.get("ratelimit-reset"));
  if (standardReset === undefined) return undefined;
  return nowMs + standardReset * 1_000;
}

function withDefined<Output extends object, Key extends string, Value>(
  output: Output,
  key: Key,
  value: Value | undefined,
): Output & Partial<Record<Key, Value>> {
  if (value !== undefined) Object.assign(output, { [key]: value });
  return output;
}

export function parseLeadConnectorRateLimitMetadata(
  headers: LeadConnectorHeaders,
  nowMs = Date.now(),
): LeadConnectorRateLimitMetadata {
  const result: Record<string, number> = {};
  withDefined(
    result,
    "dailyLimit",
    parseNonNegativeInteger(headers.get("x-ratelimit-limit-daily")),
  );
  withDefined(
    result,
    "dailyRemaining",
    parseNonNegativeInteger(headers.get("x-ratelimit-daily-remaining")),
  );
  withDefined(
    result,
    "intervalMilliseconds",
    parseNonNegativeInteger(headers.get("x-ratelimit-interval-milliseconds")),
  );
  withDefined(result, "intervalLimit", parseNonNegativeInteger(headers.get("x-ratelimit-max")));
  withDefined(
    result,
    "intervalRemaining",
    parseNonNegativeInteger(headers.get("x-ratelimit-remaining")),
  );
  withDefined(
    result,
    "retryAfterMilliseconds",
    retryAfterMilliseconds(headers.get("retry-after"), nowMs),
  );
  withDefined(result, "resetAtEpochMilliseconds", resetAtEpochMilliseconds(headers, nowMs));
  return Object.freeze(result);
}

export function classifyLeadConnectorFailure(
  status: number,
  method: LeadConnectorMethod,
): LeadConnectorFailureClassification {
  if (status === 400 || status === 422) return "VALIDATION_TERMINAL";
  if (status === 401 || status === 403) return "AUTH_RECONNECT_REQUIRED";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "PRODUCT_CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500 && status <= 599) {
    return method === "GET" ? "TRANSIENT_PROVIDER" : "UNCERTAIN_WRITE";
  }
  return "VALIDATION_TERMINAL";
}

function safeProviderRequestRef(headers: LeadConnectorHeaders): string | undefined {
  const candidate = headers.get("x-request-id") ?? headers.get("x-correlation-id");
  if (candidate === null) return undefined;
  const parsed = ProviderRequestReferenceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

function defaultFetchTransport(
  url: string,
  init: Parameters<LeadConnectorFetchTransport>[1],
): Promise<LeadConnectorHttpResponse> {
  return fetch(url, init);
}

function providerAbortContext(timeoutMilliseconds: number, externalSignal?: AbortSignal) {
  return createAbortContext({
    controller: new AbortController(),
    timeoutMilliseconds,
    timeoutReason: new Error("LeadConnector request timeout"),
    ...(externalSignal === undefined ? {} : { externalSignal }),
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
  });
}

async function readBoundedJson(
  response: LeadConnectorHttpResponse,
  maximumBytes: number,
): Promise<unknown> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = parseNonNegativeInteger(contentLength);
    if (parsedLength === undefined || parsedLength > maximumBytes) {
      throw new Error("LeadConnector response size is invalid.");
    }
  }
  const text = await response.text();
  if (utf8ByteLength(text) > maximumBytes) {
    throw new Error("LeadConnector response exceeds its safe size limit.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new Error("LeadConnector response is not valid JSON.");
  }
  return z.json().parse(value);
}

function metaGetRequestFromRoute(input: Readonly<{ locationRef: string; route: string }>): unknown {
  const locationRef = SafeReferenceSchema.safeParse(input.locationRef);
  if (!locationRef.success || input.route.includes("?") || !input.route.startsWith("/")) {
    throw new LeadConnectorTransportInputError();
  }
  const staticActions = [
    "get-integration",
    "get-pages",
    "get-ad-accounts",
    "get-pixels",
  ] as const satisfies readonly MetaAllowedAction[];
  for (const action of staticActions) {
    if (META_ROUTE_ALLOWLIST[action].route === input.route) {
      return { operation: action, locationRef: locationRef.data };
    }
  }
  const dynamicActions = [
    ["get-instagram-accounts", "pageId"],
    ["get-page-forms", "pageId"],
    ["get-campaign", "campaignId"],
    ["get-publishing-progress", "campaignId"],
    ["get-campaign-reporting", "campaignId"],
  ] as const;
  for (const [action, parameterName] of dynamicActions) {
    const template = META_ROUTE_ALLOWLIST[action].route;
    const [prefix, suffix = ""] = template.split(`:${parameterName}`);
    if (prefix === undefined || !input.route.startsWith(prefix) || !input.route.endsWith(suffix)) {
      continue;
    }
    const encoded = input.route.slice(prefix.length, input.route.length - suffix.length);
    let decoded: string;
    try {
      decoded = decodeURIComponent(encoded);
    } catch {
      throw new LeadConnectorTransportInputError();
    }
    const parameter = SafeReferenceSchema.safeParse(decoded);
    if (!parameter.success) throw new LeadConnectorTransportInputError();
    const request = {
      operation: action,
      locationRef: locationRef.data,
      parameters: { [parameterName]: parameter.data },
    };
    const planned = planMetaAllowedOperation({
      action,
      locationRef: locationRef.data,
      parameters: request.parameters,
    });
    if (planned.route === input.route) return request;
  }
  throw new LeadConnectorTransportInputError();
}

export function createLeadConnectorV2HttpTransport(
  unsafeConfig: unknown,
  dependencies: LeadConnectorV2HttpTransportDependencies = {},
): LeadConnectorV2HttpTransport {
  const config = parseTransportConfig(unsafeConfig);
  if (
    (dependencies.fetch !== undefined && typeof dependencies.fetch !== "function") ||
    (dependencies.resolveLocationToken !== undefined &&
      typeof dependencies.resolveLocationToken !== "function") ||
    (dependencies.nowMs !== undefined && typeof dependencies.nowMs !== "function")
  ) {
    throw new LeadConnectorTransportConfigurationError();
  }
  const fetchTransport = dependencies.fetch ?? defaultFetchTransport;
  const resolveLocationToken = dependencies.resolveLocationToken;
  const nowMs = dependencies.nowMs ?? Date.now;

  const execute = async <Result>(
    input: unknown,
    responseSchema: z.ZodType<Result>,
    externalSignal?: AbortSignal,
  ): Promise<LeadConnectorTransportResult<Result>> => {
    const request = parseRequest(input);
    const method = operationMethod(request.operation);
    const requestHash = safeHash({
      operation: request.operation,
      locationRef: request.locationRef,
      parameters: request.parameters,
      ...(request.body === undefined ? {} : { body: request.body }),
    });
    if (!SafeHashSchema.safeParse(requestHash).success) {
      throw new LeadConnectorTransportInputError();
    }
    const body = request.body === undefined ? undefined : JSON.stringify(request.body);
    if (body !== undefined && utf8ByteLength(body) > config.maximumRequestBytes) {
      throw new LeadConnectorTransportInputError();
    }
    const abortContext = providerAbortContext(config.requestTimeoutMs, externalSignal);
    let requestDispatched = false;
    try {
      if (resolveLocationToken === undefined) {
        throw new LeadConnectorTransportError({
          classification: "DEPENDENCY_BLOCKED",
          operation: request.operation,
          method,
          requestHash,
        });
      }
      let locationToken: LocationToken;
      try {
        locationToken = LocationTokenSchema.parse(
          await raceWithAbort(
            resolveLocationToken({
              locationRef: request.locationRef,
              signal: abortContext.signal,
            }),
            abortContext.signal,
          ),
        );
      } catch (error) {
        if (error instanceof LeadConnectorTransportError) throw error;
        throw new LeadConnectorTransportError({
          classification: "AUTH_RECONNECT_REQUIRED",
          operation: request.operation,
          method,
          requestHash,
          timedOut: abortContext.timedOut(),
        });
      }
      const route = requestRoute(request, locationToken.locationId);
      const url = new URL(route, LEADCONNECTOR_V2_BASE_URL);
      if (request.operation !== "get-location") {
        url.searchParams.set("locationId", locationToken.locationId);
      }
      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${locationToken.accessToken}`,
        Version: LEADCONNECTOR_V2_API_VERSION,
      };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      requestDispatched = true;
      const response = await raceWithAbort(
        fetchTransport(url.toString(), {
          method,
          headers: Object.freeze(headers),
          ...(body === undefined ? {} : { body }),
          signal: abortContext.signal,
        }),
        abortContext.signal,
      );
      const rateLimit = parseLeadConnectorRateLimitMetadata(response.headers, nowMs());
      let responseBody: unknown;
      let responseBodyValid = true;
      try {
        responseBody = await raceWithAbort(
          readBoundedJson(response, config.maximumResponseBytes),
          abortContext.signal,
        );
      } catch {
        responseBodyValid = false;
      }
      if (response.status < 200 || response.status >= 300) {
        throw new LeadConnectorTransportError({
          classification: classifyLeadConnectorFailure(response.status, method),
          operation: request.operation,
          method,
          requestHash,
          rateLimit,
          timedOut: abortContext.timedOut(),
          status: response.status,
        });
      }
      if (!responseBodyValid) {
        throw new LeadConnectorTransportError({
          classification: method === "GET" ? "TRANSIENT_PROVIDER" : "UNCERTAIN_WRITE",
          operation: request.operation,
          method,
          requestHash,
          rateLimit,
          timedOut: abortContext.timedOut(),
          status: response.status,
        });
      }
      if (request.operation === "get-location") {
        const providerLocation = LocationProbeEnvelopeSchema.safeParse(responseBody);
        if (
          !providerLocation.success ||
          providerLocation.data.location.id !== locationToken.locationId
        ) {
          throw new LeadConnectorTransportError({
            classification: "DEPENDENCY_BLOCKED",
            operation: request.operation,
            method,
            requestHash,
            rateLimit,
            status: response.status,
          });
        }
      }
      const normalizedResult = responseSchema.safeParse(responseBody);
      if (!normalizedResult.success) {
        throw new LeadConnectorTransportError({
          classification: method === "GET" ? "TRANSIENT_PROVIDER" : "UNCERTAIN_WRITE",
          operation: request.operation,
          method,
          requestHash,
          rateLimit,
          status: response.status,
        });
      }
      const normalizedJson = z.json().safeParse(normalizedResult.data);
      if (!normalizedJson.success) {
        throw new LeadConnectorTransportError({
          classification: method === "GET" ? "TRANSIENT_PROVIDER" : "UNCERTAIN_WRITE",
          operation: request.operation,
          method,
          requestHash,
          rateLimit,
          status: response.status,
        });
      }
      const normalized = deepFreeze(normalizedResult.data);
      const providerRequestRef = safeProviderRequestRef(response.headers);
      const attempt: LeadConnectorSafeAttempt = Object.freeze({
        schemaVersion: 1 as const,
        operation: request.operation,
        method,
        requestHash,
        normalizedResultHash: safeHash(normalizedJson.data),
        classification: "SUCCESS" as const,
        ...(providerRequestRef === undefined ? {} : { providerRequestRef }),
        rateLimit,
      });
      return Object.freeze({ normalized, attempt });
    } catch (error) {
      if (error instanceof LeadConnectorTransportError) throw error;
      throw new LeadConnectorTransportError({
        classification:
          requestDispatched && method !== "GET"
            ? "UNCERTAIN_WRITE"
            : requestDispatched
              ? "TRANSIENT_PROVIDER"
              : "AUTH_RECONNECT_REQUIRED",
        operation: request.operation,
        method,
        requestHash,
        timedOut: abortContext.timedOut(),
      });
    } finally {
      abortContext.dispose();
    }
  };

  const probe = async (
    input: unknown,
    signal?: AbortSignal,
  ): Promise<LeadConnectorReadinessProbe> => {
    const parsed = z.object({ locationRef: SafeReferenceSchema }).strict().safeParse(input);
    if (!parsed.success) throw new LeadConnectorTransportInputError();
    const startedAt = nowMs();
    try {
      const result = await execute(
        { operation: "get-location", locationRef: parsed.data.locationRef },
        LocationProbeEnvelopeSchema.transform((value) => ({ locationId: value.location.id })),
        signal,
      );
      return Object.freeze({
        ready: true,
        classification: "SUCCESS" as const,
        latencyMilliseconds: Math.max(0, Math.round(nowMs() - startedAt)),
        providerLocationHash: safeHash(result.normalized.locationId),
        rateLimit: result.attempt.rateLimit,
      });
    } catch (error) {
      if (!(error instanceof LeadConnectorTransportError)) throw error;
      return Object.freeze({
        ready: false,
        classification: error.classification,
        latencyMilliseconds: Math.max(0, Math.round(nowMs() - startedAt)),
        rateLimit: error.rateLimit,
      });
    }
  };

  return Object.freeze({
    execute,
    probe,
    async get(
      input: Readonly<{ locationRef: string; route: string }>,
      externalSignal?: AbortSignal,
    ): Promise<unknown> {
      const result = await execute(metaGetRequestFromRoute(input), z.json(), externalSignal);
      return result.normalized;
    },
  });
}
