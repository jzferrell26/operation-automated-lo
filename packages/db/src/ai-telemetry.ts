import {
  AiTraceRecordSchema,
  AiUsageEventSchema,
  type AiTraceRecord,
  type AiUsageEvent,
} from "@oalo/contracts";

import { defineSqlContract, type DatabasePool } from "./sql-contract.js";
import {
  withTenantTransaction,
  type TenantDatabaseContext,
  type TenantTransaction,
} from "./transaction-context.js";

export interface AiTelemetryPair {
  readonly usage: AiUsageEvent;
  readonly trace: AiTraceRecord;
}

export interface DatabaseAiTelemetryPort {
  recordAtomically(input: AiTelemetryPair): Promise<void>;
  markReconciliationRequired(
    input: AiTelemetryPair & {
      readonly problemCode: "AI_TELEMETRY_PERSISTENCE_FAILED";
    },
  ): Promise<void>;
}

export interface AiTelemetryDatabaseContextResolver {
  resolveAiTelemetryDatabaseContext(input: AiTelemetryPair): Promise<unknown>;
}

export interface ResolvedAiTelemetryDatabaseContext extends TenantDatabaseContext {
  readonly actorRef: string;
  readonly authorityState: "active";
  readonly locationRef: string;
}

export class AiTelemetryPersistenceError extends Error {
  readonly code:
    | "AI_TELEMETRY_CONTEXT_INVALID"
    | "AI_TELEMETRY_CONTEXT_MISMATCH"
    | "AI_TELEMETRY_CONTEXT_REVOKED"
    | "AI_TELEMETRY_RESULT_INVALID";

  constructor(code: AiTelemetryPersistenceError["code"], message: string) {
    super(message);
    this.name = "AiTelemetryPersistenceError";
    this.code = code;
  }
}

interface RecordedPairRow {
  readonly traceRef: string;
  readonly usageEventRef: string;
}

interface ReconciliationMarkerRow {
  readonly status: "pending" | "reconciling" | "completed";
}

const recordAiTelemetryPairContract = defineSqlContract<RecordedPairRow>({
  name: "integration.record-ai-telemetry-pair.v1",
  access: "write",
  text: `
select usage_event_ref, trace_ref
from integration.record_ai_telemetry_pair_v1(($1::text)::jsonb, ($2::text)::jsonb)
  `.trim(),
  decode(row: unknown): RecordedPairRow {
    const record = resultRecord(row);
    if (
      typeof record.usage_event_ref !== "string" ||
      typeof record.trace_ref !== "string" ||
      Object.keys(record).length !== 2
    ) {
      throw new AiTelemetryPersistenceError(
        "AI_TELEMETRY_RESULT_INVALID",
        "AI telemetry persistence result is invalid",
      );
    }
    return Object.freeze({
      traceRef: record.trace_ref,
      usageEventRef: record.usage_event_ref,
    });
  },
});

const markAiTelemetryReconciliationContract = defineSqlContract<ReconciliationMarkerRow>({
  name: "integration.mark-ai-telemetry-reconciliation.v1",
  access: "write",
  text: `
select integration.mark_ai_telemetry_reconciliation_required_v1(
  ($1::text)::jsonb,
  ($2::text)::jsonb,
  $3::text
) as status
  `.trim(),
  decode(row: unknown): ReconciliationMarkerRow {
    const record = resultRecord(row);
    if (
      (record.status !== "pending" &&
        record.status !== "reconciling" &&
        record.status !== "completed") ||
      Object.keys(record).length !== 1
    ) {
      throw new AiTelemetryPersistenceError(
        "AI_TELEMETRY_RESULT_INVALID",
        "AI telemetry reconciliation result is invalid",
      );
    }
    return Object.freeze({ status: record.status });
  },
});

export class PostgresAiTelemetryPort implements DatabaseAiTelemetryPort {
  readonly #pool: DatabasePool;
  readonly #resolver: AiTelemetryDatabaseContextResolver;

  constructor(pool: DatabasePool, resolver: AiTelemetryDatabaseContextResolver) {
    this.#pool = pool;
    this.#resolver = resolver;
  }

  async recordAtomically(untrustedInput: AiTelemetryPair): Promise<void> {
    const pair = validatedPair(untrustedInput);
    await this.#run(pair, async (transaction) => {
      const rows = await transaction.write(recordAiTelemetryPairContract, pairValues(pair));
      if (
        rows.length !== 1 ||
        rows[0]?.usageEventRef !== pair.usage.usageEventRef ||
        rows[0]?.traceRef !== pair.trace.traceRef
      ) {
        throw new AiTelemetryPersistenceError(
          "AI_TELEMETRY_RESULT_INVALID",
          "AI telemetry persistence did not confirm the requested pair",
        );
      }
    });
  }

  async markReconciliationRequired(
    untrustedInput: AiTelemetryPair & {
      readonly problemCode: "AI_TELEMETRY_PERSISTENCE_FAILED";
    },
  ): Promise<void> {
    if (untrustedInput.problemCode !== "AI_TELEMETRY_PERSISTENCE_FAILED") {
      throw new AiTelemetryPersistenceError(
        "AI_TELEMETRY_RESULT_INVALID",
        "AI telemetry reconciliation problem code is invalid",
      );
    }
    const pair = validatedPair(untrustedInput);
    await this.#run(pair, async (transaction) => {
      const rows = await transaction.write(markAiTelemetryReconciliationContract, [
        ...pairValues(pair),
        untrustedInput.problemCode,
      ]);
      if (rows.length !== 1) {
        throw new AiTelemetryPersistenceError(
          "AI_TELEMETRY_RESULT_INVALID",
          "AI telemetry reconciliation marker was not confirmed",
        );
      }
    });
  }

  async #run<Result>(
    pair: AiTelemetryPair,
    work: (transaction: TenantTransaction) => Promise<Result>,
  ): Promise<Result> {
    const context = await resolveContext(this.#resolver, pair);
    return withTenantTransaction(
      this.#pool,
      { resolveTenantDatabaseContext: async () => context },
      work,
    );
  }
}

export function createPostgresAiTelemetryPort(
  pool: DatabasePool,
  resolver: AiTelemetryDatabaseContextResolver,
): PostgresAiTelemetryPort {
  return new PostgresAiTelemetryPort(pool, resolver);
}

function validatedPair(untrustedInput: AiTelemetryPair): AiTelemetryPair {
  const usage = AiUsageEventSchema.parse(untrustedInput.usage);
  const trace = AiTraceRecordSchema.parse(untrustedInput.trace);
  if (
    usage.locationRef !== trace.locationRef ||
    usage.actorRef !== trace.actorRef ||
    usage.correlationRef !== trace.correlationRef ||
    usage.feature !== trace.feature ||
    usage.modelPolicyVersionRef !== trace.modelPolicyVersionRef ||
    usage.promptPolicyVersionRef !== trace.promptPolicyVersionRef ||
    usage.providerRequestRef !== trace.providerRequestRef ||
    usage.latencyMs !== trace.latencyMs ||
    usage.outcome !== trace.outcome ||
    usage.failureClassification !== trace.failureClassification ||
    usage.occurredAt !== trace.occurredAt
  ) {
    throw new AiTelemetryPersistenceError(
      "AI_TELEMETRY_RESULT_INVALID",
      "AI usage and trace records must describe one provider attempt",
    );
  }
  return Object.freeze({ usage, trace });
}

async function resolveContext(
  resolver: AiTelemetryDatabaseContextResolver,
  pair: AiTelemetryPair,
): Promise<ResolvedAiTelemetryDatabaseContext> {
  const untrusted = await resolver.resolveAiTelemetryDatabaseContext(pair);
  if (typeof untrusted !== "object" || untrusted === null || Array.isArray(untrusted)) {
    throw new AiTelemetryPersistenceError(
      "AI_TELEMETRY_CONTEXT_INVALID",
      "AI telemetry database context is invalid",
    );
  }
  const candidate = untrusted as Readonly<Record<string, unknown>>;
  const expectedKeys = [
    "actorId",
    "actorRef",
    "authorityState",
    "correlationId",
    "locationId",
    "locationRef",
  ] as const;
  const actualKeys = Object.keys(candidate).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index]) ||
    typeof candidate.actorId !== "string" ||
    typeof candidate.actorRef !== "string" ||
    typeof candidate.correlationId !== "string" ||
    typeof candidate.locationId !== "string" ||
    typeof candidate.locationRef !== "string"
  ) {
    throw new AiTelemetryPersistenceError(
      "AI_TELEMETRY_CONTEXT_INVALID",
      "AI telemetry database context fields are invalid",
    );
  }
  if (candidate.authorityState === "revoked") {
    throw new AiTelemetryPersistenceError(
      "AI_TELEMETRY_CONTEXT_REVOKED",
      "AI telemetry database authority has been revoked",
    );
  }
  if (candidate.authorityState !== "active") {
    throw new AiTelemetryPersistenceError(
      "AI_TELEMETRY_CONTEXT_INVALID",
      "AI telemetry database authority state is invalid",
    );
  }
  if (
    candidate.locationRef !== pair.usage.locationRef ||
    candidate.actorRef !== pair.usage.actorRef ||
    candidate.correlationId !== pair.usage.correlationRef
  ) {
    throw new AiTelemetryPersistenceError(
      "AI_TELEMETRY_CONTEXT_MISMATCH",
      "AI telemetry database context does not match the telemetry pair",
    );
  }
  return Object.freeze({
    actorId: candidate.actorId,
    actorRef: candidate.actorRef,
    authorityState: "active",
    correlationId: candidate.correlationId,
    locationId: candidate.locationId,
    locationRef: candidate.locationRef,
  });
}

function pairValues(pair: AiTelemetryPair): readonly [string, string] {
  return [JSON.stringify(pair.usage), JSON.stringify(pair.trace)];
}

function resultRecord(row: unknown): Readonly<Record<string, unknown>> {
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    throw new AiTelemetryPersistenceError(
      "AI_TELEMETRY_RESULT_INVALID",
      "AI telemetry database result must be an object",
    );
  }
  return row as Readonly<Record<string, unknown>>;
}
