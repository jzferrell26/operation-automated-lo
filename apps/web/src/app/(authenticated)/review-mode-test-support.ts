import { createElement } from "react";
import { afterEach, beforeEach, vi } from "vitest";

import { OALO_REVIEW_SURFACE_AUTHORIZED } from "../../server/authenticated-workspace-data.js";
import type { RuntimeShellSession } from "../../server/runtime-authentication.js";

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

/*
 * Stubs for the modules the authenticated layout reaches that the two suites do not test. Each is
 * the body of a `vi.mock` factory. The factory runs when `./layout.js` is first imported, after the
 * suite's own imports have finished, so it can call these directly.
 */

/** The theme control: a labelled element, so the layout renders without the real theme provider. */
export function themeModuleStub(controlLabel: string) {
  return {
    ThemeControl: () => createElement("div", { "aria-label": controlLabel }, "Theme control"),
  };
}

/**
 * The guided setup is the layout's other dependency and has nothing to do with what these suites
 * prove. Saying there are no preferences yet is the honest answer for a brand-new account and
 * keeps each suite failing for one reason only.
 */
export function setupPreferencesModuleStub() {
  return { readSetupPreferencesForRequest: () => Promise.resolve(undefined) };
}

/**
 * Everything except the session resolution is the real module, including the path constants the
 * shell's forms post to, so a rename on either side fails in the suite rather than shipping a
 * control that posts nowhere. `currentShell` is read on every call, so a test can change the
 * session between renders.
 */
export async function runtimeAuthenticationModuleStub(
  importOriginal: <Module>() => Promise<Module>,
  currentShell: () => RuntimeShellSession,
) {
  const actual = await importOriginal<typeof import("../../server/runtime-authentication.js")>();
  return { ...actual, resolveRuntimeShellSession: () => Promise.resolve(currentShell()) };
}
