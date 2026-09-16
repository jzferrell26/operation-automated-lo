import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingScreen } from "../../../features/onboarding/components/onboarding-screen.js";
import { loadSyntheticUiFixture } from "../../../features/ui-foundation/data/load-synthetic-ui.js";
import {
  OALO_REVIEW_SURFACE_AUTHORIZED,
  loadAuthenticatedWorkspace,
} from "../../../server/authenticated-workspace-data.js";
import {
  collectFixtureStrings,
  forbiddenReviewStrings,
  leakedReviewStrings,
  reviewSurfaceText,
  staleAllowances,
  type ReviewSurfaceAllowance,
} from "../review-surface-sweep.js";

/**
 * Every synthetic UI fixture string that may legitimately reach the rendered review onboarding
 * route. Onboarding is the sharpest review claim in the product, because the fixture marks an item
 * `complete` with a verification time, a verifier version, and a permitted provider id. None of
 * that may survive, so the list below is only item identity, the product's own step descriptions,
 * and closed enums. A fixture field added later is a failure until someone lands here.
 */
const onboardingAllowances: readonly ReviewSurfaceAllowance[] = [
  {
    path: "onboarding.getConnected[*].title",
    because: "Names a step of this product's setup flow; onboardingSchema pins it per position.",
  },
  {
    path: "onboarding.launchReadiness[*].title",
    because: "Names a readiness step of this product; onboardingSchema pins it per position.",
  },
  {
    path: "onboarding.getConnected[*].description",
    because: "Describes what the step would verify. A capability statement, not an observation.",
  },
  {
    path: "onboarding.launchReadiness[*].description",
    because: "Describes what the readiness step would verify, not what was observed.",
  },
  {
    path: "onboarding.getConnected[*].completionHref",
    because: "Route path in this product that the reviewer navigates with.",
  },
  {
    path: "onboarding.getConnected[*].state",
    because: "Closed onboarding-item enum, and review mode overwrites every item with not_started.",
  },
  {
    path: "onboarding.launchReadiness[*].state",
    because: "Closed onboarding-item enum, overwritten with not_started by toReviewOnboardingItem.",
  },
  {
    path: "onboarding.guidance.title",
    because: "Optional product guidance card. Says nothing about a tenant or a provider.",
  },
  {
    path: "onboarding.guidance.description",
    because: "States that dismissing guidance changes no persisted state. Honest in review mode.",
  },
  { path: "onboarding.guidance.dismissLabel", because: "Label of the guidance dismiss button." },
  {
    path: "onboarding.safety.dataMode",
    because: "Literal 'synthetic' fixed by runtimeSafetySchema.",
  },

  // Short closed-vocabulary tokens that are substrings of copy this route legitimately renders.
  // Each is pinned to its one colliding value, so the rest of the field stays forbidden.
  {
    path: "onboarding.permissionGroups[*].label",
    value: "Required",
    because: "Substring of the screen's own component-authored 'Attention Required' chip.",
  },
  {
    path: "onboarding.permissionGroups[*].category",
    value: "missing",
    because: "Substring of the guidance dismiss copy, 'Dismissing guidance cannot complete...'.",
  },
  {
    path: "onboarding.permissionGroups[*].category",
    value: "optional",
    because: "Substring of the step description '... field mappings, and optional workflow.'.",
  },
  {
    path: "navigation.items[*].href",
    value: "/settings",
    because: "Substring of the allowed completion hrefs such as '/settings/connections'.",
  },
  {
    path: "navigation.items[*].id",
    value: "settings",
    because: "Substring of the allowed completion hrefs; navigation does not render on this route.",
  },
  {
    path: "navigation.items[*].id",
    value: "brand",
    because: "Substring of the allowed completion href '/brand'.",
  },
  {
    path: "overview.recentActivity[*].module",
    value: "Brand",
    because: "Substring of the pinned step title 'Brand and compliance'.",
  },
  {
    path: "overview.metrics[*].state",
    value: "current",
    because: "Substring of the checklist's component-authored '... with current ... evidence.'.",
  },
  {
    path: "overview.health[*].id",
    value: "freshness",
    because: "Substring of the component-authored 'Evidence freshness:' label.",
  },
  {
    path: "overview.health[*].id",
    value: "meta",
    because: "Substring of 'metric exclusions' in the pinned Results review description.",
  },
  {
    path: "overview.health[*].id",
    value: "routing",
    because: "Substring of the pinned step titles and descriptions that name HighLevel routing.",
  },
  {
    path: "overview.health[*].label",
    value: "HighLevel",
    because: "Substring of the review disclosure and of the pinned 'HighLevel routing' step title.",
  },
  {
    path: "overview.health[*].label",
    value: "Meta",
    because: "Substring of the review disclosure and of the pinned 'Meta connection' step title.",
  },
];

beforeEach(() => {
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function renderOnboarding(environment: string, reviewSurface: string | undefined) {
  vi.stubEnv("OALO_ENVIRONMENT", environment);
  vi.stubEnv("OALO_REVIEW_SURFACE", reviewSurface);
  const workspace = loadAuthenticatedWorkspace();
  const { container } = render(
    <OnboardingScreen onboarding={workspace.ui.onboarding} session={workspace.ui.session} />,
  );
  return { container, workspace };
}

describe("authenticated onboarding route", () => {
  it("sweeps the whole fixture rather than a curated list of onboarding keys", () => {
    const fixture = loadSyntheticUiFixture();

    expect(collectFixtureStrings(fixture).length).toBeGreaterThan(400);
    expect(forbiddenReviewStrings(fixture, onboardingAllowances).length).toBeGreaterThan(200);
    expect(staleAllowances(fixture, onboardingAllowances)).toEqual([]);
  });

  it("keeps every unallowed fixture string out of the rendered review onboarding route", () => {
    const { container } = renderOnboarding("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const forbidden = forbiddenReviewStrings(loadSyntheticUiFixture(), onboardingAllowances);

    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden)).toEqual([]);
  });

  it("reports every onboarding item as not started instead of verified", () => {
    const { container, workspace } = renderOnboarding("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const items = [
      ...workspace.ui.onboarding.getConnected,
      ...workspace.ui.onboarding.launchReadiness,
    ];

    expect(items.length).toBe(9);
    expect(items.every((item) => item.state === "not_started")).toBe(true);
    expect(items.some((item) => "evidence" in item)).toBe(false);
    expect(container.querySelectorAll("[data-state='complete']")).toHaveLength(0);
    for (const evidence of [
      "synthetic-verifier-1.0.0",
      "synthetic-install-app-test-001",
      "2026-07-21T14:30:00.000Z",
      "Verified 8 minutes ago",
    ]) {
      expect(container.textContent).not.toContain(evidence);
    }
    expect(screen.getByLabelText("0 of 5 complete")).toBeInTheDocument();
    expect(screen.getByLabelText("0 of 4 complete")).toBeInTheDocument();
  });

  it("replaces every onboarding reason, owner, and freshness claim with a review statement", () => {
    const { workspace } = renderOnboarding("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const items = [
      ...workspace.ui.onboarding.getConnected,
      ...workspace.ui.onboarding.launchReadiness,
    ];

    for (const item of items) {
      expect(item.freshness).toBe("No live observation");
      expect(item.state === "complete" ? "" : item.reason).toMatch(/Review surface/u);
      expect(item.state === "complete" ? "" : item.responsibleParty).toMatch(/no live seat/u);
    }
  });

  it("keeps the demo-rich synthetic onboarding checklist for local development", () => {
    const { container, workspace } = renderOnboarding("local", undefined);
    const forbidden = forbiddenReviewStrings(loadSyntheticUiFixture(), onboardingAllowances);

    expect(workspace.ui.onboarding.getConnected.some((item) => item.state === "complete")).toBe(
      true,
    );
    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden).length).toBeGreaterThan(20);
  });
});
