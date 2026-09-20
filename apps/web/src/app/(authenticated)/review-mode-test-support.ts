import { afterEach, beforeEach, vi } from "vitest";

import { OALO_REVIEW_SURFACE_AUTHORIZED } from "../../server/authenticated-workspace-data.js";

/**
 * The four environment values that put `authenticatedWorkspaceMode` into `review`.
 *
 * Two suites under this route group render the authenticated layout as a review visitor reaches
 * it, and both need exactly this environment. It is declared once so the two cannot drift into
 * testing two different deployments while appearing to test the same one.
 *
 * Call it at module scope in a suite that needs review mode; it installs its own setup and
 * teardown, and the teardown clears every stub the suite made, not only these four.
 */
export function useReviewModeEnvironment(): void {
  beforeEach(() => {
    vi.stubEnv("OALO_ENVIRONMENT", "production");
    vi.stubEnv("OALO_PROVIDER_MODE", "stub");
    vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
    vi.stubEnv("OALO_REVIEW_SURFACE", OALO_REVIEW_SURFACE_AUTHORIZED);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
}
