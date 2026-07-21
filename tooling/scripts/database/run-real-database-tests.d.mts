export const SUPABASE_CLI_VERSION: "2.109.1";

export interface DatabaseCommandStep {
  readonly command: string;
  readonly args: readonly string[];
  readonly label: string;
}

export interface DatabaseCommandPlan {
  readonly cleanup: DatabaseCommandStep;
  readonly setup: readonly DatabaseCommandStep[];
  readonly tests: readonly DatabaseCommandStep[];
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
export function commandPlan(
  pgtapFiles: readonly string[],
  repositoryRoot?: string,
): DatabaseCommandPlan;
export function resolveNpmCli(nodeExecutable: string, inheritedNpmCli?: string): string;
export function resolvePackageRunner(
  nodeExecutable: string,
  inheritedPackageManagerCli?: string,
): PackageRunner;
export function runRealDatabaseTests(options?: RunRealDatabaseTestsOptions): Promise<void>;
