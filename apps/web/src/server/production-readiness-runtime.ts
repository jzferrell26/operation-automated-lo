import { createAnthropicMessagesProviderClient } from "@oalo/ai";
import {
  createAbortContext,
  parseProductionServiceConfiguration,
  raceWithAbort,
} from "@oalo/config";
import { createPostgresPool, type DatabasePool } from "@oalo/db";
import {
  createLeadConnectorV2HttpTransport,
  type LeadConnectorLocationTokenResolver,
} from "@oalo/ghl";
import { createR2ObjectStoreClient } from "@oalo/storage";

export type ProductionProbeState = "ready" | "degraded" | "unavailable";

export interface ProductionDependencyProbeResult {
  readonly database: ProductionProbeState;
  readonly highLevel: ProductionProbeState;
  readonly ai: ProductionProbeState;
  readonly objectStore: ProductionProbeState;
}

export interface ProductionReadinessRuntime {
  probe(signal?: AbortSignal): Promise<ProductionDependencyProbeResult>;
}

export interface ProductionReadinessRuntimeDependencies {
  readonly resolveLocationToken?: LeadConnectorLocationTokenResolver;
}

async function probeDatabase(
  pool: DatabasePool,
  timeoutMilliseconds: number,
  externalSignal?: AbortSignal,
): Promise<ProductionProbeState> {
  const abortContext = createAbortContext({
    controller: new AbortController(),
    timeoutMilliseconds,
    timeoutReason: new Error("Database readiness timeout"),
    ...(externalSignal === undefined ? {} : { externalSignal }),
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
  });
  const connectionPromise = pool.connect();
  try {
    const connection = await raceWithAbort(connectionPromise, abortContext.signal);
    try {
      const result = await raceWithAbort(
        connection.execute({
          statementName: "readiness.database.v1",
          text: "select 1 as ready",
          values: [],
          preparedStatementMode: "unnamed",
        }),
        abortContext.signal,
      );
      const row = result.rows[0];
      return result.rowCount === 1 &&
        typeof row === "object" &&
        row !== null &&
        !Array.isArray(row) &&
        (row as Readonly<Record<string, unknown>>).ready === 1
        ? "ready"
        : "unavailable";
    } finally {
      await connection.release();
    }
  } catch {
    void connectionPromise.then((connection) => connection.release()).catch(() => undefined); // A rejected late connection has no resource to release.
    return "unavailable";
  } finally {
    abortContext.dispose();
  }
}

export function createProductionReadinessRuntime(
  input: unknown,
  dependencies: ProductionReadinessRuntimeDependencies = {},
): ProductionReadinessRuntime {
  const configuration = parseProductionServiceConfiguration(input);
  const database = createPostgresPool(configuration.database);
  const highLevel = createLeadConnectorV2HttpTransport(
    { requestTimeoutMs: configuration.ghl.requestTimeoutMs },
    dependencies.resolveLocationToken === undefined
      ? {}
      : { resolveLocationToken: dependencies.resolveLocationToken },
  );
  const ai = createAnthropicMessagesProviderClient(configuration.anthropic);
  const objectStore = createR2ObjectStoreClient(configuration.r2);

  return Object.freeze({
    async probe(signal?: AbortSignal): Promise<ProductionDependencyProbeResult> {
      const [databaseState, highLevelResult, aiResult, objectStoreResult] = await Promise.all([
        probeDatabase(database, configuration.ghl.requestTimeoutMs, signal),
        highLevel.probe({ locationRef: configuration.ghl.readinessLocationRef }, signal),
        ai.probe(signal),
        objectStore.probe(signal),
      ]);
      return Object.freeze({
        database: databaseState,
        highLevel: highLevelResult.ready ? "ready" : "degraded",
        ai: aiResult.status === "ready" ? "ready" : "degraded",
        objectStore: objectStoreResult.status === "ready" ? "ready" : "unavailable",
      });
    },
  });
}

let runtime: ProductionReadinessRuntime | undefined;

export function productionReadinessRuntime(input: unknown): ProductionReadinessRuntime {
  runtime ??= createProductionReadinessRuntime(input);
  return runtime;
}
