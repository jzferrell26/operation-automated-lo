export type InstallationLifecycleStatus = "ACTIVE" | "UNINSTALLED";
export type InstallationSource = "DIRECT" | "AGENCY_BULK";

export interface LocationInstallation {
  readonly installationId: string;
  readonly locationId: string;
  readonly status: InstallationLifecycleStatus;
  readonly installationSources: readonly InstallationSource[];
  readonly grantedScopes: readonly string[];
  readonly scopeProfiles: readonly string[];
  readonly lifecycleVersion: number;
  readonly tokenUsable: boolean;
}

export function isInstallationActive(installation: LocationInstallation): boolean {
  return installation.status === "ACTIVE" && installation.tokenUsable;
}
