import { contractVersion } from "@oalo/contracts";

export {
  OTEL_CORRELATION_ATTRIBUTE_NAMES,
  createCorrelationContext,
  getCorrelationContext,
  parseTraceparent,
  runWithCorrelationContext,
  toOtelCorrelationAttributes,
  type CorrelationContext,
} from "./correlation.js";

export {
  createStructuredLogRecord,
  redactStructuredValue,
  serializeStructuredLogRecord,
  type RedactedStructuredArray,
  type RedactedStructuredObject,
  type RedactedStructuredValue,
  type StructuredLogLevel,
  type StructuredLogRecordInput,
} from "./redaction.js";

export const observabilityPackage = Object.freeze({
  contractVersion,
  implementation: "otel-correlation-and-structured-redaction-primitives",
});
