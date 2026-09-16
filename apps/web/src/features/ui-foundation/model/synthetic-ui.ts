import { z } from "zod";

const isoTimestamp = z.string().datetime({ offset: true });

export const runtimeSafetySchema = z
  .object({
    dataMode: z.literal("synthetic"),
    writesEnabled: z.literal(false),
    disclosure: z.string().min(1),
  })
  .strict();

/**
 * Session provenance is a closed vocabulary so no projection can invent a validation claim.
 * The synthetic fixture always carries the first value; the review surface, which validates no
 * session at all, is the only projection allowed to carry the second.
 */
export const SESSION_SOURCE_VALIDATED_SYNTHETIC = "Validated synthetic session";
export const SESSION_SOURCE_DEMO_NOT_CONNECTED = "Demo session. No validated HighLevel location.";

export const capabilitySchema = z.enum([
  "campaign:create",
  "location:read",
  "onboarding:read",
  "pipeline:read",
  "reports:read",
  "settings:read",
]);

export const syntheticSessionSchema = z
  .object({
    safety: runtimeSafetySchema,
    accessMode: z.enum(["embedded", "first-party"]),
    user: z
      .object({
        id: z.string().startsWith("synthetic-user-"),
        displayName: z.string().min(1),
        role: z.enum([
          "loan_officer",
          "team_member",
          "agency_user",
          "owner",
          "compliance_approver",
        ]),
        roleLabel: z.string().min(1),
        capabilities: z.array(capabilitySchema),
      })
      .strict(),
    location: z
      .object({
        id: z.string().startsWith("synthetic-location-"),
        displayName: z.string().min(1),
        source: z.enum([SESSION_SOURCE_VALIDATED_SYNTHETIC, SESSION_SOURCE_DEMO_NOT_CONNECTED]),
        verifiedAt: isoTimestamp,
      })
      .strict(),
  })
  .strict();

export const navigationStateSchema = z.enum([
  "available",
  "permission_restricted",
  "unavailable",
  "planned",
  "degraded",
]);

const navigationItemSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    href: z.string().startsWith("/"),
    state: navigationStateSchema,
    requiredCapability: capabilitySchema.optional(),
    requiredRole: z.string().min(1).optional(),
    stateDetail: z.string().min(1).optional(),
  })
  .strict();

export const navigationSchema = z
  .object({
    items: z.array(navigationItemSchema).length(9),
    marketingItems: z.array(navigationItemSchema).length(6),
  })
  .strict();

const metricCommonShape = {
  id: z.string(),
  label: z.string(),
  source: z.string(),
  freshness: z.string(),
  synthetic: z.literal(true),
} as const;

export const metricSchema = z.discriminatedUnion("state", [
  z
    .object({
      ...metricCommonShape,
      state: z.literal("current"),
      value: z.union([z.string(), z.number()]),
    })
    .strict(),
  z
    .object({
      ...metricCommonShape,
      state: z.literal("stale"),
      value: z.union([z.string(), z.number()]),
      nextAction: z.string(),
    })
    .strict(),
  z
    .object({
      ...metricCommonShape,
      state: z.literal("unavailable"),
    })
    .strict(),
  z
    .object({
      ...metricCommonShape,
      state: z.literal("partial"),
      value: z.union([z.string(), z.number()]),
      pendingSources: z.array(z.string()).min(1),
    })
    .strict(),
  z
    .object({
      ...metricCommonShape,
      state: z.literal("uncertain"),
      value: z.union([z.string(), z.number()]),
      correlationId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      ...metricCommonShape,
      state: z.literal("permission_restricted"),
      requiredRole: z.string(),
      accessPath: z.string(),
    })
    .strict(),
]);

const statusSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    state: z.enum(["healthy", "attention", "setup_required", "restricted", "planned"]),
    detail: z.string(),
    source: z.string(),
    freshness: z.string(),
  })
  .strict();

const attentionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    affectedModule: z.string(),
    severity: z.enum(["warning", "critical", "uncertain"]),
    responsibleParty: z.string(),
    remediation: z.string(),
    nextAction: z.string(),
    lastAttempt: z.string(),
    exceptionCode: z.string(),
    correlationId: z.string(),
  })
  .strict();

const activitySchema = z
  .object({
    id: z.string(),
    module: z.enum(["Marketing", "Partners", "Leads", "Brand", "System"]),
    summary: z.string(),
    occurredAt: isoTimestamp,
    synthetic: z.literal(true),
  })
  .strict();

const workItemSchema = z
  .object({
    id: z.string(),
    type: z.enum(["campaign", "partner", "property_site", "ai_confirmation", "system"]),
    title: z.string(),
    status: z.string(),
    nextAction: z.string(),
  })
  .strict();

export const overviewStateKindSchema = z.enum([
  "loading",
  "new_workspace",
  "setup_incomplete",
  "blocked",
  "healthy_without_campaign",
  "provider_degraded",
  "unavailable_data",
  "restricted_viewer",
  "authorized_agency",
  "route_error",
  "safe_retry",
]);

export const overviewSchema = z
  .object({
    safety: runtimeSafetySchema,
    heading: z.string(),
    readiness: z.enum(["launch_ready", "attention_required"]),
    lastVerifiedAt: isoTimestamp,
    health: z.array(statusSchema).length(6),
    metrics: z.array(metricSchema).length(8),
    activeWork: z.array(workItemSchema).min(5),
    attention: z.array(attentionSchema).min(1),
    recentActivity: z.array(activitySchema).min(5),
    workspaceStatus: z.array(statusSchema).min(9),
    stateMatrix: z.array(overviewStateKindSchema).length(11),
  })
  .strict();

const evidenceSchema = z
  .object({
    summary: z.string(),
    verifiedAt: isoTimestamp,
    verifierVersion: z.string(),
    providerIds: z.array(z.string().startsWith("synthetic-")).optional(),
  })
  .strict();

const completeOnboardingItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    freshness: z.string(),
    state: z.literal("complete"),
    completionHref: z.string().startsWith("/"),
    evidence: evidenceSchema,
  })
  .strict();

const incompleteOnboardingItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    freshness: z.string(),
    state: z.enum(["not_started", "in_progress", "blocked", "stale"]),
    completionHref: z.string().startsWith("/"),
    reason: z.string(),
    responsibleParty: z.string(),
    nextAction: z.string(),
  })
  .strict();

export const onboardingItemSchema = z.discriminatedUnion("state", [
  completeOnboardingItemSchema,
  incompleteOnboardingItemSchema,
]);

const permissionCapabilitySchema = z
  .object({
    id: z.string().startsWith("synthetic-permission-"),
    label: z.string().min(1),
    businessPurpose: z.string().min(1),
    evidence: z.string().min(1),
    impact: z.string().min(1),
    nextAction: z.string().min(1),
  })
  .strict();

const exactPermissionGroup = (category: "required" | "granted" | "missing" | "optional") =>
  z
    .object({
      category: z.literal(category),
      label: z.string().min(1),
      description: z.string().min(1),
      capabilities: z.array(permissionCapabilitySchema).min(1),
    })
    .strict();

const exactOnboardingItem = (id: string, title: string) =>
  onboardingItemSchema.refine((item) => item.id === id && item.title === title, {
    message: `Expected onboarding item ${id}: ${title}`,
  });

export const onboardingSchema = z
  .object({
    safety: runtimeSafetySchema,
    guidance: z
      .object({
        title: z.string().min(1),
        description: z.string().min(1),
        dismissLabel: z.string().min(1),
      })
      .strict(),
    permissionGroups: z.tuple([
      exactPermissionGroup("required"),
      exactPermissionGroup("granted"),
      exactPermissionGroup("missing"),
      exactPermissionGroup("optional"),
    ]),
    getConnected: z.tuple([
      exactOnboardingItem("install_permissions", "Install and permissions"),
      exactOnboardingItem("brand_compliance", "Brand and compliance"),
      exactOnboardingItem("ghl_routing", "HighLevel routing"),
      exactOnboardingItem("meta_connection", "Meta connection"),
      exactOnboardingItem("team_responsibilities", "Team responsibilities"),
    ]),
    launchReadiness: z.tuple([
      exactOnboardingItem("dependency_recheck", "Dependency recheck"),
      exactOnboardingItem("synthetic_lead", "Synthetic lead"),
      exactOnboardingItem("results_review", "Results review"),
      exactOnboardingItem("launch_ready", "Launch Ready"),
    ]),
  })
  .strict();

export const syntheticUiFixtureSchema = z
  .object({
    session: syntheticSessionSchema,
    navigation: navigationSchema,
    overview: overviewSchema,
    onboarding: onboardingSchema,
  })
  .strict();

export type Capability = z.infer<typeof capabilitySchema>;
export type NavigationItem = z.infer<typeof navigationItemSchema>;
export type Navigation = z.infer<typeof navigationSchema>;
export type SyntheticSession = z.infer<typeof syntheticSessionSchema>;
export type Overview = z.infer<typeof overviewSchema>;
export type OverviewStateKind = z.infer<typeof overviewStateKindSchema>;
export type Onboarding = z.infer<typeof onboardingSchema>;
export type OnboardingItem = z.infer<typeof onboardingItemSchema>;
export type PermissionGroup = Onboarding["permissionGroups"][number];
export type SyntheticUiFixture = z.infer<typeof syntheticUiFixtureSchema>;

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }

  return value as DeepReadonly<T>;
}

export function parseSyntheticUiFixture(input: unknown): DeepReadonly<SyntheticUiFixture> {
  return deepFreeze(syntheticUiFixtureSchema.parse(input));
}
