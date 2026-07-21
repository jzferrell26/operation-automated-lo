import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";

const CorrelationIdPattern = /^corr_[A-Za-z0-9][A-Za-z0-9_-]{7,95}$/u;
const TraceparentPattern = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/u;
const AllZeroTraceId = /^0{32}$/u;
const AllZeroSpanId = /^0{16}$/u;

export interface CorrelationContext {
  readonly correlationId: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: string;
  readonly traceparent: string;
}

const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

export function parseTraceparent(
  traceparent: string,
): Pick<CorrelationContext, "traceId" | "spanId" | "traceFlags" | "traceparent"> {
  const normalized = traceparent.trim().toLowerCase();
  const match = TraceparentPattern.exec(normalized);

  if (match === null) {
    throw new Error("Invalid W3C traceparent");
  }

  const [, traceId, spanId, traceFlags] = match;
  if (
    traceId === undefined ||
    spanId === undefined ||
    traceFlags === undefined ||
    AllZeroTraceId.test(traceId) ||
    AllZeroSpanId.test(spanId)
  ) {
    throw new Error("Invalid W3C traceparent identifiers");
  }

  return Object.freeze({ traceId, spanId, traceFlags, traceparent: normalized });
}

export function createCorrelationContext(
  input: {
    readonly correlationId?: string;
    readonly traceparent?: string;
  } = {},
): CorrelationContext {
  const correlationId = input.correlationId ?? `corr_${randomHex(16)}`;
  if (!CorrelationIdPattern.test(correlationId)) {
    throw new Error("Invalid correlation ID");
  }

  const trace =
    input.traceparent === undefined
      ? Object.freeze({
          traceId: randomHex(16),
          spanId: randomHex(8),
          traceFlags: "01",
          traceparent: "",
        })
      : parseTraceparent(input.traceparent);

  const traceparent =
    trace.traceparent.length > 0
      ? trace.traceparent
      : `00-${trace.traceId}-${trace.spanId}-${trace.traceFlags}`;

  return Object.freeze({
    correlationId,
    traceId: trace.traceId,
    spanId: trace.spanId,
    traceFlags: trace.traceFlags,
    traceparent,
  });
}

export function runWithCorrelationContext<T>(context: CorrelationContext, callback: () => T): T {
  return correlationStorage.run(context, callback);
}

export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

export const OTEL_CORRELATION_ATTRIBUTE_NAMES = Object.freeze({
  correlationId: "oalo.correlation.id",
  traceId: "trace.id",
  spanId: "span.id",
} as const);

export function toOtelCorrelationAttributes(
  context: CorrelationContext,
): Readonly<Record<string, string>> {
  return Object.freeze({
    [OTEL_CORRELATION_ATTRIBUTE_NAMES.correlationId]: context.correlationId,
    [OTEL_CORRELATION_ATTRIBUTE_NAMES.traceId]: context.traceId,
    [OTEL_CORRELATION_ATTRIBUTE_NAMES.spanId]: context.spanId,
  });
}
