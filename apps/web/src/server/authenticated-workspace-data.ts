import { z } from "zod";

import { loadSyntheticBrandProfile } from "../features/brand/model/synthetic-brand-profile.js";
import { loadSyntheticReporting } from "../features/reporting/model/synthetic-reporting.js";
import { loadSyntheticUiFixture } from "../features/ui-foundation/data/load-synthetic-ui.js";

export const OALO_REVIEW_SURFACE_ENV = "OALO_REVIEW_SURFACE" as const;
export const OALO_REVIEW_SURFACE_AUTHORIZED = "authorized" as const;

export const REVIEW_SURFACE_DISCLOSURE =
  "REVIEW SURFACE. Demo fixtures only. Not connected to HighLevel, Meta, or Stripe. These numbers are not live customer data.";

export type AuthenticatedWorkspaceMode = "synthetic" | "review";

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

function toReviewOverview(overview: ReturnType<typeof loadSyntheticUiFixture>["overview"]) {
  return {
    ...withReviewDisclosure(overview),
    heading: "Review dashboard (demo, not connected)",
    readiness: "attention_required" as const,
    health: overview.health.map((item) => ({
      ...item,
      state: "setup_required" as const,
      detail: "Not connected. Review surface only. No live provider link.",
      source: "Review surface. HighLevel, Meta, and Stripe are not connected.",
      freshness: "No live observation",
    })),
    metrics: overview.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      source: "Not connected. Review surface has no live spend, leads, or CRM feed.",
      freshness: "No live observation",
      synthetic: true as const,
      state: "unavailable" as const,
    })),
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
      session: withReviewDisclosure(ui.session),
      overview: toReviewOverview(ui.overview),
      onboarding: withReviewDisclosure(ui.onboarding),
    },
    brand: withReviewDisclosure(brand),
    reporting: withReviewDisclosure(reporting),
  });
}
