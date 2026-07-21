import { z } from "zod";

import { parseRuntimeEnvironment, type RuntimeEnvironment } from "./environment.js";
import {
  parseProductionServiceConfiguration,
  type ProductionServiceConfiguration,
} from "./production-services.js";

const TriggerProjectReferenceSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/u);
const TaskAuthorityHmacKeySchema = z.string().regex(/^[a-f0-9]{64}$/u);
const JsonStringSchema = z.string().transform((value, context): unknown => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    context.addIssue({ code: "custom", message: "Expected valid JSON" });
    return z.NEVER;
  }
});
const ScheduledPublicationCleanupAuthoritySchema = JsonStringSchema.pipe(
  z
    .object({
      locationRef: z.string().min(8).max(128),
      locationId: z.uuid(),
      actorId: z.uuid(),
    })
    .strict(),
);
const HighLevelLocationPitSchema = JsonStringSchema.pipe(
  z
    .object({
      locationId: z.string().regex(/^[A-Za-z0-9_-]{3,128}$/u),
      accessToken: z.string().min(20).max(4_096).regex(/^\S+$/u),
    })
    .strict(),
);

export interface ProductionHighLevelLocationPitConfiguration {
  readonly locationRef: string;
  readonly locationId: string;
  readonly accessToken: string;
}

export interface ProductionTaskRuntimeConfiguration {
  readonly environment: RuntimeEnvironment;
  readonly highLevelLocationPit: ProductionHighLevelLocationPitConfiguration;
  readonly services: ProductionServiceConfiguration;
  readonly scheduledPublicationCleanupAuthority: Readonly<{
    locationRef: string;
    locationId: string;
    actorId: string;
  }>;
  readonly taskAuthorityHmacKey: string;
  readonly triggerProjectRef: string;
}

export class ProductionTaskRuntimeEnvironmentError extends Error {
  readonly code = "PRODUCTION_TASK_RUNTIME_ENVIRONMENT_INVALID" as const;

  constructor() {
    super("Production task runtime environment is absent or invalid.");
    this.name = "ProductionTaskRuntimeEnvironmentError";
  }
}

export function productionTriggerProjectReference(input: unknown): string {
  try {
    const record = z.record(z.string(), z.unknown()).parse(input);
    const environment = parseRuntimeEnvironment(record);
    const localReference =
      typeof record.TRIGGER_PROJECT_REF === "string"
        ? record.TRIGGER_PROJECT_REF
        : "proj_phase0_fixture_only";
    return TriggerProjectReferenceSchema.parse(
      environment.environment === "local" ? localReference : environment.identity.tasks,
    );
  } catch {
    throw new ProductionTaskRuntimeEnvironmentError();
  }
}

export function parseProductionTaskRuntimeConfiguration(
  input: unknown,
): ProductionTaskRuntimeConfiguration {
  try {
    const record = z.record(z.string(), z.unknown()).parse(input);
    const environment = parseRuntimeEnvironment(record);
    const services = parseProductionServiceConfiguration(record);
    if (environment.environment !== services.database.deploymentEnvironment) {
      throw new ProductionTaskRuntimeEnvironmentError();
    }
    const highLevelLocationPit = HighLevelLocationPitSchema.parse(
      record.OALO_GHL_LOCATION_PIT_JSON,
    );
    if (highLevelLocationPit.locationId !== services.ghl.readinessLocationRef) {
      throw new ProductionTaskRuntimeEnvironmentError();
    }
    const scheduledPublicationCleanupAuthority = ScheduledPublicationCleanupAuthoritySchema.parse(
      record.OALO_PUBLICATION_CLEANUP_SCHEDULE_AUTHORITY_JSON,
    );
    if (scheduledPublicationCleanupAuthority.locationRef !== services.ghl.readinessLocationRef) {
      throw new ProductionTaskRuntimeEnvironmentError();
    }
    return Object.freeze({
      environment,
      highLevelLocationPit: Object.freeze({
        locationRef: services.ghl.readinessLocationRef,
        locationId: highLevelLocationPit.locationId,
        accessToken: highLevelLocationPit.accessToken,
      }),
      services,
      scheduledPublicationCleanupAuthority: Object.freeze({
        locationRef: scheduledPublicationCleanupAuthority.locationRef,
        locationId: scheduledPublicationCleanupAuthority.locationId,
        actorId: scheduledPublicationCleanupAuthority.actorId,
      }),
      taskAuthorityHmacKey: TaskAuthorityHmacKeySchema.parse(record.OALO_TASK_AUTHORITY_HMAC_KEY),
      triggerProjectRef: TriggerProjectReferenceSchema.parse(environment.identity.tasks),
    });
  } catch (error) {
    if (error instanceof ProductionTaskRuntimeEnvironmentError) throw error;
    throw new ProductionTaskRuntimeEnvironmentError();
  }
}
