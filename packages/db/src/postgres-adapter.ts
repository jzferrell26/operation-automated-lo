import { URL } from "node:url";

import postgres, { type ReservedSql, type Sql } from "postgres";

import type {
  DatabaseConnection,
  DatabasePool,
  SqlDriverResult,
  SqlRequest,
  SqlScalar,
} from "./sql-contract.js";

export type DatabaseDeploymentEnvironment = "local" | "test" | "preview" | "staging" | "production";

export interface PostgresPoolConfiguration {
  readonly connectionString: string;
  readonly deploymentEnvironment: DatabaseDeploymentEnvironment;
  readonly poolingMode: "transaction";
  readonly preparedStatements: false;
  readonly sslMode: "disable" | "require" | "verify-full";
  readonly applicationName?: string;
  readonly maxConnections?: number;
  readonly connectTimeoutSeconds?: number;
  readonly idleTimeoutSeconds?: number;
  readonly statementTimeoutMilliseconds?: number;
  readonly idleInTransactionTimeoutMilliseconds?: number;
}

interface ValidatedPostgresPoolConfiguration extends PostgresPoolConfiguration {
  readonly applicationName: string;
  readonly maxConnections: number;
  readonly connectTimeoutSeconds: number;
  readonly idleTimeoutSeconds: number;
  readonly statementTimeoutMilliseconds: number;
  readonly idleInTransactionTimeoutMilliseconds: number;
}

export class PostgresAdapterError extends Error {
  readonly code:
    | "DB_CONFIGURATION_INVALID"
    | "DB_POOL_CLOSED"
    | "DB_CONNECTION_RELEASED"
    | "DB_PREPARED_STATEMENT_FORBIDDEN"
    | "DB_DRIVER_RESULT_INVALID";

  constructor(code: PostgresAdapterError["code"], message: string) {
    super(message);
    this.name = "PostgresAdapterError";
    this.code = code;
  }
}

export class PostgresDatabasePool implements DatabasePool {
  readonly #driver: Sql;
  #closed = false;

  constructor(untrustedConfiguration: unknown) {
    const configuration = validateConfiguration(untrustedConfiguration);
    this.#driver = postgres(configuration.connectionString, {
      connect_timeout: configuration.connectTimeoutSeconds,
      connection: {
        application_name: configuration.applicationName,
        idle_in_transaction_session_timeout: configuration.idleInTransactionTimeoutMilliseconds,
        statement_timeout: configuration.statementTimeoutMilliseconds,
      },
      idle_timeout: configuration.idleTimeoutSeconds,
      max: configuration.maxConnections,
      onnotice: () => undefined,
      prepare: false,
      ssl: configuration.sslMode === "disable" ? false : configuration.sslMode,
    });
  }

  async connect(): Promise<DatabaseConnection> {
    if (this.#closed) {
      throw new PostgresAdapterError("DB_POOL_CLOSED", "Database pool is closed");
    }
    return new PostgresDatabaseConnection(await this.#driver.reserve());
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#driver.end({ timeout: 5 });
  }
}

export function createPostgresPool(untrustedConfiguration: unknown): PostgresDatabasePool {
  return new PostgresDatabasePool(untrustedConfiguration);
}

class PostgresDatabaseConnection implements DatabaseConnection {
  readonly #driver: ReservedSql;
  #released = false;

  constructor(driver: ReservedSql) {
    this.#driver = driver;
  }

  async execute(request: SqlRequest): Promise<SqlDriverResult> {
    if (this.#released) {
      throw new PostgresAdapterError(
        "DB_CONNECTION_RELEASED",
        "Database connection has already been released",
      );
    }
    if (request.preparedStatementMode !== "unnamed") {
      throw new PostgresAdapterError(
        "DB_PREPARED_STATEMENT_FORBIDDEN",
        "Named prepared statements are forbidden for transaction-pooled runtime traffic",
      );
    }

    const parameters = request.values.map(toDriverParameter);
    const result = await this.#driver.unsafe<Record<string, unknown>[]>(request.text, parameters, {
      prepare: false,
    });
    const rows: readonly unknown[] = Object.freeze(Array.from(result, (row): unknown => row));
    const rowCount = result.count ?? rows.length;
    if (!Number.isInteger(rowCount) || rowCount < 0) {
      throw new PostgresAdapterError(
        "DB_DRIVER_RESULT_INVALID",
        `Database statement ${request.statementName} returned an invalid row count`,
      );
    }
    return Object.freeze({ rows, rowCount });
  }

  async release(): Promise<void> {
    if (this.#released) return;
    this.#released = true;
    this.#driver.release();
  }
}

function validateConfiguration(value: unknown): ValidatedPostgresPoolConfiguration {
  const configuration = record(value);
  assertOnlyKeys(configuration, [
    "applicationName",
    "connectTimeoutSeconds",
    "connectionString",
    "deploymentEnvironment",
    "idleInTransactionTimeoutMilliseconds",
    "idleTimeoutSeconds",
    "maxConnections",
    "poolingMode",
    "preparedStatements",
    "sslMode",
    "statementTimeoutMilliseconds",
  ]);

  const connectionString = requiredString(configuration.connectionString, "connectionString");
  const deploymentEnvironment = deployment(configuration.deploymentEnvironment);
  const poolingMode = configuration.poolingMode;
  if (poolingMode !== "transaction") {
    invalid("poolingMode must be transaction for serverless runtime traffic");
  }
  if (configuration.preparedStatements !== false) {
    invalid("preparedStatements must be explicitly false for transaction pooling");
  }
  const sslMode = configuration.sslMode;
  if (sslMode !== "disable" && sslMode !== "require" && sslMode !== "verify-full") {
    invalid("sslMode must be disable, require, or verify-full");
  }
  if (
    sslMode === "disable" &&
    deploymentEnvironment !== "local" &&
    deploymentEnvironment !== "test"
  ) {
    invalid("TLS cannot be disabled outside local or test environments");
  }
  validateConnectionString(connectionString, sslMode);

  return Object.freeze({
    applicationName: optionalApplicationName(configuration.applicationName),
    connectTimeoutSeconds: boundedInteger(
      configuration.connectTimeoutSeconds,
      "connectTimeoutSeconds",
      1,
      30,
      10,
    ),
    connectionString,
    deploymentEnvironment,
    idleInTransactionTimeoutMilliseconds: boundedInteger(
      configuration.idleInTransactionTimeoutMilliseconds,
      "idleInTransactionTimeoutMilliseconds",
      1_000,
      300_000,
      30_000,
    ),
    idleTimeoutSeconds: boundedInteger(
      configuration.idleTimeoutSeconds,
      "idleTimeoutSeconds",
      1,
      300,
      20,
    ),
    maxConnections: boundedInteger(configuration.maxConnections, "maxConnections", 1, 20, 10),
    poolingMode,
    preparedStatements: false,
    sslMode,
    statementTimeoutMilliseconds: boundedInteger(
      configuration.statementTimeoutMilliseconds,
      "statementTimeoutMilliseconds",
      100,
      120_000,
      30_000,
    ),
  });
}

function validateConnectionString(connectionString: string, sslMode: string): void {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    invalid("connectionString must be a valid PostgreSQL URL");
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    invalid("connectionString must use the postgres or postgresql protocol");
  }
  if (parsed.hostname.length === 0 || parsed.username.length === 0 || parsed.pathname.length <= 1) {
    invalid("connectionString must include host, user, and database");
  }
  if (parsed.hash.length > 0) invalid("connectionString fragments are not allowed");
  const urlSslMode = parsed.searchParams.get("sslmode");
  if (urlSslMode !== null && urlSslMode !== sslMode) {
    invalid("connectionString sslmode must match sslMode");
  }
}

function deployment(value: unknown): DatabaseDeploymentEnvironment {
  if (
    value !== "local" &&
    value !== "test" &&
    value !== "preview" &&
    value !== "staging" &&
    value !== "production"
  ) {
    invalid("deploymentEnvironment is invalid");
  }
  return value;
}

function optionalApplicationName(value: unknown): string {
  if (value === undefined) return "oalo-runtime";
  const applicationName = requiredString(value, "applicationName");
  if (!/^[a-z][a-z0-9-]{2,62}$/u.test(applicationName)) {
    invalid("applicationName must be a safe lowercase identifier");
  }
  return applicationName;
}

function boundedInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    invalid(`${field} must be an integer from ${minimum} through ${maximum}`);
  }
  return value as number;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) invalid(`${field} is required`);
  return value;
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid("database pool configuration must be an object");
  }
  return value as Readonly<Record<string, unknown>>;
}

function assertOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  allowedKeys: readonly string[],
): void {
  const allowed = new Set(allowedKeys);
  const unknownKey = Object.keys(value).find((key) => !allowed.has(key));
  if (unknownKey !== undefined) invalid(`unknown database configuration field: ${unknownKey}`);
}

function invalid(message: string): never {
  throw new PostgresAdapterError("DB_CONFIGURATION_INVALID", message);
}

function toDriverParameter(value: SqlScalar): string | number | boolean | Date | Uint8Array | null {
  return typeof value === "bigint" ? value.toString(10) : value;
}
