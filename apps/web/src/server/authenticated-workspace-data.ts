import { z } from "zod";

import { loadSyntheticBrandProfile } from "../features/brand/model/synthetic-brand-profile.js";
import { loadSyntheticReporting } from "../features/reporting/model/synthetic-reporting.js";
import { loadSyntheticUiFixture } from "../features/ui-foundation/data/load-synthetic-ui.js";

const AuthenticatedWorkspaceRuntimeSchema = z
  .object({
    OALO_ENVIRONMENT: z.enum(["local", "preview", "staging", "production"]).default("local"),
    OALO_PROVIDER_MODE: z.enum(["stub", "contract-test", "live"]).default("stub"),
    OALO_SYNTHETIC_DATA_ONLY: z.enum(["true", "false"]).default("true"),
  })
  .passthrough();

export class AuthenticatedWorkspaceUnavailableError extends Error {
  public constructor(environment: string, providerMode: string) {
    super(
      `Authenticated workspace data is not connected for ${environment}/${providerMode}; refusing to render synthetic customer state.`,
    );
    this.name = "AuthenticatedWorkspaceUnavailableError";
  }
}

export function authenticatedWorkspaceMode(input: unknown = process.env): "synthetic" {
  const runtime = AuthenticatedWorkspaceRuntimeSchema.parse(input);
  if (
    (runtime.OALO_ENVIRONMENT === "local" || runtime.OALO_ENVIRONMENT === "preview") &&
    runtime.OALO_PROVIDER_MODE === "stub" &&
    runtime.OALO_SYNTHETIC_DATA_ONLY === "true"
  ) {
    return "synthetic";
  }

  throw new AuthenticatedWorkspaceUnavailableError(
    runtime.OALO_ENVIRONMENT,
    runtime.OALO_PROVIDER_MODE,
  );
}

export function loadAuthenticatedWorkspace(input: unknown = process.env) {
  authenticatedWorkspaceMode(input);
  return Object.freeze({
    ui: loadSyntheticUiFixture(),
    brand: loadSyntheticBrandProfile(),
    reporting: loadSyntheticReporting(),
  });
}
