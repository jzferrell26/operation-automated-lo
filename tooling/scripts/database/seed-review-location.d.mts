export interface SeedIds {
  readonly reviewLocationId: string;
  readonly outsiderLocationId: string;
  readonly creatorUserId: string;
  readonly approverUserId: string;
  readonly outsiderAdminUserId: string;
  readonly reviewInstallationId: string;
  readonly outsiderInstallationId: string;
  readonly creatorBindingId: string;
  readonly approverBindingId: string;
  readonly outsiderAdminBindingId: string;
}

export const SEED_IDS: SeedIds;
export const SEEDED_LOCATION_IDS: readonly string[];
export const MARKETPLACE_APP_ID: "oalo-review-surface";

export class SeedReviewLocationError extends Error {
  constructor(message: string);
}

export interface SeedArguments {
  readonly reviewDatabaseUrl: string;
  readonly confirmDatabase: string;
  readonly expectUnchanged: boolean;
}

export interface SeedConnectionProfile {
  readonly deploymentEnvironment: "test" | "preview";
  readonly sslMode: "disable" | "require";
}

export interface SeedSummary {
  readonly insertedByTable: Readonly<Record<string, number>>;
  readonly insertedRowCount: number;
}

export interface SeedSqlRequest {
  readonly statementName: string;
  readonly text: string;
  readonly values: readonly (string | number | bigint | boolean | Date | Uint8Array | null)[];
  readonly preparedStatementMode: "unnamed";
}

export interface SeedConnection {
  execute(request: SeedSqlRequest): Promise<{
    readonly rows: readonly unknown[];
    readonly rowCount: number;
  }>;
}

export interface SeedSession {
  readonly connection: SeedConnection;
  dispose(): Promise<void>;
}

export interface SeedReviewLocationOptions {
  readonly argv?: readonly string[];
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly connect?: (connectionString: string) => Promise<SeedSession>;
  readonly log?: (line: string) => void;
}

export function parseSeedArguments(argv: readonly string[]): SeedArguments;
export function databaseNameFromUrl(connectionString: string): string;
export function assertConfirmedDatabase(connectionString: string, confirmDatabase: string): string;
export function assertNotProductionEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): void;
export function assertNoForeignActiveLocations(activeLocationIds: readonly string[]): void;
export function resolveConnectionProfile(connectionString: string): SeedConnectionProfile;
export function summarizeSeedResult(insertedByTable: Record<string, number>): SeedSummary;
export function reportLines(databaseName: string, summary: SeedSummary): readonly string[];
export function seedReviewLocation(options?: SeedReviewLocationOptions): Promise<SeedSummary>;
