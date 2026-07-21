import type { CorrelationContext } from "./correlation.js";

const REDACTED = "[REDACTED]" as const;
const TRUNCATED = "[TRUNCATED]" as const;
const CIRCULAR = "[CIRCULAR]" as const;
const MaxDepth = 6;
const MaxArrayItems = 50;
const MaxStringLength = 2_048;

const SensitiveKeyPattern =
  /(?:authorization|cookie|password|secret|token|credential|api.?key|private.?key|session|raw.?body|email|phone|address|prompt|model.?output|provider.?response|card|ssn)/iu;

export interface RedactedStructuredArray extends ReadonlyArray<RedactedStructuredValue> {}

export interface RedactedStructuredObject {
  readonly [key: string]: RedactedStructuredValue;
}

export type RedactedStructuredValue =
  null | boolean | number | string | RedactedStructuredArray | RedactedStructuredObject;

function redactValue(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): RedactedStructuredValue {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return value.length <= MaxStringLength
      ? value
      : `${value.slice(0, MaxStringLength)}${TRUNCATED}`;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
    return "[UNSERIALIZABLE]";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return Object.freeze({
      name: value.name,
      message: REDACTED,
    });
  }

  if (depth >= MaxDepth) {
    return TRUNCATED;
  }

  if (seen.has(value)) {
    return CIRCULAR;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return Object.freeze(
      value.slice(0, MaxArrayItems).map((entry) => redactValue(entry, seen, depth + 1)),
    );
  }

  const output: Record<string, RedactedStructuredValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = SensitiveKeyPattern.test(key) ? REDACTED : redactValue(entry, seen, depth + 1);
  }

  return Object.freeze(output);
}

export function redactStructuredValue(value: unknown): RedactedStructuredValue {
  return redactValue(value, new WeakSet<object>(), 0);
}

export type StructuredLogLevel = "debug" | "info" | "warn" | "error";

export interface StructuredLogRecordInput {
  readonly level: StructuredLogLevel;
  readonly event: string;
  readonly service: string;
  readonly environment: string;
  readonly version: string;
  readonly context?: CorrelationContext;
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly timestamp?: string;
}

export function createStructuredLogRecord(
  input: StructuredLogRecordInput,
): Readonly<Record<string, RedactedStructuredValue>> {
  if (!/^[a-z0-9][a-z0-9._-]{2,127}$/u.test(input.event)) {
    throw new Error("Structured log event name is invalid");
  }

  const record: Record<string, unknown> = {
    timestamp: input.timestamp ?? new Date().toISOString(),
    level: input.level,
    event: input.event,
    service: input.service,
    environment: input.environment,
    version: input.version,
    correlationId: input.context?.correlationId,
    traceId: input.context?.traceId,
    spanId: input.context?.spanId,
    attributes: input.attributes ?? {},
  };

  return redactStructuredValue(record) as Readonly<Record<string, RedactedStructuredValue>>;
}

export function serializeStructuredLogRecord(input: StructuredLogRecordInput): string {
  return JSON.stringify(createStructuredLogRecord(input));
}
