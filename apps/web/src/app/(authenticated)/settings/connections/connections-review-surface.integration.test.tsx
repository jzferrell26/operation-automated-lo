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
    because: "Substring of the not-connected group label 'Optional access'.",
  },
  {
    path: "onboarding.permissionGroups[*].label",
    value: "Missing",
    because:
      "The screen's own state chip for the missing group renders this word (PRD-006b D5 rule R4); the fixture's group label never reaches this route.",
  },
  {
    path: "onboarding.getConnected[*].state",
    value: "blocked",
    because:
      "Substring of the group label 'Access this app tells you about when something is blocked'.",
  },
  {
    path: "navigation.items[*].id",
    value: "reports",
    because: "Substring of the allowed capability label 'Read agency reports'.",
  },
  {
    path: "overview.activeWork[*].type",
    value: "campaign",
    because: "Substring of the allowed capability label 'Create campaigns'.",
  },
  {
    path: "overview.health[*].id",
    value: "routing",
    because: "Substring of the allowed business purpose that names your HighLevel routing.",
  },
  {
    path: "overview.health[*].label",
    value: "HighLevel",
    because: "Substring of the not-connected disclosure, which names all three accounts.",
  },
  {
    path: "overview.health[*].label",
    value: "Meta",
    because: "Substring of the not-connected disclosure.",
  },
  {
    path: "navigation.items[*].id",
    value: "leads",
    because: "Substring of the allowed business purpose about where new leads land.",
  },
  {
    path: "navigation.marketingItems[*].id",
    value: "campaigns",
    because: "Substring of the allowed capability label 'Create campaigns'.",
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
    expect(capabilities.every((capability) => capability.evidence === "Nothing checked yet.")).toBe(
      true,
    );
    expect(
      capabilities.every((capability) => capability.impact === "No effect until you connect."),
    ).toBe(true);
    expect(container.textContent).not.toContain("Synthetic App Test evidence verified");
    expect(
      screen.getAllByText(
        "You haven't connected HighLevel yet, so there's nothing to confirm here.",
      ).length,
    ).toBe(4);
  });

  it("restates each group label as the category's meaning rather than an observation", () => {
    const { workspace } = renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const labels = workspace.ui.onboarding.permissionGroups.map((group) => group.label);

    expect(labels).toEqual([
      "Access this app needs",
      "Access this app confirms after you connect",
      "Access this app tells you about when something is blocked",
      "Optional access",
    ]);
  });

  it("keeps the demo-rich synthetic permission evidence for local development", () => {
    const { container } = renderConnections("local", undefined);
    const forbidden = forbiddenReviewStrings(loadSyntheticUiFixture(), connectionsAllowances);

    expect(container.textContent).toContain("Synthetic App Test evidence verified");
    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden).length).toBeGreaterThan(10);
  });
});
