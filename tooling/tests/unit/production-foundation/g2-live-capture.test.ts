import { describe, expect, it } from "vitest";

import {
  LiveCaptureAuthorizationError,
  LiveCaptureDisabledError,
  OALO_GHL_LIVE_CAPTURE_AUTHORIZED,
  OALO_GHL_LIVE_CAPTURE_ENV,
  createLiveCaptureAdapter,
  isLiveCaptureAuthorized,
} from "../../../../packages/ghl/src/live-capture.js";
import {
  G2_MATRIX_GATE_ID,
  getG2MatrixCase,
  listG2MatrixCases,
} from "../../../../packages/ghl/src/g2-matrix.js";
import { UnsafeFixtureError } from "../../../../packages/ghl/src/sanitization.js";

describe("G2 matrix catalog", () => {
  it("lists nine distinct App Test cases", () => {
    const cases = listG2MatrixCases();
    expect(cases).toHaveLength(9);
    expect(new Set(cases.map((entry) => entry.caseId)).size).toBe(9);
    expect(G2_MATRIX_GATE_ID).toBe("G2");
  });

  it("resolves known case ids and rejects unknown ones", () => {
    const roleCase = getG2MatrixCase("role_resolution");
    expect(roleCase.method).toBe("GET");
    expect(roleCase.path).toBe("/sessions/ghl/role");

    expect(() => getG2MatrixCase("not_a_real_case")).toThrow(/Unknown G2 matrix caseId/);
  });
});

describe("G2 live capture authorization seam (unit)", () => {
  it("reports authorization only for the exact authorized flag", () => {
    expect(isLiveCaptureAuthorized({})).toBe(false);
    expect(isLiveCaptureAuthorized({ [OALO_GHL_LIVE_CAPTURE_ENV]: "true" })).toBe(false);
    expect(
      isLiveCaptureAuthorized({
        [OALO_GHL_LIVE_CAPTURE_ENV]: OALO_GHL_LIVE_CAPTURE_AUTHORIZED,
      }),
    ).toBe(true);
  });

  it("stays fail-closed by default", async () => {
    const adapter = createLiveCaptureAdapter({});
    expect(adapter.mode).toBe("disabled");
    await expect(adapter.capture()).rejects.toBeInstanceOf(LiveCaptureDisabledError);
    expect(new LiveCaptureDisabledError().name).toBe("LiveCaptureDisabledError");
  });

  it("captures sanitized App Test observations when authorized", async () => {
    const adapter = createLiveCaptureAdapter({
      [OALO_GHL_LIVE_CAPTURE_ENV]: OALO_GHL_LIVE_CAPTURE_AUTHORIZED,
    });
    expect(adapter.mode).toBe("authorized");
    if (adapter.mode !== "authorized") {
      throw new Error("expected authorized adapter");
    }

    const postRecord = await adapter.capture({
      caseId: "signed_custom_page_context",
      httpStatus: 200,
      requestBody: { encryptedContextRef: "apptest_context_001" },
      responseBody: {
        sessionCreated: true,
        audience: "location_admin",
        locationBound: true,
      },
      safeProviderIds: {
        contextRef: "apptest_context_001",
        locationRef: "apptest_location_001",
      },
      grantedScopes: ["locations.readonly"],
      captureNotes: "App Test signed context accepted for controlled location.",
      capturedAt: "2026-08-25T20:00:00.000Z",
    });

    expect(postRecord.source).toBe("sanitized-live-capture");
    expect(postRecord.provider.environment).toBe("app-test");
    expect(postRecord.evidence.externalStatus).toBe("CAPTURED_SANITIZED");
    expect(postRecord.gateId).toBe("G2");
    expect(postRecord.request.transport).toBe("fixture-replay");
    expect(postRecord.request.method).toBe("POST");
    expect(postRecord.request.headers["Content-Type"]).toBe("application/json");

    const getRecord = await adapter.capture({
      caseId: "role_resolution",
      httpStatus: 200,
      responseBody: { role: "location_admin", locationBound: true },
      safeProviderIds: { locationRef: "apptest_location_001" },
      grantedScopes: ["users.readonly"],
      captureNotes: "App Test role resolution for controlled location.",
      capturedAt: "2026-08-25T20:05:00.000Z",
    });

    expect(getRecord.request.method).toBe("GET");
    expect(getRecord.request.headers["Content-Type"]).toBeUndefined();
  });

  it("requires an observation payload when authorized", async () => {
    const adapter = createLiveCaptureAdapter({
      [OALO_GHL_LIVE_CAPTURE_ENV]: OALO_GHL_LIVE_CAPTURE_AUTHORIZED,
    });
    if (adapter.mode !== "authorized") {
      throw new Error("expected authorized adapter");
    }

    await expect(adapter.capture()).rejects.toBeInstanceOf(LiveCaptureAuthorizationError);
    expect(new LiveCaptureAuthorizationError("revoked").name).toBe("LiveCaptureAuthorizationError");
  });

  it("rejects when authorization is revoked on the env object mid-session", async () => {
    const env: Record<string, string | undefined> = {
      [OALO_GHL_LIVE_CAPTURE_ENV]: OALO_GHL_LIVE_CAPTURE_AUTHORIZED,
    };
    const adapter = createLiveCaptureAdapter(env);
    if (adapter.mode !== "authorized") {
      throw new Error("expected authorized adapter");
    }

    env[OALO_GHL_LIVE_CAPTURE_ENV] = "disabled";
    await expect(
      adapter.capture({
        caseId: "refresh_rotation",
        httpStatus: 200,
        responseBody: { rotated: true },
        captureNotes: "should fail after revoke",
      }),
    ).rejects.toBeInstanceOf(LiveCaptureAuthorizationError);
  });

  it("rejects secret-bearing observations even when authorized", async () => {
    const adapter = createLiveCaptureAdapter({
      [OALO_GHL_LIVE_CAPTURE_ENV]: OALO_GHL_LIVE_CAPTURE_AUTHORIZED,
    });
    if (adapter.mode !== "authorized") {
      throw new Error("expected authorized adapter");
    }

    await expect(
      adapter.capture({
        caseId: "oauth_callback_success",
        httpStatus: 200,
        responseBody: { accessToken: "must-not-persist" },
        captureNotes: "must fail sanitization",
      }),
    ).rejects.toBeInstanceOf(UnsafeFixtureError);
  });
});
