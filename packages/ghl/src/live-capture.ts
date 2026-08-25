import { z } from "zod";

import {
  createEvidenceRecord,
  type GhlEvidenceRecord,
  type GhlFixtureRequest,
  type GhlFixtureResponse,
} from "./evidence.js";
import { G2_MATRIX_GATE_ID, getG2MatrixCase, type G2MatrixCaseId } from "./g2-matrix.js";
import { assertFixtureIsSanitized } from "./sanitization.js";

export const OALO_GHL_LIVE_CAPTURE_ENV = "OALO_GHL_LIVE_CAPTURE" as const;
export const OALO_GHL_LIVE_CAPTURE_AUTHORIZED = "authorized" as const;

export class LiveCaptureDisabledError extends Error {
  public constructor() {
    super(
      "Live HighLevel capture is disabled unless OALO_GHL_LIVE_CAPTURE=authorized. Use sanitized fixture replay; external evidence remains BLOCKED without App Test authorization.",
    );
    this.name = "LiveCaptureDisabledError";
  }
}

export class LiveCaptureAuthorizationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LiveCaptureAuthorizationError";
  }
}

const JsonValueSchema = z.json();
const SafeObservationBodySchema = z.record(z.string(), JsonValueSchema);

export const LiveCaptureObservationSchema = z
  .object({
    caseId: z.string().min(3).max(95),
    httpStatus: z.number().int().min(100).max(599),
    requestBody: SafeObservationBodySchema.optional(),
    responseBody: SafeObservationBodySchema,
    safeProviderIds: z.record(z.string(), z.string().regex(/^[a-z][a-z0-9_-]{2,95}$/)).default({}),
    grantedScopes: z.array(z.string().regex(/^[A-Za-z0-9./_-]+$/)).default([]),
    captureNotes: z.string().min(1).max(500),
    capturedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export type LiveCaptureObservation = z.infer<typeof LiveCaptureObservationSchema>;

export type LiveCaptureEnv = Readonly<Record<string, string | undefined>>;

export function isLiveCaptureAuthorized(env: LiveCaptureEnv = process.env): boolean {
  return env[OALO_GHL_LIVE_CAPTURE_ENV] === OALO_GHL_LIVE_CAPTURE_AUTHORIZED;
}

export interface DisabledLiveCaptureAdapter {
  readonly mode: "disabled";
  capture(observation?: unknown): Promise<never>;
}

export interface AuthorizedLiveCaptureAdapter {
  readonly mode: "authorized";
  capture(observation: unknown): Promise<GhlEvidenceRecord>;
}

export type LiveCaptureAdapter = DisabledLiveCaptureAdapter | AuthorizedLiveCaptureAdapter;

type JsonRecord = GhlFixtureRequest["body"];

function buildFixtureRequest(
  caseId: G2MatrixCaseId,
  requestBody: JsonRecord | undefined,
): GhlFixtureRequest {
  const matrixCase = getG2MatrixCase(caseId);
  const headers =
    matrixCase.method === "GET"
      ? ({
          Accept: "application/json" as const,
          Version: "2021-07-28" as const,
        } as const)
      : ({
          Accept: "application/json" as const,
          Version: "2021-07-28" as const,
          "Content-Type": "application/json" as const,
        } as const);

  return {
    transport: "fixture-replay",
    method: matrixCase.method,
    actionClass: matrixCase.actionClass,
    path: matrixCase.path,
    headers,
    ...(requestBody ? { body: requestBody } : {}),
  };
}

function buildFixtureResponse(
  httpStatus: number,
  responseBody: NonNullable<JsonRecord>,
): GhlFixtureResponse {
  return {
    httpStatus,
    body: responseBody,
  };
}

function captureAuthorized(observationInput: unknown): GhlEvidenceRecord {
  const observation = LiveCaptureObservationSchema.parse(observationInput);
  const matrixCase = getG2MatrixCase(observation.caseId);
  const caseId = matrixCase.caseId;

  const request = buildFixtureRequest(caseId, observation.requestBody);
  const response = buildFixtureResponse(observation.httpStatus, observation.responseBody);

  const draft = {
    schemaVersion: 1 as const,
    fixtureVersion: "ghl-app-test-evidence-v1" as const,
    fixtureId: `g2_${caseId}_captured`,
    gateId: G2_MATRIX_GATE_ID,
    caseId,
    source: "sanitized-live-capture" as const,
    capturedAt: observation.capturedAt ?? new Date().toISOString(),
    provider: {
      name: "highlevel" as const,
      apiVersion: "2021-07-28" as const,
      environment: "app-test" as const,
    },
    request,
    response,
    evidence: {
      externalStatus: "CAPTURED_SANITIZED" as const,
      captureNotes: observation.captureNotes,
      requiredExternalEvidence: [] as string[],
      safeProviderIds: observation.safeProviderIds,
      grantedScopes: observation.grantedScopes,
      observedAccountState: "app-test-captured" as const,
    },
  };

  assertFixtureIsSanitized(draft);
  return createEvidenceRecord(draft);
}

export function createLiveCaptureAdapter(
  env: LiveCaptureEnv = process.env,
): LiveCaptureAdapter {
  if (!isLiveCaptureAuthorized(env)) {
    return Object.freeze({
      mode: "disabled" as const,
      capture: async () => {
        throw new LiveCaptureDisabledError();
      },
    });
  }

  return Object.freeze({
    mode: "authorized" as const,
    capture: async (observation: unknown) => {
      if (!isLiveCaptureAuthorized(env)) {
        throw new LiveCaptureAuthorizationError(
          "Live capture authorization was revoked during the session.",
        );
      }
      return captureAuthorized(observation);
    },
  });
}
