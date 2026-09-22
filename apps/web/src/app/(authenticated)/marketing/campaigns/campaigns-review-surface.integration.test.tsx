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
    because: "Substring of the route heading about this campaign not being connected yet.",
  },
  {
    path: "campaign.metaConnection.assets[*].kind",
    value: "page",
    because:
      "Substring of the region name that names your Meta pages. The enum value is also the ordinary English word the copy has to use for a Facebook Page.",
  },
  {
    path: "campaign.artifacts[*].status",
    value: "approved",
    because: "Substring of the create route's own 'Ready for approval' and approval copy.",
  },
  {
    path: "campaign.creatives[*].placement",
    value: "story",
    because: "Substring of the create route's own copy.",
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
    because: "Substring of the region names that say what a connected Meta account would show.",
  },
  {
    path: "onboarding.getConnected[*].title",
    value: "Meta connection",
    because: "Substring of the region name 'Your Meta connection'; no setup step renders here.",
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
      "This campaign isn't connected yet",
    );
    expect(screen.getAllByText("Not connected yet").length).toBeGreaterThan(0);
  });

  it("names every campaign detail region as not connected instead of hiding the product", () => {
    const { container } = render(<SyntheticCampaignPage />);
    const values = [...container.querySelectorAll(".oalo-metric__value")].map(
      (element) => element.textContent ?? "",
    );

    expect(values.length).toBe(7);
    expect(values.every((value) => value === "Not connected")).toBe(true);
    for (const region of [
      "Your Meta connection",
      "What the approval covers",
      "The launch summary",
    ]) {
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
