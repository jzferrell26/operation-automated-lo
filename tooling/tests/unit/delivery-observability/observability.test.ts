import {
  createCorrelationContext,
  getCorrelationContext,
  parseTraceparent,
  runWithCorrelationContext,
  toOtelCorrelationAttributes,
} from "../../../../packages/observability/src/correlation.js";
import {
  redactStructuredValue,
  serializeStructuredLogRecord,
} from "../../../../packages/observability/src/redaction.js";
import { describe, expect, it } from "vitest";

describe("correlation and redaction primitives", () => {
  it("parses W3C trace context and exports OTel attributes", () => {
    const traceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const context = createCorrelationContext({
      correlationId: "corr_trace_test_001",
      traceparent,
    });

    expect(parseTraceparent(traceparent).traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(toOtelCorrelationAttributes(context)).toEqual({
      "oalo.correlation.id": "corr_trace_test_001",
      "trace.id": "4bf92f3577b34da6a3ce929d0e0e4736",
      "span.id": "00f067aa0ba902b7",
    });
  });

  it("rejects all-zero W3C identifiers", () => {
    expect(() =>
      parseTraceparent("00-00000000000000000000000000000000-0000000000000000-01"),
    ).toThrow("Invalid W3C traceparent identifiers");
  });

  it("keeps correlation context within the async call chain", async () => {
    const context = createCorrelationContext({ correlationId: "corr_async_test_001" });

    await runWithCorrelationContext(context, async () => {
      await Promise.resolve();
      expect(getCorrelationContext()).toBe(context);
    });
    expect(getCorrelationContext()).toBeUndefined();
  });

  it("redacts sensitive structured keys and error messages", () => {
    const redacted = redactStructuredValue({
      authorization: "Bearer secret-token",
      profile: { email: "person@example.test", safeCount: 3 },
      failure: new Error("provider exposed a secret"),
    });
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("person@example.test");
    expect(serialized).not.toContain("provider exposed a secret");
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).toContain("safeCount");
  });

  it("serializes a safe correlated log record", () => {
    const context = createCorrelationContext({ correlationId: "corr_log_test_001" });
    const serialized = serializeStructuredLogRecord({
      level: "warn",
      event: "provider.request.failed",
      service: "web",
      environment: "staging",
      version: "build-001",
      context,
      timestamp: "2026-07-21T12:00:00.000Z",
      attributes: { providerResponse: "private body", retryCount: 2 },
    });

    expect(serialized).toContain("corr_log_test_001");
    expect(serialized).toContain('"retryCount":2');
    expect(serialized).not.toContain("private body");
  });
});
