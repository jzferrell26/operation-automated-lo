import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PermissionScreen } from "../../../../features/onboarding/components/permission-screen.js";
import { loadSyntheticUiFixture } from "../../../../features/ui-foundation/data/load-synthetic-ui.js";
import {
  OALO_REVIEW_SURFACE_AUTHORIZED,
  loadAuthenticatedWorkspace,
} from "../../../../server/authenticated-workspace-data.js";
import {
  collectFixtureStrings,
  forbiddenReviewStrings,
  leakedReviewStrings,
  reviewSurfaceText,
  staleAllowances,
  type ReviewSurfaceAllowance,
} from "../../review-surface-sweep.js";

/**
 * Every synthetic UI fixture string that may legitimately reach the rendered review connections
 * route. The fixture states which capabilities are granted and which are missing, and dates the
 * grant evidence; none of that can be observed with no install, so only capability identity, the
 * business purpose the app declares for each scope, and closed enums survive.
 */
const connectionsAllowances: readonly ReviewSurfaceAllowance[] = [
  {
    path: "onboarding.permissionGroups[*].capabilities[*].label",
    because: "Names a capability this app can request. Product structure, not observed state.",
  },
  {
    path: "onboarding.permissionGroups[*].capabilities[*].businessPurpose",
    because:
      "The declared reason this app would request the scope. A Marketplace reviewer needs it, and it claims nothing about this deployment.",
  },
  {
    path: "onboarding.permissionGroups[*].category",
    because:
      "Closed permission-group enum used as the section key; review mode restates the group label as the category's meaning.",
  },
  {
    path: "onboarding.safety.dataMode",
    because: "Literal 'synthetic' fixed by runtimeSafetySchema.",
  },

  // Short closed-vocabulary tokens that collide with copy this route legitimately renders.
  // Each is pinned to its one colliding value, so the rest of the field stays forbidden.
  {
    path: "onboarding.permissionGroups[*].label",
    value: "Optional",
    because: "Substring of the review group label 'Optional access this app can use'.",
  },
  {
    path: "onboarding.getConnected[*].state",
    value: "blocked",
    because:
      "Substring of the review group label 'Access this app reports when an outcome is blocked'.",
  },
  {
    path: "navigation.items[*].id",
    value: "reports",
    because: "Substring of the same review group label; navigation does not render here.",
  },
  {
    path: "overview.activeWork[*].type",
    value: "campaign",
    because: "Substring of the allowed business purpose 'Prepare campaign drafts ...'.",
  },
  {
    path: "overview.health[*].id",
    value: "routing",
    because: "Substring of the allowed business purposes that name safe routing context.",
  },
  {
    path: "overview.health[*].label",
    value: "HighLevel",
    because: "Substring of the review disclosure, 'Not connected to HighLevel, Meta, or Stripe.'.",
  },
  {
    path: "overview.health[*].label",
    value: "Meta",
    because: "Substring of the review disclosure.",
  },
];

beforeEach(() => {
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function renderConnections(environment: string, reviewSurface: string | undefined) {
  vi.stubEnv("OALO_ENVIRONMENT", environment);
  vi.stubEnv("OALO_REVIEW_SURFACE", reviewSurface);
  const workspace = loadAuthenticatedWorkspace();
  const { container } = render(<PermissionScreen onboarding={workspace.ui.onboarding} />);
  return { container, workspace };
}

describe("authenticated settings connections route", () => {
  it("sweeps the whole fixture rather than a curated list of permission keys", () => {
    const fixture = loadSyntheticUiFixture();

    expect(collectFixtureStrings(fixture).length).toBeGreaterThan(400);
    expect(forbiddenReviewStrings(fixture, connectionsAllowances).length).toBeGreaterThan(200);
    expect(staleAllowances(fixture, connectionsAllowances)).toEqual([]);
  });

  it("keeps every unallowed fixture string out of the rendered review connections route", () => {
    const { container } = renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const forbidden = forbiddenReviewStrings(loadSyntheticUiFixture(), connectionsAllowances);

    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden)).toEqual([]);
  });

  it("states that no capability has an observed grant state", () => {
    const { container, workspace } = renderConnections(
      "production",
      OALO_REVIEW_SURFACE_AUTHORIZED,
    );
    const capabilities = workspace.ui.onboarding.permissionGroups.flatMap(
      (group) => group.capabilities,
    );

    expect(capabilities.length).toBeGreaterThan(0);
    expect(capabilities.every((capability) => capability.evidence.startsWith("No evidence."))).toBe(
      true,
    );
    expect(capabilities.every((capability) => capability.impact.startsWith("Not evaluated."))).toBe(
      true,
    );
    expect(container.textContent).not.toContain("Synthetic App Test evidence verified");
    expect(screen.getAllByText(/observed grant state/u).length).toBe(4);
  });

  it("restates each group label as the category's meaning rather than an observation", () => {
    const { workspace } = renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const labels = workspace.ui.onboarding.permissionGroups.map((group) => group.label);

    expect(labels).toEqual([
      "Core access this app must request",
      "Access this app verifies after install",
      "Access this app reports when an outcome is blocked",
      "Optional access this app can use",
    ]);
  });

  it("keeps the demo-rich synthetic permission evidence for local development", () => {
    const { container } = renderConnections("local", undefined);
    const forbidden = forbiddenReviewStrings(loadSyntheticUiFixture(), connectionsAllowances);

    expect(container.textContent).toContain("Synthetic App Test evidence verified");
    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden).length).toBeGreaterThan(10);
  });
});
