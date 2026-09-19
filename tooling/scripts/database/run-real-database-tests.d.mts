export const SUPABASE_CLI_VERSION: "2.109.1";
export const TEST_DATABASE_NAME: string;
export const TEST_DATABASE_NAME_PREFIX: "oalo_test_";
export const WEB_POSTGRES_PROJECT: "web-postgres";

export interface DatabaseCommandStep {
  readonly command: string;
  readonly args: readonly string[];
  readonly label: string;
  readonly env?: Readonly<Record<string, string>>;
}

export interface DatabaseCommandPlan {
  readonly cleanup: DatabaseCommandStep;
  readonly setup: readonly DatabaseCommandStep[];
  readonly tests: readonly DatabaseCommandStep[];
  readonly integration: readonly DatabaseCommandStep[];
  readonly notices: readonly string[];
}

export interface DatabaseCommandDiscovery {
  readonly pgtapFiles: readonly string[];
  readonly migrationFiles: readonly string[];
  readonly integrationTestFiles: readonly string[];
  readonly webPostgresTestFiles?: readonly string[];
  readonly databasePort: number;
}

export interface PackageRunner {
  readonly cli: string;
  readonly args: readonly string[];
}

export interface RunRealDatabaseTestsOptions {
  readonly repositoryRoot?: string;
  readonly run?: (step: DatabaseCommandStep, repositoryRoot: string) => Promise<void>;
}

export function discoverPgtapFiles(repositoryRoot?: string): Promise<string[]>;
export function discoverMigrationFiles(repositoryRoot?: string): Promise<string[]>;
export function discoverIntegrationTestFiles(repositoryRoot?: string): Promise<string[]>;
export function discoverWebPostgresTestFiles(repositoryRoot?: string): Promise<string[]>;
export function resolveLocalDatabasePort(configToml: string): number;
export function readLocalDatabasePort(repositoryRoot?: string): Promise<number>;
export function localDatabaseUrl(
  databasePort: number,
  databaseName: string,
  options?: { readonly withPassword?: boolean },
): string;
export function assertDisposableTestDatabaseName(databaseName: string): string;
export function commandPlan(
  discovery: DatabaseCommandDiscovery,
  repositoryRoot?: string,
): DatabaseCommandPlan;
export function resolveNpmCli(nodeExecutable: string, inheritedNpmCli?: string): string;
export function resolvePackageRunner(
  nodeExecutable: string,
  inheritedPackageManagerCli?: string,
): PackageRunner;
export function runCommand(step: DatabaseCommandStep, cwd: string): Promise<void>;
export function runRealDatabaseTests(options?: RunRealDatabaseTestsOptions): Promise<void>;
