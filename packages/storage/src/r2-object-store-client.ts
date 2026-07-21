import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import {
  ArtifactRecordSchema,
  ArtifactTypeSchema,
  PublishedCampaignProjectionSchema,
  StorageTransferRequestSchema,
  type ArtifactRecord,
  type StorageTransferRequest,
} from "@oalo/contracts";
import { z } from "zod";
import { createAbortContext, raceWithAbort } from "@oalo/config";

import type { ProductionObjectStoreAdapter } from "./production-object-store.js";
import { privateArtifactKey, publishedArtifactPrefix } from "./production-storage.js";
import type { ProjectionWithdrawalRecord } from "./projection-withdrawal.js";

const REGION = "auto";
const SERVICE = "s3";
const SIGNING_ALGORITHM = "AWS4-HMAC-SHA256";
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
const DEFAULT_TIMEOUT_MS = 15_000;

const BucketSchema = z.string().regex(/^[a-z0-9][a-z0-9.-]{2,62}$/u);
const ObjectKeySchema = z
  .string()
  .min(1)
  .max(1_024)
  .regex(/^[A-Za-z0-9._/-]+$/u)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.endsWith("/") &&
      value
        .split("/")
        .every((segment) => segment.length > 0 && segment !== "." && segment !== ".."),
    "Object key must contain confined non-empty path segments.",
  );
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

const R2ObjectStoreConfigSchema = z
  .object({
    accountId: z.string().regex(/^[a-f0-9]{32}$/u),
    accessKeyId: z
      .string()
      .min(16)
      .max(256)
      .regex(/^[A-Za-z0-9_-]+$/u),
    secretAccessKey: z.string().min(32).max(512).regex(/^\S+$/u),
    privateBucket: BucketSchema,
    publicBucket: BucketSchema,
    publicBaseUrl: z.url({ protocol: /^https$/u }),
    requestTimeoutMs: z.number().int().min(1).max(60_000).default(DEFAULT_TIMEOUT_MS),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.privateBucket === value.publicBucket) {
      context.addIssue({ code: "custom", message: "R2 buckets must be distinct." });
    }
    const baseUrl = new URL(value.publicBaseUrl);
    if (
      baseUrl.username !== "" ||
      baseUrl.password !== "" ||
      baseUrl.search !== "" ||
      baseUrl.hash !== "" ||
      !baseUrl.pathname.endsWith("/")
    ) {
      context.addIssue({ code: "custom", message: "R2 public base URL is invalid." });
    }
  });

type R2ObjectStoreConfig = z.infer<typeof R2ObjectStoreConfigSchema>;

const QuarantineInputSchema = z
  .object({
    publicBucket: BucketSchema,
    locationRef: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/u),
    publicCampaignId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/u),
    campaignVersionRef: z.string().min(8).max(128),
    publishedVersion: z.number().int().positive(),
    attemptedKeys: z.array(ObjectKeySchema).min(1).max(100),
    idempotencyKey: Sha256Schema,
    problemCode: z.literal("PUBLICATION_PARTIAL_FAILURE"),
  })
  .strict();

const WithdrawalRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    withdrawalRef: z.string().min(8).max(128),
    publicCampaignId: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/u),
    campaignVersionRef: z.string().min(8).max(128),
    actorRef: z.string().min(8).max(128),
    projection: PublishedCampaignProjectionSchema,
    withdrawnAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const PrivateArtifactWriteSchema = z
  .object({
    artifactRef: z.string().min(8).max(128),
    artifactType: ArtifactTypeSchema,
    locationRef: z.string().min(8).max(128),
    campaignRef: z.string().min(8).max(128),
    campaignVersionRef: z.string().min(8).max(128),
    sha256: Sha256Schema,
    mimeType: z.enum(["text/html", "application/pdf", "image/png", "image/jpeg"]),
    bytes: z
      .instanceof(Uint8Array)
      .refine((value) => value.byteLength > 0 && value.byteLength <= 100 * 1024 * 1024),
  })
  .strict();

interface SafeHeaders {
  get(name: string): string | null;
}

export interface R2HttpResponse {
  readonly status: number;
  readonly headers: SafeHeaders;
}

export type R2FetchTransport = (
  url: string,
  init: Readonly<{
    method: "DELETE" | "HEAD" | "PUT";
    headers: Readonly<Record<string, string>>;
    body?: string | Uint8Array;
    signal: AbortSignal;
  }>,
) => Promise<R2HttpResponse>;

export interface R2ObjectStoreDependencies {
  readonly fetch?: R2FetchTransport;
  readonly now?: () => Date;
}

export interface SignedPrivateTransfer {
  readonly method: "GET" | "PUT";
  readonly url: string;
  readonly requiredHeaders: Readonly<Record<string, string>>;
  readonly maximumBytes: number;
  readonly expectedSha256: string;
  readonly expiresAt: string;
}

export interface R2ObjectStoreClient extends ProductionObjectStoreAdapter {
  store(input: z.input<typeof PrivateArtifactWriteSchema>): Promise<string>;
  probe(signal?: AbortSignal): Promise<R2ObjectStoreProbeResult>;
  createSignedPrivateTransfer(
    input: Readonly<{
      bucket: string;
      request: StorageTransferRequest;
      authorization: string;
    }>,
  ): SignedPrivateTransfer;
}

export type R2FailureClassification =
  "timeout" | "rate_limited" | "unauthorized" | "not_found" | "conflict" | "provider_unavailable";

export type R2ObjectStoreProbeResult =
  | Readonly<{ status: "ready" }>
  | Readonly<{ status: "unavailable"; classification: R2FailureClassification }>;

export class R2ObjectStoreConfigurationError extends Error {
  public constructor() {
    super("R2 object-store configuration is invalid.");
    this.name = "R2ObjectStoreConfigurationError";
  }
}

export class R2ObjectStoreError extends Error {
  public readonly classification: R2FailureClassification;
  public readonly status?: number;

  public constructor(classification: R2FailureClassification, status?: number) {
    super(`R2 object-store operation failed safely: ${classification}.`);
    this.name = "R2ObjectStoreError";
    this.classification = classification;
    if (status !== undefined) this.status = status;
  }
}

function parseConfig(unsafeConfig: unknown): R2ObjectStoreConfig {
  const result = R2ObjectStoreConfigSchema.safeParse(unsafeConfig);
  if (!result.success) throw new R2ObjectStoreConfigurationError();
  return Object.freeze(result.data);
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: string | Buffer, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/gu,
    (character) => `%${character.codePointAt(0)?.toString(16).toUpperCase() ?? ""}`,
  );
}

function canonicalObjectPath(bucket: string, objectKey: string): string {
  const safeBucket = BucketSchema.parse(bucket);
  const safeKey = ObjectKeySchema.parse(objectKey);
  return `/${encodeRfc3986(safeBucket)}/${safeKey.split("/").map(encodeRfc3986).join("/")}`;
}

function canonicalBucketPath(bucket: string): string {
  return `/${encodeRfc3986(BucketSchema.parse(bucket))}`;
}

function canonicalQuery(entries: Readonly<Record<string, string>>): string {
  return Object.entries(entries)
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function amzDate(now: Date): Readonly<{ full: string; short: string }> {
  const full = now
    .toISOString()
    .replaceAll(/[-:]/gu, "")
    .replace(/\.\d{3}Z$/u, "Z");
  return Object.freeze({ full, short: full.slice(0, 8) });
}

function canonicalHeaderValue(value: string): string {
  return value.trim().replaceAll(/\s+/gu, " ");
}

function canonicalHeaders(headers: Readonly<Record<string, string>>): Readonly<{
  canonical: string;
  names: string;
}> {
  const entries = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), canonicalHeaderValue(value)] as const)
    .toSorted(([left], [right]) => left.localeCompare(right));
  return Object.freeze({
    canonical: `${entries.map(([name, value]) => `${name}:${value}`).join("\n")}\n`,
    names: entries.map(([name]) => name).join(";"),
  });
}

function signingKey(secretAccessKey: string, date: string): Buffer {
  const dateKey = hmac(`AWS4${secretAccessKey}`, date);
  const regionKey = hmac(dateKey, REGION);
  const serviceKey = hmac(regionKey, SERVICE);
  return hmac(serviceKey, "aws4_request");
}

function endpointHost(config: R2ObjectStoreConfig): string {
  return `${config.accountId}.r2.cloudflarestorage.com`;
}

function signRequest(
  input: Readonly<{
    config: R2ObjectStoreConfig;
    method: "DELETE" | "HEAD" | "PUT";
    bucket: string;
    objectKey?: string;
    payload: string | Uint8Array;
    headers?: Readonly<Record<string, string>>;
    now: Date;
  }>,
): Readonly<{ url: string; headers: Readonly<Record<string, string>> }> {
  const date = amzDate(input.now);
  const host = endpointHost(input.config);
  const payloadHash = sha256(input.payload);
  const unsignedHeaders = Object.freeze({
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": date.full,
    ...input.headers,
  });
  const normalizedHeaders = canonicalHeaders(unsignedHeaders);
  const path =
    input.objectKey === undefined
      ? canonicalBucketPath(input.bucket)
      : canonicalObjectPath(input.bucket, input.objectKey);
  const canonicalRequest = [
    input.method,
    path,
    "",
    normalizedHeaders.canonical,
    normalizedHeaders.names,
    payloadHash,
  ].join("\n");
  const scope = `${date.short}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [SIGNING_ALGORITHM, date.full, scope, sha256(canonicalRequest)].join("\n");
  const authorization = `${SIGNING_ALGORITHM} Credential=${input.config.accessKeyId}/${scope}, SignedHeaders=${normalizedHeaders.names}, Signature=${hmacHex(signingKey(input.config.secretAccessKey, date.short), stringToSign)}`;
  return Object.freeze({
    url: `https://${host}${path}`,
    headers: Object.freeze({ ...unsignedHeaders, authorization }),
  });
}

function signPresignedTransfer(
  input: Readonly<{
    config: R2ObjectStoreConfig;
    method: "GET" | "PUT";
    bucket: string;
    objectKey: string;
    expiresInSeconds: number;
    contentType?: string;
    expectedSha256: string;
    now: Date;
  }>,
): SignedPrivateTransfer {
  const date = amzDate(input.now);
  const host = endpointHost(input.config);
  const path = canonicalObjectPath(input.bucket, input.objectKey);
  const signedHeaderValues: Record<string, string> = { host };
  const requiredHeaders: Record<string, string> = {};
  if (input.method === "PUT" && input.contentType !== undefined) {
    signedHeaderValues["content-type"] = input.contentType;
    signedHeaderValues["x-amz-meta-sha256"] = input.expectedSha256;
    requiredHeaders["content-type"] = input.contentType;
    requiredHeaders["x-amz-meta-sha256"] = input.expectedSha256;
  }
  const normalizedHeaders = canonicalHeaders(signedHeaderValues);
  const scope = `${date.short}/${REGION}/${SERVICE}/aws4_request`;
  const queryWithoutSignature = Object.freeze({
    "X-Amz-Algorithm": SIGNING_ALGORITHM,
    "X-Amz-Content-Sha256": UNSIGNED_PAYLOAD,
    "X-Amz-Credential": `${input.config.accessKeyId}/${scope}`,
    "X-Amz-Date": date.full,
    "X-Amz-Expires": String(input.expiresInSeconds),
    "X-Amz-SignedHeaders": normalizedHeaders.names,
  });
  const canonicalRequest = [
    input.method,
    path,
    canonicalQuery(queryWithoutSignature),
    normalizedHeaders.canonical,
    normalizedHeaders.names,
    UNSIGNED_PAYLOAD,
  ].join("\n");
  const stringToSign = [SIGNING_ALGORITHM, date.full, scope, sha256(canonicalRequest)].join("\n");
  const signature = hmacHex(signingKey(input.config.secretAccessKey, date.short), stringToSign);
  return Object.freeze({
    method: input.method,
    url: `https://${host}${path}?${canonicalQuery({ ...queryWithoutSignature, "X-Amz-Signature": signature })}`,
    requiredHeaders: Object.freeze(requiredHeaders),
    maximumBytes: 0,
    expectedSha256: input.expectedSha256,
    expiresAt: "",
  });
}

function classifyStatus(status: number): R2FailureClassification {
  if (status === 408 || status === 504) return "timeout";
  if (status === 429) return "rate_limited";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 409 || status === 412) return "conflict";
  return "provider_unavailable";
}

function defaultFetchTransport(
  url: string,
  init: Parameters<R2FetchTransport>[1],
): Promise<R2HttpResponse> {
  const { body, ...requestInit } = init;
  return fetch(url, {
    ...requestInit,
    ...(body === undefined
      ? {}
      : { body: typeof body === "string" ? body : Uint8Array.from(body).buffer }),
  });
}

function transferAuthorization(
  config: R2ObjectStoreConfig,
  bucket: string,
  request: StorageTransferRequest,
): string {
  return createHmac("sha256", config.secretAccessKey)
    .update(
      JSON.stringify({
        bucket,
        schemaVersion: request.schemaVersion,
        direction: request.direction,
        visibility: request.visibility,
        locationRef: request.locationRef,
        objectKey: request.objectKey,
        contentType: request.contentType,
        maximumBytes: request.maximumBytes,
        expectedSha256: request.expectedSha256,
        expiresAt: request.expiresAt,
      }),
    )
    .digest("base64url");
}

function verifyAuthorization(expected: string, received: unknown): boolean {
  if (typeof received !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(received)) return false;
  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(received, "utf8");
  return (
    expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
  );
}

function publicObjectKey(publicBaseUrl: string, unsafeUrl: string): string {
  const base = new URL(publicBaseUrl);
  const candidate = new URL(unsafeUrl);
  if (
    candidate.origin !== base.origin ||
    !candidate.pathname.startsWith(base.pathname) ||
    candidate.search !== "" ||
    candidate.hash !== ""
  ) {
    throw new R2ObjectStoreError("unauthorized");
  }
  const encodedKey = candidate.pathname.slice(base.pathname.length);
  let decodedKey: string;
  try {
    decodedKey = encodedKey
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    throw new R2ObjectStoreError("unauthorized");
  }
  const parsed = ObjectKeySchema.safeParse(decodedKey);
  if (
    !parsed.success ||
    !/^locations\/[a-f0-9]{64}\/campaigns\/[A-Za-z0-9_-]+\/[1-9]\d*\/[a-f0-9]{64}\.(?:html|pdf|png|jpg)$/u.test(
      parsed.data,
    )
  ) {
    throw new R2ObjectStoreError("unauthorized");
  }
  return parsed.data;
}

function artifactContentType(artifact: ArtifactRecord): string {
  return artifact.mimeType;
}

export function createR2ObjectStoreClient(
  unsafeConfig: unknown,
  dependencies: R2ObjectStoreDependencies = {},
): R2ObjectStoreClient {
  const config = parseConfig(unsafeConfig);
  const fetchTransport = dependencies.fetch ?? defaultFetchTransport;
  const now = dependencies.now ?? (() => new Date());

  const execute = async (
    input: Readonly<{
      method: "DELETE" | "HEAD" | "PUT";
      bucket: string;
      objectKey?: string;
      payload?: string | Uint8Array;
      headers?: Readonly<Record<string, string>>;
      signal?: AbortSignal;
    }>,
  ): Promise<R2HttpResponse> => {
    const payload = input.payload ?? "";
    const signed = signRequest({
      config,
      method: input.method,
      bucket: input.bucket,
      ...(input.objectKey === undefined ? {} : { objectKey: input.objectKey }),
      payload,
      ...(input.headers === undefined ? {} : { headers: input.headers }),
      now: now(),
    });
    const abortContext = createAbortContext({
      controller: new AbortController(),
      timeoutMilliseconds: config.requestTimeoutMs,
      timeoutReason: new Error("R2 request timeout"),
      ...(input.signal === undefined ? {} : { externalSignal: input.signal }),
      scheduleTimeout: setTimeout,
      cancelTimeout: clearTimeout,
    });
    try {
      return await raceWithAbort(
        fetchTransport(signed.url, {
          method: input.method,
          headers: signed.headers,
          ...(input.payload === undefined ? {} : { body: input.payload }),
          signal: abortContext.signal,
        }),
        abortContext.signal,
      );
    } catch (error) {
      const classification =
        abortContext.signal.aborted || (error instanceof Error && error.name === "AbortError")
          ? "timeout"
          : "provider_unavailable";
      throw new R2ObjectStoreError(classification);
    } finally {
      abortContext.dispose();
    }
  };

  const assertSuccessful = (response: R2HttpResponse, accepted: readonly number[]): void => {
    if (!accepted.includes(response.status)) {
      throw new R2ObjectStoreError(classifyStatus(response.status), response.status);
    }
  };

  const verifyObjectMetadata = async (
    input: Readonly<{
      bucket: string;
      objectKey: string;
      sha256: string;
      byteSize?: number;
    }>,
  ): Promise<void> => {
    const response = await execute({
      method: "HEAD",
      bucket: input.bucket,
      objectKey: input.objectKey,
    });
    assertSuccessful(response, [200]);
    if (response.headers.get("x-amz-meta-sha256") !== input.sha256) {
      throw new R2ObjectStoreError("conflict", response.status);
    }
    if (input.byteSize !== undefined) {
      const contentLength = Number(response.headers.get("content-length"));
      if (!Number.isSafeInteger(contentLength) || contentLength !== input.byteSize) {
        throw new R2ObjectStoreError("conflict", response.status);
      }
    }
  };

  const putImmutableAudit = async (
    bucket: string,
    objectKey: string,
    payload: string,
    recordSha256: string,
  ): Promise<void> => {
    const response = await execute({
      method: "PUT",
      bucket,
      objectKey,
      payload,
      headers: Object.freeze({
        "content-type": "application/json",
        "if-none-match": "*",
        "x-amz-meta-record-sha256": recordSha256,
      }),
    });
    if (response.status === 412) {
      const existing = await execute({ method: "HEAD", bucket, objectKey });
      assertSuccessful(existing, [200]);
      if (existing.headers.get("x-amz-meta-record-sha256") !== recordSha256) {
        throw new R2ObjectStoreError("conflict", existing.status);
      }
      return;
    }
    assertSuccessful(response, [200, 201, 204]);
  };

  const client: R2ObjectStoreClient = {
    async probe(signal) {
      try {
        const responses = await Promise.all(
          [config.privateBucket, config.publicBucket].map((bucket) =>
            execute({ method: "HEAD", bucket, ...(signal === undefined ? {} : { signal }) }),
          ),
        );
        const failed = responses.find((response) => response.status !== 200);
        return failed === undefined
          ? Object.freeze({ status: "ready" as const })
          : Object.freeze({
              status: "unavailable" as const,
              classification: classifyStatus(failed.status),
            });
      } catch (error) {
        return Object.freeze({
          status: "unavailable" as const,
          classification:
            error instanceof R2ObjectStoreError
              ? error.classification
              : ("provider_unavailable" as const),
        });
      }
    },

    async store(unsafeInput) {
      const input = PrivateArtifactWriteSchema.parse(unsafeInput);
      const actualSha256 = createHash("sha256").update(input.bytes).digest("hex");
      if (actualSha256 !== input.sha256) throw new R2ObjectStoreError("conflict");
      const extension =
        input.mimeType === "text/html"
          ? "html"
          : input.mimeType === "application/pdf"
            ? "pdf"
            : input.mimeType === "image/png"
              ? "png"
              : "jpg";
      const objectKey = privateArtifactKey({
        locationRef: input.locationRef,
        campaignRef: input.campaignRef,
        campaignVersionRef: input.campaignVersionRef,
        artifactRef: input.artifactRef,
        sha256: input.sha256,
        extension,
      });
      const response = await execute({
        method: "PUT",
        bucket: config.privateBucket,
        objectKey,
        payload: input.bytes,
        headers: Object.freeze({
          "content-type": input.mimeType,
          "if-none-match": "*",
          "x-amz-meta-artifact-ref": input.artifactRef,
          "x-amz-meta-artifact-type": input.artifactType,
          "x-amz-meta-campaign-ref": input.campaignRef,
          "x-amz-meta-campaign-version-ref": input.campaignVersionRef,
          "x-amz-meta-location-ref": input.locationRef,
          "x-amz-meta-sha256": input.sha256,
        }),
      });
      if (response.status !== 412) assertSuccessful(response, [200, 201, 204]);
      await verifyObjectMetadata({
        bucket: config.privateBucket,
        objectKey,
        sha256: input.sha256,
        byteSize: input.bytes.byteLength,
      });
      return objectKey;
    },

    async authorizePrivateTransfer(input) {
      const request = StorageTransferRequestSchema.parse(input.request);
      if (
        input.bucket !== config.privateBucket ||
        !request.objectKey.startsWith(`locations/${request.locationRef}/`)
      ) {
        throw new R2ObjectStoreError("unauthorized");
      }
      const expiresAtMs = new Date(request.expiresAt).getTime();
      const remainingMs = expiresAtMs - now().getTime();
      if (remainingMs <= 0 || remainingMs > 10 * 60 * 1_000) {
        throw new R2ObjectStoreError("unauthorized");
      }
      return Object.freeze({
        bucket: config.privateBucket,
        objectKey: request.objectKey,
        visibility: "private",
        publicReadUrl: null,
        publicBucketPath: null,
        authorization: transferAuthorization(config, config.privateBucket, request),
        expiresAt: request.expiresAt,
      });
    },

    createSignedPrivateTransfer(input) {
      const request = StorageTransferRequestSchema.parse(input.request);
      if (
        input.bucket !== config.privateBucket ||
        !request.objectKey.startsWith(`locations/${request.locationRef}/`) ||
        !verifyAuthorization(
          transferAuthorization(config, config.privateBucket, request),
          input.authorization,
        )
      ) {
        throw new R2ObjectStoreError("unauthorized");
      }
      const currentTime = now();
      const expiresInSeconds = Math.ceil(
        (new Date(request.expiresAt).getTime() - currentTime.getTime()) / 1_000,
      );
      if (expiresInSeconds < 1 || expiresInSeconds > 600) {
        throw new R2ObjectStoreError("unauthorized");
      }
      const signed = signPresignedTransfer({
        config,
        method: request.direction === "upload" ? "PUT" : "GET",
        bucket: config.privateBucket,
        objectKey: request.objectKey,
        expiresInSeconds,
        ...(request.direction === "upload" ? { contentType: request.contentType } : {}),
        expectedSha256: request.expectedSha256,
        now: currentTime,
      });
      return Object.freeze({
        ...signed,
        maximumBytes: request.maximumBytes,
        expectedSha256: request.expectedSha256,
        expiresAt: request.expiresAt,
      });
    },

    async copyApprovedPrivateArtifact(input) {
      const artifact = ArtifactRecordSchema.parse(input.artifact);
      const publishedKey = ObjectKeySchema.parse(input.publishedKey);
      const extension =
        artifact.mimeType === "text/html"
          ? "html"
          : artifact.mimeType === "application/pdf"
            ? "pdf"
            : artifact.mimeType === "image/png"
              ? "png"
              : "jpg";
      const expectedPublishedSuffix = `/${artifact.sha256}.${extension}`;
      const tenantNamespace = createHash("sha256").update(artifact.locationRef).digest("hex");
      if (
        input.privateBucket !== config.privateBucket ||
        input.publicBucket !== config.publicBucket ||
        !artifact.storageKey.startsWith(`locations/${artifact.locationRef}/`) ||
        !publishedKey.startsWith(`locations/${tenantNamespace}/campaigns/`) ||
        !/^locations\/[a-f0-9]{64}\/campaigns\/[A-Za-z0-9_-]{8,128}\/[1-9]\d*\//u.test(
          publishedKey,
        ) ||
        !publishedKey.endsWith(expectedPublishedSuffix)
      ) {
        throw new R2ObjectStoreError("unauthorized");
      }
      const response = await execute({
        method: "PUT",
        bucket: config.publicBucket,
        objectKey: publishedKey,
        headers: Object.freeze({
          "cache-control": "public, max-age=31536000, immutable",
          "cf-copy-destination-if-none-match": "*",
          "content-type": artifactContentType(artifact),
          "x-amz-copy-source": canonicalObjectPath(config.privateBucket, artifact.storageKey),
          "x-amz-meta-artifact-ref": artifact.artifactRef,
          "x-amz-meta-campaign-version-ref": artifact.campaignVersionRef,
          "x-amz-meta-sha256": artifact.sha256,
          "x-amz-metadata-directive": "REPLACE",
        }),
      });
      if (response.status !== 412) assertSuccessful(response, [200]);
      await verifyObjectMetadata({
        bucket: config.publicBucket,
        objectKey: publishedKey,
        sha256: artifact.sha256,
        byteSize: artifact.byteSize,
      });
      return Object.freeze({
        sourceBucket: config.privateBucket,
        sourceKey: artifact.storageKey,
        destinationBucket: config.publicBucket,
        destinationKey: publishedKey,
        visibility: "public",
        immutableUrl: new URL(
          publishedKey.split("/").map(encodeRfc3986).join("/"),
          config.publicBaseUrl,
        ).toString(),
        sha256: artifact.sha256,
        artifactRef: artifact.artifactRef,
        campaignVersionRef: artifact.campaignVersionRef,
      });
    },

    async quarantinePartialPublication(unsafeInput) {
      const input = QuarantineInputSchema.parse(unsafeInput);
      if (input.publicBucket !== config.publicBucket) {
        throw new R2ObjectStoreError("unauthorized");
      }
      const expectedPrefix = publishedArtifactPrefix(input);
      const quarantinedKeys = [...new Set(input.attemptedKeys)].toSorted();
      if (quarantinedKeys.some((key) => !key.startsWith(expectedPrefix))) {
        throw new R2ObjectStoreError("unauthorized");
      }
      for (const objectKey of quarantinedKeys) {
        const response = await execute({
          method: "DELETE",
          bucket: config.publicBucket,
          objectKey,
        });
        assertSuccessful(response, [200, 204, 404]);
      }
      return Object.freeze({
        status: "quarantined",
        publicBucket: config.publicBucket,
        locationRef: input.locationRef,
        publicCampaignId: input.publicCampaignId,
        campaignVersionRef: input.campaignVersionRef,
        publishedVersion: input.publishedVersion,
        quarantinedKeys,
        idempotencyKey: input.idempotencyKey,
        problemCode: input.problemCode,
      });
    },

    async withdrawExactProjectionAndAppendImmutableAudit(input) {
      const projection = PublishedCampaignProjectionSchema.parse(input.projection);
      const record: ProjectionWithdrawalRecord = WithdrawalRecordSchema.parse(input.record);
      if (
        record.publicCampaignId !== projection.publicCampaignId ||
        record.campaignVersionRef !== projection.campaignVersionRef
      ) {
        throw new R2ObjectStoreError("conflict");
      }
      const keys = Object.values(projection.artifactUrls)
        .map((url) => publicObjectKey(config.publicBaseUrl, url))
        .toSorted();
      for (const objectKey of keys) {
        const response = await execute({
          method: "DELETE",
          bucket: config.publicBucket,
          objectKey,
        });
        assertSuccessful(response, [200, 204, 404]);
      }
      const payload = JSON.stringify(record);
      const recordSha256 = sha256(payload);
      const auditKey = `audit/withdrawals/${projection.publicCampaignId}/${projection.campaignVersionRef}/${recordSha256}.json`;
      await putImmutableAudit(config.privateBucket, auditKey, payload, recordSha256);
      return Object.freeze({
        auditRef: `audit_${recordSha256.slice(0, 24)}`,
        immutable: true,
        recordSha256,
        publicCampaignId: projection.publicCampaignId,
        campaignVersionRef: projection.campaignVersionRef,
      });
    },
  };
  return Object.freeze(client);
}
