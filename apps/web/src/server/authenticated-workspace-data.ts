import { z } from "zod";

import type { CampaignPersistenceKind } from "@oalo/application";

import { loadSyntheticBrandProfile } from "../features/brand/model/synthetic-brand-profile.js";
import type { NotConnectedOverviewMetric } from "../features/overview/model/overview-view.js";
import { loadSyntheticReporting } from "../features/reporting/model/synthetic-reporting.js";
import { loadSyntheticUiFixture } from "../features/ui-foundation/data/load-synthetic-ui.js";
import type { DeepReadonly, Overview } from "../features/ui-foundation/model/synthetic-ui.js";

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

export const REVIEW_LOCATION_DISPLAY_NAME = "Demo workspace (not connected)";
export const REVIEW_USER_DISPLAY_NAME = "Demo reviewer";
export const REVIEW_ROLE_LABEL = "Demo session, no live seat";
export const REVIEW_SPEND_METRIC_ID = "ad_spend";
export const REVIEW_SPEND_METRIC_LABEL = "Ad spend";

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

function withReviewDisclosure<T extends { safety: { disclosure: string } }>(value: T): T {
  return {
    ...value,
    safety: {
      ...value.safety,
      disclosure: REVIEW_SURFACE_DISCLOSURE,
    },
  };
}

type OverviewStatus = DeepReadonly<Overview>["health"][number];

function toReviewStatus(item: OverviewStatus): OverviewStatus {
  return {
    ...item,
    state: "setup_required",
    detail: REVIEW_NOT_CONNECTED_DETAIL,
    source: REVIEW_NOT_CONNECTED_SOURCE,
    freshness: REVIEW_NO_OBSERVATION,
  };
}

/** The only metric shape the review surface may emit: labelled, sourced, and value-free. */
export function notConnectedReviewMetric(id: string, label: string): NotConnectedOverviewMetric {
  return {
    id,
    label,
    source: REVIEW_METRIC_SOURCE,
    freshness: REVIEW_NO_OBSERVATION,
    synthetic: true,
    state: "not_connected",
    nextAction: REVIEW_NEXT_SAFE_ACTION,
  };
}

function toReviewOverview(overview: ReturnType<typeof loadSyntheticUiFixture>["overview"]) {
  return {
    ...withReviewDisclosure(overview),
    heading: "Review dashboard (demo, not connected)",
    readiness: "attention_required" as const,
    health: overview.health.map(toReviewStatus),
    workspaceStatus: overview.workspaceStatus.map(toReviewStatus),
    metrics: [
      notConnectedReviewMetric(REVIEW_SPEND_METRIC_ID, REVIEW_SPEND_METRIC_LABEL),
      ...overview.metrics.map((metric) => notConnectedReviewMetric(metric.id, metric.label)),
    ],
    activeWork: [],
    attention: [],
    recentActivity: [],
  };
}

function toReviewSession(session: ReturnType<typeof loadSyntheticUiFixture>["session"]) {
  return {
    ...withReviewDisclosure(session),
    user: {
      ...session.user,
      displayName: REVIEW_USER_DISPLAY_NAME,
      roleLabel: REVIEW_ROLE_LABEL,
    },
    location: { ...session.location, displayName: REVIEW_LOCATION_DISPLAY_NAME },
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
      ...ui,
      session: toReviewSession(ui.session),
      overview: toReviewOverview(ui.overview),
      onboarding: withReviewDisclosure(ui.onboarding),
    },
    brand: withReviewDisclosure(brand),
    reporting: withReviewDisclosure(reporting),
  });
}
