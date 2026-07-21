import {
  InstallationActivationSchema,
  SafeTenantReferenceSchema,
  type InstallationActivation,
  type ProductCapability,
  type ScopeProfile,
} from "@oalo/contracts";
import { isInstallationActive, type LocationInstallation } from "@oalo/domain";

import { processDelivery, type DeliveryGuardPort } from "./durable-foundation.js";

export interface ServerSessionIdentity {
  readonly locationId: string;
  readonly installationId: string;
  readonly sessionId: string;
  readonly role: string;
  readonly roleVersion: number;
}

export interface ServerTenantContext extends ServerSessionIdentity {
  readonly source: "validated-session";
}

export class LocationAuthorizationError extends Error {
  public constructor() {
    super("The requested resource is unavailable.");
    this.name = "LocationAuthorizationError";
  }
}

function hasLocationOverride(value: Readonly<Record<string, unknown>> | undefined): boolean {
  return value !== undefined && ("locationId" in value || "location_id" in value);
}

export function deriveServerTenantContext(input: {
  readonly validatedSession: ServerSessionIdentity;
  readonly body?: Readonly<Record<string, unknown>>;
  readonly query?: Readonly<Record<string, unknown>>;
}): ServerTenantContext {
  if (hasLocationOverride(input.body) || hasLocationOverride(input.query)) {
    throw new LocationAuthorizationError();
  }

  if (
    !SafeTenantReferenceSchema.safeParse(input.validatedSession.locationId).success ||
    !SafeTenantReferenceSchema.safeParse(input.validatedSession.installationId).success
  ) {
    throw new LocationAuthorizationError();
  }

  return Object.freeze({ ...input.validatedSession, source: "validated-session" as const });
}

export function assertResourceLocation(
  context: ServerTenantContext,
  resourceLocationId: string,
): void {
  if (context.locationId !== resourceLocationId) {
    throw new LocationAuthorizationError();
  }
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
}

function installationIdFor(locationId: string): string {
  return `installation_${locationId}`;
}

export class InstallationLifecycleService {
  readonly #installations = new Map<string, LocationInstallation>();
  readonly #deletionSchedules = new Map<string, TenantDeletionSchedule>();

  public activate(input: InstallationActivation): LocationInstallation {
    const activation = InstallationActivationSchema.parse(input);
    const existing = this.#installations.get(activation.locationId);
    const sources = uniqueSorted([
      ...(existing?.installationSources ?? []),
      activation.installationMode,
    ]) as readonly ("DIRECT" | "AGENCY_BULK")[];

    const next: LocationInstallation = Object.freeze({
      installationId: existing?.installationId ?? installationIdFor(activation.locationId),
      locationId: activation.locationId,
      status: "ACTIVE",
      installationSources: sources,
      grantedScopes: uniqueSorted(activation.grantedScopes),
      scopeProfiles: uniqueSorted(activation.scopeProfiles),
      lifecycleVersion:
        existing === undefined || existing.status === "UNINSTALLED"
          ? (existing?.lifecycleVersion ?? 0) + 1
          : existing.lifecycleVersion,
      tokenUsable: true,
    });

    this.#installations.set(activation.locationId, next);
    return next;
  }

  public uninstall(locationId: string): LocationInstallation {
    const existing = this.#installations.get(locationId);
    if (existing === undefined) {
      throw new LocationAuthorizationError();
    }
    if (existing.status === "UNINSTALLED") {
      return existing;
    }

    const next: LocationInstallation = Object.freeze({
      ...existing,
      status: "UNINSTALLED",
      tokenUsable: false,
      lifecycleVersion: existing.lifecycleVersion + 1,
    });
    this.#installations.set(locationId, next);
    return next;
  }

  public get(locationId: string): LocationInstallation | undefined {
    return this.#installations.get(locationId);
  }

  public async uninstallAndScheduleDeletion(
    locationId: string,
    policy: TenantRetentionPolicy,
    now: Date,
    scheduler: TenantDeletionSchedulerPort,
  ): Promise<Readonly<{ installation: LocationInstallation; schedule: TenantDeletionSchedule }>> {
    if (
      !Number.isInteger(policy.retentionDays) ||
      policy.retentionDays < 0 ||
      policy.retentionDays > 3_650 ||
      policy.policyVersion.trim().length === 0
    ) {
      throw new LocationAuthorizationError();
    }
    const installation = this.uninstall(locationId);
    const existing = this.#deletionSchedules.get(installation.installationId);
    if (existing !== undefined) return { installation, schedule: existing };
    const schedule = Object.freeze({
      locationId,
      installationId: installation.installationId,
      policyVersion: policy.policyVersion,
      deleteAt: new Date(now.getTime() + policy.retentionDays * 86_400_000).toISOString(),
      reason: "tenant-uninstalled" as const,
    });
    await scheduler.schedule(schedule);
    this.#deletionSchedules.set(installation.installationId, schedule);
    return { installation, schedule };
  }

  public assertMayStartWork(context: ServerTenantContext): LocationInstallation {
    const installation = this.#installations.get(context.locationId);
    if (
      installation === undefined ||
      installation.installationId !== context.installationId ||
      !isInstallationActive(installation)
    ) {
      throw new LocationAuthorizationError();
    }
    return installation;
  }
}

export interface TenantRetentionPolicy {
  readonly policyVersion: string;
  readonly retentionDays: number;
}

export interface TenantDeletionSchedule {
  readonly locationId: string;
  readonly installationId: string;
  readonly policyVersion: string;
  readonly deleteAt: string;
  readonly reason: "tenant-uninstalled";
}

export interface TenantDeletionSchedulerPort {
  schedule(request: TenantDeletionSchedule): Promise<void>;
}

export async function processInstallationLifecycleDelivery<T>(
  untrustedDelivery: unknown,
  guard: DeliveryGuardPort,
  applyVerifiedLifecycleEvent: () => Promise<T>,
): Promise<Readonly<{ kind: "processed"; value: T }> | Readonly<{ kind: "duplicate" }>> {
  return processDelivery(untrustedDelivery, guard, async (delivery) => {
    if (delivery.deliveryKind !== "webhook") {
      throw new LocationAuthorizationError();
    }
    return applyVerifiedLifecycleEvent();
  });
}

const CAPABILITY_PROFILE: Readonly<Record<ProductCapability, ScopeProfile>> = Object.freeze({
  LOCATION_READ: "PROFILE_A_READ",
  INSTALL_MANAGE: "PROFILE_B_INSTALL",
  ADS_PUBLISH: "PROFILE_C_ADS_PUBLISH",
});

const CAPABILITY_SCOPE: Readonly<Record<ProductCapability, string>> = Object.freeze({
  LOCATION_READ: "locations.read",
  INSTALL_MANAGE: "installations.manage",
  ADS_PUBLISH: "ads.publish",
});

export function evaluateInstallationCapability(
  installation: LocationInstallation,
  capability: ProductCapability,
): boolean {
  if (!isInstallationActive(installation)) {
    return false;
  }

  const requiredProfile = CAPABILITY_PROFILE[capability];
  const requiredScope = CAPABILITY_SCOPE[capability];
  return (
    installation.scopeProfiles.includes(requiredProfile) &&
    installation.grantedScopes.includes(requiredScope)
  );
}
