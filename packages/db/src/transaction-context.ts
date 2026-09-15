import {
  assertPrincipalOwnsTransaction,
  createCampaignTenantContext,
  type AuthenticatedPrincipal,
} from "@oalo/application";

import type {
  DatabaseConnection,
  DatabasePool,
  SqlContract,
  SqlDriverResult,
  SqlScalar,
} from "./sql-contract.js";

export interface TenantDatabaseContext {
  readonly locationId: string;
  readonly actorId: string;
  readonly correlationId: string;
}

export interface SupportDatabaseContext extends TenantDatabaseContext {
  readonly subjectType: string;
  readonly subjectId: string;
}

export interface TenantContextAuthority {
  resolveTenantDatabaseContext(): Promise<TenantDatabaseContext>;
}

export function createPrincipalBoundTenantContextAuthority(
  principal: Readonly<AuthenticatedPrincipal>,
  correlationId: string,
): TenantContextAuthority {
  return {
    async resolveTenantDatabaseContext() {
      const context = createCampaignTenantContext(principal, correlationId);
      assertPrincipalOwnsTransaction(principal, context);
      return context;
    },
  };
}

export interface SupportContextAuthority {
  resolveSupportDatabaseContext(): Promise<SupportDatabaseContext>;
}

export interface TenantTransaction {
  readonly context: TenantDatabaseContext;
  read<Row>(contract: SqlContract<Row>, values?: readonly SqlScalar[]): Promise<readonly Row[]>;
  write<Row>(contract: SqlContract<Row>, values?: readonly SqlScalar[]): Promise<readonly Row[]>;
}

export class DatabaseContextError extends Error {
  readonly code:
    | "DB_CONTEXT_INVALID"
    | "DB_CONTEXT_MISMATCH"
    | "DB_TRANSACTION_CLOSED"
    | "DB_CONTRACT_ACCESS_MISMATCH";

  constructor(code: DatabaseContextError["code"], message: string) {
    super(message);
    this.name = "DatabaseContextError";
    this.code = code;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,299}$/u;

const BEGIN_REQUEST = request("transaction.begin", "begin");
const COMMIT_REQUEST = request("transaction.commit", "commit");
const ROLLBACK_REQUEST = request("transaction.rollback", "rollback");
const ASSUME_APP_RUNTIME_ROLE_REQUEST = request(
  "transaction.assume-app-runtime-role",
  "set local role app_runtime",
);
const ASSUME_SUPPORT_RUNTIME_ROLE_REQUEST = request(
  "transaction.assume-support-runtime-role",
  "set local role support_runtime",
);

/**
 * Runtime login roles are granted `app_runtime` / `support_runtime` with
 * INHERIT false. Every tenant/support transaction must activate the matching
 * NOLOGIN role so RLS policies that target those roles actually apply.
 * Set OALO_DB_ASSUME_RUNTIME_ROLE=false only for migration/admin tooling that
 * deliberately connects as a privileged owner outside the app path.
 */
export function shouldAssumeRuntimeRole(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  const raw = env.OALO_DB_ASSUME_RUNTIME_ROLE;
  if (raw === undefined || raw === "") {
    return true;
  }
  return raw !== "0" && raw.toLowerCase() !== "false" && raw.toLowerCase() !== "off";
}

const SET_TENANT_CONTEXT_TEXT = `
select platform.set_app_context($1::uuid, $2::uuid, $3::text)
`.trim();

const SET_SUPPORT_CONTEXT_TEXT = `
select platform.begin_support_access($1::uuid, $2::uuid, $3::text, $4::text, $5::text)
`.trim();

const READ_CONTEXT_TEXT = `
select
  platform.current_location_id()::text as location_id,
  platform.current_actor_id()::text as actor_id,
  platform.current_correlation_id() as correlation_id
`.trim();

class ScopedTenantTransaction implements TenantTransaction {
  readonly context: TenantDatabaseContext;
  #active = true;
  readonly #connection: DatabaseConnection;

  constructor(connection: DatabaseConnection, context: TenantDatabaseContext) {
    this.#connection = connection;
    this.context = Object.freeze({ ...context });
  }

  close(): void {
    this.#active = false;
  }

  async read<Row>(
    contract: SqlContract<Row>,
    values: readonly SqlScalar[] = [],
  ): Promise<readonly Row[]> {
    if (contract.access !== "read") {
      throw new DatabaseContextError(
        "DB_CONTRACT_ACCESS_MISMATCH",
        `SQL contract ${contract.name} is not a read contract`,
      );
    }
    return this.#run(contract, values);
  }

  async write<Row>(
    contract: SqlContract<Row>,
    values: readonly SqlScalar[] = [],
  ): Promise<readonly Row[]> {
    if (contract.access !== "write") {
      throw new DatabaseContextError(
        "DB_CONTRACT_ACCESS_MISMATCH",
        `SQL contract ${contract.name} is not a write contract`,
      );
    }
    return this.#run(contract, values);
  }

  async #run<Row>(
    contract: SqlContract<Row>,
    values: readonly SqlScalar[],
  ): Promise<readonly Row[]> {
    if (!this.#active) {
      throw new DatabaseContextError(
        "DB_TRANSACTION_CLOSED",
        "Tenant repositories cannot use a transaction after commit or rollback",
      );
    }
    const result = await this.#connection.execute({
      statementName: contract.name,
      text: contract.text,
      values,
      preparedStatementMode: "unnamed",
    });
    return Object.freeze(result.rows.map((row) => contract.decode(row)));
  }
}

export async function withTenantTransaction<Result>(
  pool: DatabasePool,
  authority: TenantContextAuthority,
  work: (transaction: TenantTransaction) => Promise<Result>,
): Promise<Result> {
  const context = validateTenantContext(await authority.resolveTenantDatabaseContext());
  return withContextTransaction(
    pool,
    context,
    ASSUME_APP_RUNTIME_ROLE_REQUEST,
    SET_TENANT_CONTEXT_TEXT,
    [context.locationId, context.actorId, context.correlationId],
    work,
  );
}

export async function withSupportTransaction<Result>(
  pool: DatabasePool,
  authority: SupportContextAuthority,
  work: (transaction: TenantTransaction) => Promise<Result>,
): Promise<Result> {
  const supportContext = validateSupportContext(await authority.resolveSupportDatabaseContext());
  return withContextTransaction(
    pool,
    supportContext,
    ASSUME_SUPPORT_RUNTIME_ROLE_REQUEST,
    SET_SUPPORT_CONTEXT_TEXT,
    [
      supportContext.locationId,
      supportContext.actorId,
      supportContext.correlationId,
      supportContext.subjectType,
      supportContext.subjectId,
    ],
    work,
  );
}

async function withContextTransaction<Result>(
  pool: DatabasePool,
  context: TenantDatabaseContext,
  assumeRoleRequest: Readonly<{
    statementName: string;
    text: string;
    values: readonly SqlScalar[];
    preparedStatementMode: "unnamed";
  }>,
  contextSql: string,
  contextValues: readonly SqlScalar[],
  work: (transaction: TenantTransaction) => Promise<Result>,
): Promise<Result> {
  const connection = await pool.connect();
  let began = false;
  let closed = false;
  let transaction: ScopedTenantTransaction | undefined;
  try {
    await connection.execute(BEGIN_REQUEST);
    began = true;
    if (shouldAssumeRuntimeRole()) {
      await connection.execute(assumeRoleRequest);
    }
    await connection.execute({
      statementName: "transaction.set-context",
      text: contextSql,
      values: contextValues,
      preparedStatementMode: "unnamed",
    });
    await assertDatabaseContext(connection, context);
    transaction = new ScopedTenantTransaction(connection, context);
    const result = await work(transaction);
    await connection.execute(COMMIT_REQUEST);
    closed = true;
    transaction.close();
    await connection.release();
    return result;
  } catch (error: unknown) {
    transaction?.close();
    const failures: unknown[] = [error];
    if (began && !closed) {
      try {
        await connection.execute(ROLLBACK_REQUEST);
      } catch (rollbackError: unknown) {
        failures.push(rollbackError);
      }
    }
    try {
      await connection.release();
    } catch (releaseError: unknown) {
      failures.push(releaseError);
    }
    if (failures.length === 1) throw error;
    throw new AggregateError(failures, "Database transaction cleanup failed");
  }
}

async function assertDatabaseContext(
  connection: DatabaseConnection,
  expected: TenantDatabaseContext,
): Promise<void> {
  const result = await connection.execute({
    statementName: "transaction.read-context",
    text: READ_CONTEXT_TEXT,
    values: [],
    preparedStatementMode: "unnamed",
  });
  if (result.rows.length !== 1) {
    throw new DatabaseContextError(
      "DB_CONTEXT_MISMATCH",
      "Database context probe returned no single row",
    );
  }
  const actual = decodeContextRow(result.rows[0]);
  if (
    actual.locationId !== expected.locationId ||
    actual.actorId !== expected.actorId ||
    actual.correlationId !== expected.correlationId
  ) {
    throw new DatabaseContextError(
      "DB_CONTEXT_MISMATCH",
      "Database transaction context does not match the verified authority context",
    );
  }
}

function validateTenantContext(context: TenantDatabaseContext): TenantDatabaseContext {
  if (!UUID_PATTERN.test(context.locationId) || !UUID_PATTERN.test(context.actorId)) {
    throw new DatabaseContextError("DB_CONTEXT_INVALID", "Tenant and actor IDs must be UUIDs");
  }
  if (!SAFE_REFERENCE_PATTERN.test(context.correlationId)) {
    throw new DatabaseContextError(
      "DB_CONTEXT_INVALID",
      "Correlation ID is not a safe opaque reference",
    );
  }
  return Object.freeze({ ...context });
}

function validateSupportContext(context: SupportDatabaseContext): SupportDatabaseContext {
  validateTenantContext(context);
  if (
    !SAFE_REFERENCE_PATTERN.test(context.subjectType) ||
    !SAFE_REFERENCE_PATTERN.test(context.subjectId)
  ) {
    throw new DatabaseContextError(
      "DB_CONTEXT_INVALID",
      "Support subject is not a safe opaque reference",
    );
  }
  return Object.freeze({ ...context });
}

function decodeContextRow(row: unknown): TenantDatabaseContext {
  if (typeof row !== "object" || row === null) {
    throw new DatabaseContextError(
      "DB_CONTEXT_MISMATCH",
      "Database context probe returned an invalid row",
    );
  }
  const candidate = row as Readonly<Record<string, unknown>>;
  if (
    typeof candidate.location_id !== "string" ||
    typeof candidate.actor_id !== "string" ||
    typeof candidate.correlation_id !== "string"
  ) {
    throw new DatabaseContextError(
      "DB_CONTEXT_MISMATCH",
      "Database context probe fields are invalid",
    );
  }
  return validateTenantContext({
    locationId: candidate.location_id,
    actorId: candidate.actor_id,
    correlationId: candidate.correlation_id,
  });
}

function request(
  statementName: string,
  text: string,
): Readonly<{
  statementName: string;
  text: string;
  values: readonly SqlScalar[];
  preparedStatementMode: "unnamed";
}> {
  return Object.freeze({ statementName, text, values: [], preparedStatementMode: "unnamed" });
}

export function isSqlDriverResult(value: unknown): value is SqlDriverResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Readonly<Record<string, unknown>>;
  return Array.isArray(candidate.rows) && Number.isInteger(candidate.rowCount);
}
