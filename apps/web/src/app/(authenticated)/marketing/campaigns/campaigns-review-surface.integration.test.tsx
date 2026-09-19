import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadSyntheticReporting } from "../../../../features/reporting/model/synthetic-reporting.js";
import { loadSyntheticUiFixture } from "../../../../features/ui-foundation/data/load-synthetic-ui.js";
import { OALO_REVIEW_SURFACE_AUTHORIZED } from "../../../../server/authenticated-workspace-data.js";
import {
  collectFixtureStrings,
  forbiddenReviewStrings,
  leakedReviewStrings,
  reviewSurfaceText,
  staleAllowances,
  type ReviewSurfaceAllowance,
} from "../../review-surface-sweep.js";
import CampaignListPage from "./page.js";
import NewCampaignPage from "./new/page.js";
import SyntheticCampaignPage from "./synthetic-open-house-001/page.js";

const redirectCalls: string[] = [];

vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/navigation.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation.js")>();
  return {
    ...actual,
    redirect(path: string) {
      redirectCalls.push(path);
      return actual.redirect(path);
    },
  };
});

/**
 * Nothing from the synthetic reporting fixture may reach any marketing campaign route in review
 * mode. The synthetic detail route branches to `ReviewNotConnectedScreen`, the list route reads
 * persisted records and finds none, and the create route is a static form, so every entry below is
 * a short closed-vocabulary token that happens to be a substring of route-authored copy.
 */
const reportingAllowances: readonly ReviewSurfaceAllowance[] = [
  {
    path: "campaign.metaConnection.state",
    value: "connected",
    because: "Substring of the route heading 'This campaign is not connected'.",
  },
  {
    path: "campaign.artifacts[*].status",
    value: "approved",
    because: "Substring of the create route's own 'Ready for approval' and approval copy.",
  },
  {
    path: "portfolio.locations[*].state",
    value: "authorized",
    because: "Substring of the not-connected next safe action, '... separately authorized ...'.",
  },
  {
    path: "campaign.creatives[*].placement",
    value: "story",
    because: "Substring of the region name 'Campaign history'.",
  },
];

/** The synthetic UI fixture must not reach these routes either; the same tokens collide. */
const uiAllowances: readonly ReviewSurfaceAllowance[] = [
  {
    path: "navigation.marketingItems[*].href",
    value: "/marketing/campaigns",
    because: "Substring of the create route's '/marketing/campaigns/new' quick action.",
  },
  {
    path: "navigation.items[*].href",
    value: "/marketing",
    because: "Substring of the same route path; navigation does not render on these routes.",
  },
  {
    path: "navigation.marketingItems[*].id",
    value: "campaigns",
    because: "Substring of the same route path; navigation does not render on these routes.",
  },
  {
    path: "navigation.items[*].id",
    value: "marketing",
    because: "Substring of the same route path; navigation does not render on these routes.",
  },
  {
    path: "navigation.marketingItems[*].label",
    value: "Campaigns",
    because: "Substring of the list route's own heading, 'Campaigns in this location'.",
  },
  {
    path: "overview.activeWork[*].type",
    value: "campaign",
    because: "Substring of route-authored campaign copy such as 'Create campaign'.",
  },
  {
    path: "overview.health[*].label",
    value: "HighLevel",
    because: "Substring of the review disclosure and the create route's provider-disabled notice.",
  },
  {
    path: "overview.health[*].label",
    value: "Meta",
    because: "Substring of the review disclosure and of the 'Meta connection' region name.",
  },
  {
    path: "overview.health[*].id",
    value: "meta",
    because: "Substring of the 'Meta plan' fieldset legend on the create route.",
  },
  {
    path: "overview.health[*].label",
    value: "Freshness",
    because: "Substring of the Metric component's own 'Freshness' caption.",
  },
  {
    path: "onboarding.getConnected[*].title",
    value: "Meta connection",
    because: "The region name the review campaign screen prints; no onboarding item renders here.",
  },
  {
    path: "onboarding.getConnected[*].state",
    value: "blocked",
    because: "Substring of the create route's 'Preflight blocked' heading branch.",
  },
  {
    path: "session.safety.dataMode",
    because: "Literal 'synthetic' fixed by runtimeSafetySchema.",
  },
];

function stubWorkspaceEnvironment(environment: string, reviewSurface: string | undefined): void {
  vi.stubEnv("OALO_ENVIRONMENT", environment);
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", reviewSurface);
}

beforeEach(() => {
  redirectCalls.length = 0;
  stubWorkspaceEnvironment("production", OALO_REVIEW_SURFACE_AUTHORIZED);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function sweepSurface(container: HTMLElement): readonly string[] {
  const surface = reviewSurfaceText(container);
  return [
    ...leakedReviewStrings(
      surface,
      forbiddenReviewStrings(loadSyntheticReporting(), reportingAllowances),
    ),
    ...leakedReviewStrings(surface, forbiddenReviewStrings(loadSyntheticUiFixture(), uiAllowances)),
  ];
}

describe("authenticated marketing campaign routes", () => {
  it("sweeps both whole fixtures rather than a hardcoded amount", () => {
    const reporting = loadSyntheticReporting();
    const ui = loadSyntheticUiFixture();

    expect(collectFixtureStrings(reporting).length).toBeGreaterThan(100);
    expect(collectFixtureStrings(ui).length).toBeGreaterThan(400);
    expect(forbiddenReviewStrings(reporting, reportingAllowances).length).toBeGreaterThan(80);
    expect(forbiddenReviewStrings(ui, uiAllowances).length).toBeGreaterThan(200);
    expect(staleAllowances(reporting, reportingAllowances)).toEqual([]);
    expect(staleAllowances(ui, uiAllowances)).toEqual([]);
  });

  it("keeps every unallowed fixture string off the review synthetic campaign detail route", () => {
    const { container } = render(<SyntheticCampaignPage />);

    expect(sweepSurface(container)).toEqual([]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "This campaign is not connected",
    );
    expect(screen.getByText("REVIEW / DEMO / NOT CONNECTED")).toBeInTheDocument();
  });

  it("names every campaign detail region as not connected instead of hiding the product", () => {
    const { container } = render(<SyntheticCampaignPage />);
    const values = [...container.querySelectorAll(".oalo-metric__value")].map(
      (element) => element.textContent ?? "",
    );

    expect(values.length).toBe(7);
    expect(values.every((value) => value === "Not connected")).toBe(true);
    for (const region of ["Meta connection", "Approval scope", "Launch summary"]) {
      expect(screen.getByRole("article", { name: region })).toBeInTheDocument();
    }
  });

  it("keeps every unallowed fixture string off the review campaign create route", () => {
    const { container } = render(<NewCampaignPage />);

    expect(sweepSurface(container)).toEqual([]);
  });

  /**
   * PRD-005a 005A-AC-010. "No campaigns in this location yet" is a claim about a tenant, so the
   * review list route no longer renders it for a visitor with no verified session. It redirects to
   * the review sign-in path instead, which Next.js signals by throwing a redirect.
   */
  it("redirects an unauthenticated review visitor instead of listing an empty location", async () => {
    await expect(CampaignListPage()).rejects.toMatchObject({ digest: expect.any(String) });

    expect(redirectCalls).toEqual(["/sign-in"]);
  });

  it("keeps the demo-rich synthetic campaign detail for local development", () => {
    stubWorkspaceEnvironment("local", undefined);

    const { container } = render(<SyntheticCampaignPage />);

    expect(sweepSurface(container).length).toBeGreaterThan(20);
  });
});
