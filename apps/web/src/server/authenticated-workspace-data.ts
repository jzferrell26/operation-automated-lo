import { z } from "zod";

import type { CampaignPersistenceKind } from "@oalo/application";

import {
  ACCESS_GROUP_DESCRIPTION,
  ACCESS_GROUP_LABELS,
  ACCESS_NO_EFFECT_YET,
  ACCESS_NOTHING_CHECKED,
  BRAND_FIELD_SOURCE,
  BRAND_FIELD_VALUE,
  BRAND_MISSING_NEXT_STEP,
  BRAND_MISSING_REASON,
  BRAND_PROFILE_SOURCE,
  BRAND_SUGGESTION_CONFIDENCE,
  BRAND_SUGGESTION_VALUE,
  brandSampleSlotLabel,
  NOT_CONNECTED_DETAIL,
  NOT_CONNECTED_DISCLOSURE,
  NOT_CONNECTED_HEADLINE,
  NOT_CONNECTED_NAVIGATION_DETAIL,
  NOT_CONNECTED_NEXT_STEP,
  NOT_CONNECTED_SETUP_OWNER,
  NOT_CONNECTED_SETUP_REASON,
  NOT_CONNECTED_SOURCE,
  NOT_LIVE_METRIC_SOURCE,
  NOT_LIVE_YET,
  WORKSPACE_EYEBROW,
} from "../copy/user-language.js";
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

/**
 * Every string a not-connected workspace shows comes from `../copy/user-language.js`, so the words
 * and their meaning move together. PRD-006b D4 rewrote the wording; the truths are unchanged, and
 * PRD-004 RGL-002 still holds: no spend, lead, or outcome figure is presented as live.
 *
 * The exported names below keep their shape because other modules import them by name. What each
 * one holds is now a shared constant rather than a literal written here.
 */
export const REVIEW_SURFACE_DISCLOSURE = NOT_CONNECTED_DISCLOSURE;

/**
 * A not-connected workspace must never present a fixture as observed tenant state. Every region
 * that would read as live workspace truth collapses onto these strings instead.
 */
const REVIEW_NOT_CONNECTED_DETAIL = NOT_CONNECTED_DETAIL;
const REVIEW_NOT_CONNECTED_SOURCE = NOT_CONNECTED_SOURCE;
const REVIEW_METRIC_SOURCE = NOT_LIVE_METRIC_SOURCE;
const REVIEW_NO_OBSERVATION = NOT_LIVE_YET;
const REVIEW_NEXT_SAFE_ACTION = NOT_CONNECTED_NEXT_STEP;
const REVIEW_NAVIGATION_STATE_DETAIL = NOT_CONNECTED_NAVIGATION_DETAIL;

/**
 * Onboarding is the sharpest claim in the product, because a completed item carries a verification
 * time, a checker version, and permitted account references. None of those can exist when nothing
 * is connected, so every item collapses to `not_started`: the only state in `onboardingItemSchema`
 * that asserts nothing was ever checked. `in_progress`, `blocked`, and `stale` each assert a
 * reading that was never taken, and `complete` asserts a result.
 */
const REVIEW_ONBOARDING_REASON = NOT_CONNECTED_SETUP_REASON;
const REVIEW_ONBOARDING_RESPONSIBLE_PARTY = NOT_CONNECTED_SETUP_OWNER;

/**
 * `granted` and `missing` are classifications of something observed, so a not-connected workspace
 * restates each group label as what the group *means* in this product rather than as something
 * observed about the user's accounts.
 */
const REVIEW_PERMISSION_GROUP_LABELS: Readonly<Record<PermissionGroup["category"], string>> =
  ACCESS_GROUP_LABELS;
const REVIEW_PERMISSION_GROUP_DESCRIPTION = ACCESS_GROUP_DESCRIPTION;
const REVIEW_PERMISSION_EVIDENCE = ACCESS_NOTHING_CHECKED;
const REVIEW_PERMISSION_IMPACT = ACCESS_NO_EFFECT_YET;

const REVIEW_BRAND_PROFILE_ID = "synthetic-brand-profile-demo-review";
const REVIEW_BRAND_PROFILE_VERSION = "brand-v0-not-connected";
const REVIEW_BRAND_PROFILE_SOURCE = BRAND_PROFILE_SOURCE;
const REVIEW_BRAND_FIELD_VALUE = BRAND_FIELD_VALUE;
const REVIEW_BRAND_FIELD_SOURCE = BRAND_FIELD_SOURCE;
const REVIEW_BRAND_MISSING_REASON = BRAND_MISSING_REASON;
const REVIEW_BRAND_MISSING_NEXT_ACTION = BRAND_MISSING_NEXT_STEP;
const REVIEW_BRAND_SAMPLE_ID_PREFIX = "synthetic-approved-sample-review-slot-";
const REVIEW_BRAND_SUGGESTION_VALUE = BRAND_SUGGESTION_VALUE;
const REVIEW_BRAND_CONFIDENCE_LABEL = BRAND_SUGGESTION_CONFIDENCE;

/**
 * The workspace and account names a not-connected deployment shows. PRD-006a replaces all three
 * with the signed-in user's real name, their workspace's name, and their role label (006A-AC-028);
 * until then they say what is true, which is that nothing is connected to this workspace.
 */
export const REVIEW_LOCATION_DISPLAY_NAME = WORKSPACE_EYEBROW;
export const REVIEW_USER_DISPLAY_NAME = "Your account";
export const REVIEW_ROLE_LABEL = NOT_CONNECTED_HEADLINE;
export const REVIEW_SPEND_METRIC_ID = "ad_spend";
export const REVIEW_SPEND_METRIC_LABEL = "Ad spend";

/**
 * The fixture ids carry the demo persona and tenant name, so review mode renames both. They keep
 * the `synthetic-` prefix the fixture schema requires, and no screen renders either of them:
 * PRD-006b D5 removed the one that did, the brand profile id on the brand screen.
 */
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

/** The mode, or `undefined` where `authenticatedWorkspaceMode` refuses to serve anything at all. */
function servableWorkspaceMode(input: unknown): AuthenticatedWorkspaceMode | undefined {
  try {
    return authenticatedWorkspaceMode(input);
  } catch {
    return undefined;
  }
}

export function canRenderReviewSurface(input: unknown = process.env): boolean {
  return servableWorkspaceMode(input) === "review";
}

/**
 * Whether this deployment is an intentional synthetic demo. Unauthenticated routes gate on this
 * rather than on the absence of review mode, so an environment the mode function refuses to
 * classify serves nothing instead of falling through to the fixture.
 */
export function canRenderSyntheticDemo(input: unknown = process.env): boolean {
  return servableWorkspaceMode(input) === "synthetic";
}

/**
 * A path a user can read in the address bar is copy (PRD-006b D2 and 006B-AC-012). The demo keeps
 * its `synthetic-*` slugs, because renaming a demo route is not this sub-PRD's job, but nothing a
 * connected-account workspace links to may carry one. Anything that does falls back to the section
 * it belongs to rather than pointing at a demo page.
 */
function userSafeHref(href: string): string {
  if (!/synthetic/iu.test(href)) {
    return href;
  }
  const section = href.slice(0, href.indexOf("/", 1));
  return section.length > 0 ? section : "/overview";
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
    heading: "Overview",
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
    completionHref: userSafeHref(item.completionHref),
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
    displayName: brandSampleSlotLabel(index + 1),
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
    href: userSafeHref(item.href),
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
