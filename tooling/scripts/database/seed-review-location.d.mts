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
  readonly setPassword: boolean;
  readonly passwordStdin: boolean;
  readonly creatorEmail?: string;
  readonly approverEmail?: string;
  readonly outsiderEmail?: string;
}

export interface CredentialTarget {
  readonly flag: string;
  readonly key: "creatorEmail" | "approverEmail" | "outsiderEmail";
  readonly idKey: "creatorUserId" | "approverUserId" | "outsiderAdminUserId";
  readonly label: string;
  readonly displayName: string;
}

export const CREDENTIAL_TARGETS: readonly CredentialTarget[];

export interface SeedStreams {
  readonly input: NodeJS.ReadStream;
  readonly output: NodeJS.WritableStream;
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
  readonly streams?: SeedStreams;
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
export function reportLines(
  databaseName: string,
  summary: SeedSummary,
  credentialsSet?: readonly string[],
): readonly string[];
export function seedReviewLocation(options?: SeedReviewLocationOptions): Promise<SeedSummary>;
