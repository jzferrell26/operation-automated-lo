import { createHash } from "node:crypto";

import { z } from "zod";

import { canonicalizeJson } from "./canonical-json.js";

import { assertFixtureIsSanitized, assertFixtureOnlyRequest } from "./sanitization.js";

export const GHL_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const GHL_EVIDENCE_FIXTURE_VERSION = "ghl-app-test-evidence-v1" as const;

const SafeIdentifierSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,95}$/);
const SafeHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const SafePathSchema = z
  .string()
  .startsWith("/")
  .refine((path) => !path.includes("?"), "Fixture paths must not contain query strings.");

export const GhlFixtureRequestSchema = z
  .object({
    transport: z.literal("fixture-replay"),
    method: z.enum(["GET", "POST"]),
    actionClass: z.enum(["READ_ONLY", "SESSION_EXCHANGE", "SIMULATED_WRITE"]),
    path: SafePathSchema,
    headers: z
      .object({
        Accept: z.literal("application/json"),
        Version: z.literal("2021-07-28"),
        "Content-Type": z.literal("application/json").optional(),
      })
      .strict(),
    body: z.record(z.string(), z.json()).optional(),
  })
  .strict();

export const GhlFixtureResponseSchema = z
  .object({
    httpStatus: z.number().int().min(100).max(599),
    body: z.record(z.string(), z.json()),
  })
  .strict();

export const GhlEvidenceRecordSchema = z
  .object({
    schemaVersion: z.literal(GHL_EVIDENCE_SCHEMA_VERSION),
    fixtureVersion: z.literal(GHL_EVIDENCE_FIXTURE_VERSION),
    fixtureId: SafeIdentifierSchema,
    gateId: z.enum(["G1", "G2", "G3", "G4", "G5", "G6"]),
    caseId: SafeIdentifierSchema,
    source: z.literal("synthetic-fixture"),
    capturedAt: z.string().datetime({ offset: true }),
    provider: z
      .object({
        name: z.literal("highlevel"),
        apiVersion: z.literal("2021-07-28"),
        environment: z.literal("synthetic"),
      })
      .strict(),
    request: GhlFixtureRequestSchema,
    response: GhlFixtureResponseSchema,
    evidence: z
      .object({
        externalStatus: z.literal("BLOCKED"),
        blockerReason: z.string().min(1).max(500),
        requiredExternalEvidence: z.array(z.string().min(1).max(300)).min(1),
        safeProviderIds: z.record(z.string(), SafeIdentifierSchema),
        grantedScopes: z.array(z.string().regex(/^[A-Za-z0-9./_-]+$/)),
        observedAccountState: z.enum([
          "synthetic",
          "install-required",
          "meta-test-assets-required",
          "stripe-test-required",
          "marketplace-review-required",
        ]),
        requestHash: SafeHashSchema,
        responseHash: SafeHashSchema,
      })
      .strict(),
  })
  .strict();

export type GhlEvidenceRecord = z.infer<typeof GhlEvidenceRecordSchema>;
export type GhlFixtureRequest = z.infer<typeof GhlFixtureRequestSchema>;
export type GhlFixtureResponse = z.infer<typeof GhlFixtureResponseSchema>;

export type EvidenceRecordInput = Omit<GhlEvidenceRecord, "evidence"> & {
  readonly evidence: Omit<GhlEvidenceRecord["evidence"], "requestHash" | "responseHash">;
};

export function hashFixtureValue(value: unknown): `sha256:${string}` {
  const canonical = JSON.stringify(canonicalizeJson(z.json().parse(value)));
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function createEvidenceRecord(input: EvidenceRecordInput): GhlEvidenceRecord {
  assertFixtureOnlyRequest(input.request);
  assertFixtureIsSanitized(input);

  return GhlEvidenceRecordSchema.parse({
    ...input,
    evidence: {
      ...input.evidence,
      requestHash: hashFixtureValue(input.request),
      responseHash: hashFixtureValue(input.response),
    },
  });
}

export function replayEvidenceRecord(value: unknown): GhlEvidenceRecord {
  assertFixtureIsSanitized(value);
  const record = GhlEvidenceRecordSchema.parse(value);
  assertFixtureOnlyRequest(record.request);

  if (record.evidence.requestHash !== hashFixtureValue(record.request)) {
    throw new Error(`Request fixture hash mismatch for ${record.fixtureId}.`);
  }
  if (record.evidence.responseHash !== hashFixtureValue(record.response)) {
    throw new Error(`Response fixture hash mismatch for ${record.fixtureId}.`);
  }

  return record;
}
