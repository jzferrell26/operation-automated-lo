export type SqlScalar = string | number | bigint | boolean | Date | Uint8Array | null;

export interface SqlRequest {
  readonly statementName: string;
  readonly text: string;
  readonly values: readonly SqlScalar[];
  readonly preparedStatementMode: "unnamed";
}

export interface SqlDriverResult {
  readonly rows: readonly unknown[];
  readonly rowCount: number;
}

export interface DatabaseConnection {
  execute(request: SqlRequest): Promise<SqlDriverResult>;
  release(): Promise<void>;
}

export interface DatabasePool {
  connect(): Promise<DatabaseConnection>;
}

export interface SqlContract<Row> {
  readonly name: string;
  readonly text: string;
  readonly access: "read" | "write";
  decode(row: unknown): Row;
}

export function defineSqlContract<Row>(contract: SqlContract<Row>): SqlContract<Row> {
  if (!/^[a-z][a-z0-9_.-]{2,99}$/u.test(contract.name)) {
    throw new Error("SQL contract names must be stable lowercase identifiers");
  }
  if (contract.text.trim().length === 0) {
    throw new Error(`SQL contract ${contract.name} cannot be empty`);
  }
  return Object.freeze(contract);
}
