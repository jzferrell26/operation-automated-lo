import { describe, expect, it } from "vitest";

import { listG2MatrixCases } from "../../../packages/ghl/src/g2-matrix.js";
import {
  LiveCaptureDisabledError,
  OALO_GHL_LIVE_CAPTURE_AUTHORIZED,
  OALO_GHL_LIVE_CAPTURE_ENV,
  createLiveCaptureAdapter,
} from "../../../packages/ghl/src/live-capture.js";
import { UnsafeFixtureError } from "../../../packages/ghl/src/sanitization.js";

describe("G2 live capture authorization seam", () => {
  it("stays disabled by default", async () => {
    const adapter = createLiveCaptureAdapter({});

    expect(adapter.mode).toBe("disabled");
    await expect(adapter.capture()).rejects.toBeInstanceOf(LiveCaptureDisabledError);
  });

  it("rejects unauthorized env values", async () => {
    const adapter = createLiveCaptureAdapter({
      [OALO_GHL_LIVE_CAPTURE_ENV]: "true",
    });

    expect(adapter.mode).toBe("disabled");
    await expect(adapter.capture()).rejects.toThrow(/OALO_GHL_LIVE_CAPTURE=authorized/);
  });

  it("captures a sanitized App Test observation when authorized", async () => {
    const adapter = createLiveCaptureAdapter({
      [OALO_GHL_LIVE_CAPTURE_ENV]: OALO_GHL_LIVE_CAPTURE_AUTHORIZED,
    });

    expect(adapter.mode).toBe("authorized");
    if (adapter.mode !== "authorized") {
      throw new Error("expected authorized adapter");
    }

    const record = await adapter.capture({
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
      grantedScopes: ["locations.readonly", "users.readonly"],
      captureNotes: "App Test signed context accepted for controlled location.",
      capturedAt: "2026-08-25T20:00:00.000Z",
    });

    expect(record.source).toBe("sanitized-live-capture");
    expect(record.provider.environment).toBe("app-test");
    expect(record.evidence.externalStatus).toBe("CAPTURED_SANITIZED");
    expect(record.gateId).toBe("G2");
    expect(record.caseId).toBe("signed_custom_page_context");
    expect(record.request.transport).toBe("fixture-replay");
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

  it("covers the full G2 matrix case catalog", () => {
    const cases = listG2MatrixCases();
    expect(cases).toHaveLength(9);
    expect(new Set(cases.map((entry) => entry.caseId)).size).toBe(9);
  });
});
