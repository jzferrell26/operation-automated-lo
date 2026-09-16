import { z } from "zod";

import type { CampaignPersistenceKind } from "@oalo/application";

import {
  loadSyntheticBrandProfile,
  syntheticBrandProfileSchema,
  type SyntheticBrandProfile,
} from "../features/brand/model/synthetic-brand-profile.js";
import type { NotConnectedOverviewMetric } from "../features/overview/model/overview-view.js";
import { loadSyntheticReporting } from "../features/reporting/model/synthetic-reporting.js";
import { loadSyntheticUiFixture } from "../features/ui-foundation/data/load-synthetic-ui.js";
import {
  deepFreeze,
  onboardingSchema,
  SESSION_SOURCE_DEMO_NOT_CONNECTED,
  syntheticSessionSchema,
  type DeepReadonly,
  type Navigation,
  type NavigationItem,
  type Onboarding,
  type OnboardingItem,
  type Overview,
  type PermissionGroup,
  type SyntheticSession,
} from "../features/ui-foundation/model/synthetic-ui.js";

export const OALO_REVIEW_SURFACE_ENV = "OALO_REVIEW_SURFACE" as const;
export const OALO_REVIEW_SURFACE_AUTHORIZED = "authorized" as const;

export const REVIEW_SURFACE_DISCLOSURE =
  "REVIEW SURFACE. Demo fixtures only. Not connected to HighLevel, Meta, or Stripe. These numbers are not live customer data.";

/**
 * Review mode must never present a fixture as observed tenant state. Every region that would
 * read as live workspace truth collapses onto these strings instead of fixture narrative.
 */
const REVIEW_NOT_CONNECTED_DETAIL = "Not connected. Review surface only. No live provider link.";
const REVIEW_NOT_CONNECTED_SOURCE =
  "Review surface. HighLevel, Meta, and Stripe are not connected.";
const REVIEW_METRIC_SOURCE = "Not connected. Review surface has no live spend, leads, or CRM feed.";
const REVIEW_NO_OBSERVATION = "No live observation";
const REVIEW_NEXT_SAFE_ACTION =
  "Connect HighLevel, Meta, and Stripe in a separately authorized environment.";
const REVIEW_NAVIGATION_STATE_DETAIL =
  "Review surface. Demo navigation only. No live entitlement or provider state is evaluated.";

/**
 * Onboarding is the sharpest review-surface claim in the product, because a completed item carries
 * a verification time, a verifier version, and permitted provider references. None of those can
 * exist when nothing is connected, so every item collapses to `not_started`: the only state in
 * `onboardingItemSchema` that asserts no observation at all. `in_progress`, `blocked`, and `stale`
 * each assert an observation the review surface never made, and `complete` asserts evidence.
 */
const REVIEW_ONBOARDING_REASON =
  "Review surface. No install, provider read, or verification has been attempted here.";
const REVIEW_ONBOARDING_RESPONSIBLE_PARTY = "Unassigned. The review surface has no live seat.";

/**
 * `granted` and `missing` are observed classifications, so review mode restates each group label
 * as what the category *means* in this product rather than as something observed about a tenant.
 */
const REVIEW_PERMISSION_GROUP_LABELS: Readonly<Record<PermissionGroup["category"], string>> =
  Object.freeze({
    required: "Core access this app must request",
    granted: "Access this app verifies after install",
    missing: "Access this app reports when an outcome is blocked",
    optional: "Optional access this app can use",
  });
const REVIEW_PERMISSION_GROUP_DESCRIPTION =
  "Review surface. No provider authorization has occurred, so no capability here has an observed grant state.";
const REVIEW_PERMISSION_EVIDENCE =
  "No evidence. The review surface performs no capability read or authorization.";
const REVIEW_PERMISSION_IMPACT =
  "Not evaluated. Nothing in this deployment depends on an observed grant.";

const REVIEW_BRAND_PROFILE_ID = "synthetic-brand-profile-demo-review";
const REVIEW_BRAND_PROFILE_VERSION = "brand-v0-not-connected";
const REVIEW_BRAND_PROFILE_SOURCE =
  "Review surface. No brand profile version has human confirmation on this deployment.";
const REVIEW_BRAND_FIELD_VALUE = "Not saved. The review surface holds no brand value.";
const REVIEW_BRAND_FIELD_SOURCE = "Review surface. No human confirmation is recorded.";
const REVIEW_BRAND_MISSING_REASON =
  "Review surface. This field has no recorded human confirmation here.";
const REVIEW_BRAND_MISSING_NEXT_ACTION = "Confirm this field in a separately authorized workspace.";
const REVIEW_BRAND_SAMPLE_ID_PREFIX = "synthetic-approved-sample-review-slot-";
const REVIEW_BRAND_SUGGESTION_VALUE =
  "Not generated. The review surface makes no model requests and has no approved sample.";
const REVIEW_BRAND_CONFIDENCE_LABEL = "Not generated";

export const REVIEW_LOCATION_DISPLAY_NAME = "Demo workspace (not connected)";
export const REVIEW_USER_DISPLAY_NAME = "Demo reviewer";
export const REVIEW_ROLE_LABEL = "Demo session, no live seat";
export const REVIEW_SPEND_METRIC_ID = "ad_spend";
export const REVIEW_SPEND_METRIC_LABEL = "Ad spend";

/** The fixture identifiers carry the demo persona and tenant name, so review mode renames both. */
const REVIEW_USER_ID = "synthetic-user-demo-reviewer";
const REVIEW_LOCATION_ID = "synthetic-location-demo-review";

export type AuthenticatedWorkspaceMode = "synthetic" | "review";
export type { CampaignPersistenceKind };

const AuthenticatedWorkspaceRuntimeSchema = z
  .object({
    OALO_ENVIRONMENT: z.enum(["local", "preview", "staging", "production"]).default("local"),
    OALO_PROVIDER_MODE: z.enum(["stub", "contract-test", "live"]).default("stub"),
    OALO_SYNTHETIC_DATA_ONLY: z.enum(["true", "false"]).default("true"),
    OALO_REVIEW_SURFACE: z.string().optional(),
  })
  .passthrough();

type AuthenticatedWorkspaceRuntime = z.infer<typeof AuthenticatedWorkspaceRuntimeSchema>;

export class AuthenticatedWorkspaceUnavailableError extends Error {
  public constructor(environment: string, providerMode: string) {
    super(
      `Authenticated workspace data is not connected for ${environment}/${providerMode}; refusing to render synthetic customer state.`,
    );
    this.name = "AuthenticatedWorkspaceUnavailableError";
  }
}

function isStubSyntheticOnly(runtime: AuthenticatedWorkspaceRuntime): boolean {
  return runtime.OALO_PROVIDER_MODE === "stub" && runtime.OALO_SYNTHETIC_DATA_ONLY === "true";
}

export function isReviewSurfaceAuthorized(input: unknown = process.env): boolean {
  const runtime = AuthenticatedWorkspaceRuntimeSchema.parse(input);
  return runtime.OALO_REVIEW_SURFACE === OALO_REVIEW_SURFACE_AUTHORIZED;
}

export function authenticatedWorkspaceMode(
  input: unknown = process.env,
): AuthenticatedWorkspaceMode {
  const runtime = AuthenticatedWorkspaceRuntimeSchema.parse(input);

  if (!isStubSyntheticOnly(runtime)) {
    throw new AuthenticatedWorkspaceUnavailableError(
      runtime.OALO_ENVIRONMENT,
      runtime.OALO_PROVIDER_MODE,
    );
  }

  if (isReviewSurfaceAuthorized(runtime)) {
    return "review";
  }

  if (runtime.OALO_ENVIRONMENT === "local" || runtime.OALO_ENVIRONMENT === "preview") {
    return "synthetic";
  }

  throw new AuthenticatedWorkspaceUnavailableError(
    runtime.OALO_ENVIRONMENT,
    runtime.OALO_PROVIDER_MODE,
  );
}

export function campaignPersistenceKind(input: unknown = process.env): CampaignPersistenceKind {
  return authenticatedWorkspaceMode(input) === "synthetic" ? "filesystem" : "postgres";
}

export function canRenderReviewSurface(input: unknown = process.env): boolean {
  try {
    return authenticatedWorkspaceMode(input) === "review";
  } catch {
    return false;
  }
}

type ReviewSafety = DeepReadonly<Onboarding>["safety"];

/** `runtimeSafetySchema` pins `dataMode` and `writesEnabled`, so only the disclosure can move. */
function toReviewSafety(safety: ReviewSafety): ReviewSafety {
  return {
    dataMode: safety.dataMode,
    writesEnabled: safety.writesEnabled,
    disclosure: REVIEW_SURFACE_DISCLOSURE,
  };
}

type OverviewStatus = DeepReadonly<Overview>["health"][number];

function toReviewStatus(item: OverviewStatus): OverviewStatus {
  return {
    id: item.id,
    label: item.label,
    state: "setup_required",
    detail: REVIEW_NOT_CONNECTED_DETAIL,
    source: REVIEW_NOT_CONNECTED_SOURCE,
    freshness: REVIEW_NO_OBSERVATION,
  };
}

/** The only metric shape the review surface may emit: labelled, sourced, and value-free. */
export function notConnectedReviewMetric(
  id: string,
  label: string,
  source: string = REVIEW_METRIC_SOURCE,
): NotConnectedOverviewMetric {
  return {
    id,
    label,
    source,
    freshness: REVIEW_NO_OBSERVATION,
    synthetic: true,
    state: "not_connected",
    nextAction: REVIEW_NEXT_SAFE_ACTION,
  };
}

/**
 * Rebuilt field by field rather than spread, so a field added to `overviewSchema` later is dropped
 * from review mode until someone decides review mode may carry it. This projection is the one that
 * cannot be re-parsed by its own schema, because `notConnectedReviewMetric` deliberately emits a
 * state `metricSchema` cannot express.
 */
function toReviewOverview(overview: ReturnType<typeof loadSyntheticUiFixture>["overview"]) {
  return {
    safety: toReviewSafety(overview.safety),
    heading: "Review dashboard (demo, not connected)",
    readiness: "attention_required" as const,
    lastVerifiedAt: overview.lastVerifiedAt,
    health: overview.health.map(toReviewStatus),
    workspaceStatus: overview.workspaceStatus.map(toReviewStatus),
    metrics: [
      notConnectedReviewMetric(REVIEW_SPEND_METRIC_ID, REVIEW_SPEND_METRIC_LABEL),
      ...overview.metrics.map((metric) => notConnectedReviewMetric(metric.id, metric.label)),
    ],
    activeWork: [],
    attention: [],
    recentActivity: [],
    stateMatrix: overview.stateMatrix,
  };
}

function toReviewSession(
  session: ReturnType<typeof loadSyntheticUiFixture>["session"],
): DeepReadonly<SyntheticSession> {
  return deepFreeze(
    syntheticSessionSchema.parse({
      safety: toReviewSafety(session.safety),
      accessMode: session.accessMode,
      user: {
        id: REVIEW_USER_ID,
        displayName: REVIEW_USER_DISPLAY_NAME,
        role: session.user.role,
        roleLabel: REVIEW_ROLE_LABEL,
        capabilities: [...session.user.capabilities],
      },
      location: {
        id: REVIEW_LOCATION_ID,
        displayName: REVIEW_LOCATION_DISPLAY_NAME,
        source: SESSION_SOURCE_DEMO_NOT_CONNECTED,
        verifiedAt: session.location.verifiedAt,
      },
    }),
  );
}

/**
 * Every onboarding item collapses to `not_started`. The state model already has the honest state,
 * so nothing is invented: `complete` would claim a verification time, a verifier version, and
 * permitted provider references; `in_progress`, `blocked`, and `stale` each claim an observation
 * the review surface never made. `not_started` claims only that nothing has been attempted, which
 * is exactly true of a deployment with no provider link. Title and id are preserved because
 * `onboardingSchema` pins both per position, and because hiding the step would hide the product.
 */
function toReviewOnboardingItem(item: DeepReadonly<OnboardingItem>) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    freshness: REVIEW_NO_OBSERVATION,
    state: "not_started" as const,
    completionHref: item.completionHref,
    reason: REVIEW_ONBOARDING_REASON,
    responsibleParty: REVIEW_ONBOARDING_RESPONSIBLE_PARTY,
    nextAction: REVIEW_NEXT_SAFE_ACTION,
  };
}

function toReviewPermissionCapability(
  capability: DeepReadonly<PermissionGroup>["capabilities"][number],
) {
  return {
    id: capability.id,
    label: capability.label,
    businessPurpose: capability.businessPurpose,
    evidence: REVIEW_PERMISSION_EVIDENCE,
    impact: REVIEW_PERMISSION_IMPACT,
    nextAction: REVIEW_NEXT_SAFE_ACTION,
  };
}

function toReviewPermissionGroup(group: DeepReadonly<PermissionGroup>) {
  return {
    category: group.category,
    label: REVIEW_PERMISSION_GROUP_LABELS[group.category],
    description: REVIEW_PERMISSION_GROUP_DESCRIPTION,
    capabilities: group.capabilities.map(toReviewPermissionCapability),
  };
}

/**
 * The projection is re-parsed by the fixture's own schema. That does two things a hand-built object
 * literal cannot: it proves the collapsed states are legal members of the shipped state model
 * rather than invented ones, and it fails closed when a `.strict()` schema grows a required field,
 * instead of letting a spread carry that field onto the review surface.
 */
function toReviewOnboarding(onboarding: DeepReadonly<Onboarding>): DeepReadonly<Onboarding> {
  return deepFreeze(
    onboardingSchema.parse({
      safety: toReviewSafety(onboarding.safety),
      guidance: {
        title: onboarding.guidance.title,
        description: onboarding.guidance.description,
        dismissLabel: onboarding.guidance.dismissLabel,
      },
      permissionGroups: onboarding.permissionGroups.map(toReviewPermissionGroup),
      getConnected: onboarding.getConnected.map(toReviewOnboardingItem),
      launchReadiness: onboarding.launchReadiness.map(toReviewOnboardingItem),
    }),
  );
}

/**
 * Brand is workspace content rather than provider state, so the honest collapse is different: the
 * field names stay (they are the product's own required-field policy, which a reviewer should see)
 * and every confirmed value, confirmation source, and generated suggestion becomes an explicit
 * not-saved statement. Required fields all read `missing`, which is literally true here.
 */
function toReviewBrand(
  brand: DeepReadonly<SyntheticBrandProfile>,
): DeepReadonly<SyntheticBrandProfile> {
  const approvedSamples = brand.aiAssistance.approvedSamples.map((sample, index) => ({
    id: `${REVIEW_BRAND_SAMPLE_ID_PREFIX}${index + 1}`,
    displayName: `Approved sample slot ${index + 1}. None attached on the review surface.`,
    permission: sample.permission,
  }));

  return deepFreeze(
    syntheticBrandProfileSchema.parse({
      safety: toReviewSafety(brand.safety),
      activeLocation: { id: REVIEW_LOCATION_ID, displayName: REVIEW_LOCATION_DISPLAY_NAME },
      canonicalProfile: {
        id: REVIEW_BRAND_PROFILE_ID,
        version: REVIEW_BRAND_PROFILE_VERSION,
        current: brand.canonicalProfile.current,
        source: REVIEW_BRAND_PROFILE_SOURCE,
        fields: brand.canonicalProfile.fields.map((field) => ({
          id: field.id,
          label: field.label,
          value: REVIEW_BRAND_FIELD_VALUE,
          source: REVIEW_BRAND_FIELD_SOURCE,
        })),
        requiredFields: brand.canonicalProfile.requiredFields.map((field) => ({
          id: field.id,
          label: field.label,
          state: "missing" as const,
          reason: REVIEW_BRAND_MISSING_REASON,
          nextAction: REVIEW_BRAND_MISSING_NEXT_ACTION,
        })),
      },
      aiAssistance: {
        approvedSamples,
        suggestions: brand.aiAssistance.suggestions.map((suggestion) => ({
          id: suggestion.id,
          field: suggestion.field,
          label: suggestion.label,
          proposedValue: REVIEW_BRAND_SUGGESTION_VALUE,
          sourceSampleIds: approvedSamples.map((sample) => sample.id),
          confidenceLabel: REVIEW_BRAND_CONFIDENCE_LABEL,
          state: suggestion.state,
        })),
        protectedFieldGroups: [...brand.aiAssistance.protectedFieldGroups],
      },
    }),
  );
}

/**
 * Navigation is rebuilt field by field rather than spread, so a field added to the fixture later
 * is dropped from the review surface until someone decides review mode may carry it. The two
 * fields that read as observed workspace truth are handled explicitly: `stateDetail` narrates a
 * pending recheck or a plan entitlement that the review surface cannot have observed, and
 * `requiredRole` names the role the demo persona would need, which the anonymized review persona
 * does not have.
 */
function toReviewNavigationItem(item: DeepReadonly<NavigationItem>): DeepReadonly<NavigationItem> {
  return {
    id: item.id,
    label: item.label,
    href: item.href,
    state: item.state,
    ...(item.requiredCapability === undefined
      ? {}
      : { requiredCapability: item.requiredCapability }),
    ...(item.stateDetail === undefined ? {} : { stateDetail: REVIEW_NAVIGATION_STATE_DETAIL }),
  };
}

function toReviewNavigation(navigation: DeepReadonly<Navigation>): DeepReadonly<Navigation> {
  return {
    items: navigation.items.map(toReviewNavigationItem),
    marketingItems: navigation.marketingItems.map(toReviewNavigationItem),
  };
}

export function loadAuthenticatedWorkspace(input: unknown = process.env) {
  const mode = authenticatedWorkspaceMode(input);
  const ui = loadSyntheticUiFixture();
  const brand = loadSyntheticBrandProfile();
  const reporting = loadSyntheticReporting();

  if (mode !== "review") {
    return Object.freeze({
      mode,
      ui,
      brand,
      reporting,
    });
  }

  return Object.freeze({
    mode,
    ui: {
      navigation: toReviewNavigation(ui.navigation),
      session: toReviewSession(ui.session),
      overview: toReviewOverview(ui.overview),
      onboarding: toReviewOnboarding(ui.onboarding),
    },
    brand: toReviewBrand(brand),
    /**
     * No review route renders the reporting fixture: `/reports` and the synthetic campaign detail
     * route both branch to `ReviewNotConnectedScreen` in review mode. The disclosure is still
     * replaced so a future review consumer cannot pick up the synthetic one by accident.
     */
    reporting: { ...reporting, safety: toReviewSafety(reporting.safety) },
  });
}
