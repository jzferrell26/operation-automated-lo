import { describe, expect, it } from "vitest";
import { CorrelationReferenceSchema, OpaqueReferenceSchema } from "@oalo/contracts";

import {
  CampaignPrincipalInvalidError,
  createCampaignTenantContext,
  type AuthenticatedPrincipal,
} from "@oalo/application";

import {
  CORRELATION_REFERENCE_HEADER,
  TRACING_ID_HEADER,
  correlationReferenceForRequest,
  withCorrelationHeaders,
} from "./correlation-boundary.js";

function request(headers: HeadersInit = {}): Request {
  return new Request("https://app.operation-automated-lo.test/api/campaigns/approve", {
    method: "POST",
    headers,
  });
}

const principal: AuthenticatedPrincipal = {
  actorRef: "principal_correlationBoundary001",
  actorId: "00000000-0000-4000-8000-000000000901",
  locationRef: "location_correlationBoundary001",
  locationId: "00000000-0000-4000-8000-000000000902",
  installationRef: "installation_correlationBoundary001",
  role: "campaign_approver",
  roleVersion: 1,
  sessionId: "session_correlationBoundary001",
  authenticationMode: "embedded",
};

describe("correlationReferenceForRequest", () => {
  const acceptedHeaders = [
    "correlation_review123",
    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "trace-123",
    "a.b:c/d-e",
    "a".repeat(129),
  ];

  it.each(acceptedHeaders)(
    "derives a canonical, schema-valid reference and echoes an accepted tracing header %s",
    (header) => {
      const result = correlationReferenceForRequest(
        request({ "x-correlation-id": header }),
        "approve",
      );
      expect(CorrelationReferenceSchema.safeParse(result.correlationRef).success).toBe(true);
      expect(result.correlationRef.startsWith("correlation_approve_")).toBe(true);
      expect(result.tracingId).toBe(header);
    },
  );

  it("produces a canonical reference and no tracing id when the header is absent", () => {
    const result = correlationReferenceForRequest(request(), "preflight");
    expect(CorrelationReferenceSchema.safeParse(result.correlationRef).success).toBe(true);
    expect(result.correlationRef.startsWith("correlation_preflight_")).toBe(true);
    expect(result.tracingId).toBeUndefined();
  });

  it("produces a canonical reference and no tracing id when the header exceeds 300 characters", () => {
    const overLength = "a".repeat(301);
    const result = correlationReferenceForRequest(
      request({ "x-correlation-id": overLength }),
      "approve",
    );
    expect(CorrelationReferenceSchema.safeParse(result.correlationRef).success).toBe(true);
    expect(result.tracingId).toBeUndefined();
  });

  it("derives the same reference for the same tracing header (retry-stable)", () => {
    const first = correlationReferenceForRequest(
      request({ "x-correlation-id": "trace-123" }),
      "approve",
    );
    const second = correlationReferenceForRequest(
      request({ "x-correlation-id": "trace-123" }),
      "approve",
    );
    expect(second.correlationRef).toBe(first.correlationRef);
  });

  it("derives different references for different requests without a tracing header", () => {
    const first = correlationReferenceForRequest(request(), "approve");
    const second = correlationReferenceForRequest(request(), "approve");
    expect(second.correlationRef).not.toBe(first.correlationRef);
  });
});

describe("withCorrelationHeaders", () => {
  it("always sets the canonical reference header and echoes an accepted tracing id", () => {
    const correlation = correlationReferenceForRequest(
      request({ "x-correlation-id": "correlation_review123" }),
      "approve",
    );
    const response = withCorrelationHeaders(Response.json({ ok: true }), correlation);
    expect(response.headers.get(CORRELATION_REFERENCE_HEADER)).toBe(correlation.correlationRef);
    expect(response.headers.get(TRACING_ID_HEADER)).toBe("correlation_review123");
  });

  it("sets the canonical reference header without echoing a rejected or absent tracing id", () => {
    const correlation = correlationReferenceForRequest(request(), "approve");
    const response = withCorrelationHeaders(Response.json({ ok: true }), correlation);
    expect(response.headers.get(CORRELATION_REFERENCE_HEADER)).toBe(correlation.correlationRef);
    expect(response.headers.get(TRACING_ID_HEADER)).toBeNull();
  });

  it("attaches headers to an error response the same way as a success response", () => {
    const correlation = correlationReferenceForRequest(request(), "approve");
    const response = withCorrelationHeaders(
      Response.json({ error: "FORBIDDEN" }, { status: 403 }),
      correlation,
    );
    expect(response.status).toBe(403);
    expect(response.headers.get(CORRELATION_REFERENCE_HEADER)).toBe(correlation.correlationRef);
  });
});

describe("application boundary adoption of the shared correlation schema", () => {
  it("throws CampaignPrincipalInvalidError for a UUID-shaped correlation id, which the wide pattern used to accept", () => {
    const uuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    // The tracing pattern the HTTP boundary reads headers with still accepts a UUID; the
    // canonical schema deliberately does not, so a UUID must never reach the application
    // boundary as a stored correlation reference.
    expect(() => createCampaignTenantContext(principal, uuid)).toThrow(
      CampaignPrincipalInvalidError,
    );
  });

  it("accepts a canonical correlation reference at the application boundary", () => {
    const context = createCampaignTenantContext(principal, "correlation_approve_test001");
    expect(context.correlationId).toBe("correlation_approve_test001");
  });
});

describe("correlation schema regex is unchanged", () => {
  it("pins CorrelationReferenceSchema to the same instance as OpaqueReferenceSchema (D1)", () => {
    expect(CorrelationReferenceSchema).toBe(OpaqueReferenceSchema);
  });

  it("pins the opaque contract's accept/reject boundary so no future edit widens it silently", () => {
    expect(OpaqueReferenceSchema.safeParse("short").success).toBe(false);
    expect(OpaqueReferenceSchema.safeParse("correlation_review123").success).toBe(true);
    expect(OpaqueReferenceSchema.safeParse("3fa85f64-5717-4562-b3fc-2c963f66afa6").success).toBe(
      false,
    );
    expect(OpaqueReferenceSchema.safeParse("trace-123").success).toBe(false);
    expect(OpaqueReferenceSchema.safeParse(`correlation_${"a".repeat(120)}`).success).toBe(false);
    expect(OpaqueReferenceSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});
