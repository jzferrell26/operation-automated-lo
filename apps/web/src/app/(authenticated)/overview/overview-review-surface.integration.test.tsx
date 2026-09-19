import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OverviewScreen } from "../../../features/overview/components/overview-screen.js";
import { loadSyntheticUiFixture } from "../../../features/ui-foundation/data/load-synthetic-ui.js";
import {
  OALO_REVIEW_SURFACE_AUTHORIZED,
  loadAuthenticatedWorkspace,
} from "../../../server/authenticated-workspace-data.js";
import AuthenticatedLayout from "../layout.js";
import {
  collectFixtureStrings,
  forbiddenReviewStrings,
  leakedReviewStrings,
  reviewSurfaceText,
  staleAllowances,
  type ReviewSurfaceAllowance,
} from "../review-surface-sweep.js";

vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/navigation.js", () => ({ usePathname: () => "/overview" }));
vi.mock("../../../theme/index.js", () => ({
  ThemeControl: () => <div aria-label="Theme control">Theme control</div>,
}));

/**
 * Every synthetic UI fixture string that may legitimately reach a rendered review surface. Nothing
 * else may, so a fixture field added later is a failure until someone lands here and justifies it.
 *
 * Entries without a `value` allow the whole field. Entries with a `value` allow only that one
 * string, which is how the sweep tolerates a short fixture value that happens to be a substring of
 * component-authored review copy without also tolerating the rest of that field.
 */
const renderedAllowances: readonly ReviewSurfaceAllowance[] = [
  // The demo's own information architecture. Review mode still has to be navigable and labelled,
  // and these name routes in this product rather than anything observed about a tenant.
  { path: "navigation.items[*].id", because: "Route slug, rendered only inside its own href." },
  { path: "navigation.items[*].label", because: "Name of a route in this product." },
  { path: "navigation.items[*].href", because: "Route path the review reviewer navigates with." },
  { path: "navigation.marketingItems[*].id", because: "Route slug of a marketing subroute." },
  { path: "navigation.marketingItems[*].label", because: "Name of a marketing subroute." },
  { path: "navigation.marketingItems[*].href", because: "Marketing subroute path." },
  {
    path: "navigation.items[*].state",
    because: "Closed navigationStateSchema enum; the visible label is component-authored.",
  },
  {
    path: "navigation.marketingItems[*].state",
    because: "Closed navigationStateSchema enum; the visible label is component-authored.",
  },
  {
    path: "navigation.items[*].requiredRole",
    value: "Owner or Agency User",
    because:
      "Review navigation drops requiredRole; this hit is the illustrative edge-state matrix card in overview-edge-state-matrix.tsx, which is labelled a design reference.",
  },

  // Region identity the review projection deliberately keeps. Collapsing a region's evidence while
  // still naming the region is the whole point of the not-connected projection.
  { path: "overview.health[*].id", because: "Health region slug kept by toReviewStatus." },
  { path: "overview.health[*].label", because: "Health region name kept by toReviewStatus." },
  {
    path: "overview.health[*].state",
    because: "Closed statusSchema enum, and review mode overwrites it with setup_required.",
  },
  {
    path: "overview.metrics[*].label",
    because: "Metric name kept by notConnectedReviewMetric; the value itself never renders.",
  },
  { path: "overview.metrics[*].state", because: "Closed metricSchema discriminator." },
  { path: "overview.workspaceStatus[*].label", because: "Workspace module name kept by review." },
  { path: "overview.workspaceStatus[*].state", because: "Closed statusSchema enum." },
  {
    path: "overview.stateMatrix[*]",
    because:
      "Closed overviewStateKindSchema enum, rendered only by the card grid carrying data-demo-label='overview-edge-state-matrix'.",
  },
  {
    path: "overview.activeWork[*].type",
    because: "Closed workItemSchema enum; review mode empties activeWork entirely.",
  },
  {
    path: "overview.recentActivity[*].module",
    because: "Closed activitySchema enum of five module names; review mode empties recentActivity.",
  },
  { path: "session.safety.dataMode", because: "Literal 'synthetic' fixed by runtimeSafetySchema." },
  {
    path: "overview.safety.dataMode",
    because: "Literal 'synthetic' fixed by runtimeSafetySchema.",
  },
  {
    path: "onboarding.safety.dataMode",
    because: "Literal 'synthetic' fixed by runtimeSafetySchema.",
  },

  // Onboarding narrative never renders on the review overview. These are substring collisions with
  // component-authored copy, so each is pinned to the single colliding value.
  { path: "onboarding.permissionGroups[*].category", because: "Closed permission-group enum." },
  { path: "onboarding.getConnected[*].state", because: "Closed onboarding-item state enum." },
  {
    path: "onboarding.getConnected[*].completionHref",
    because: "Route paths that collide with the navigation and quick-action hrefs.",
  },
  {
    path: "onboarding.permissionGroups[*].label",
    value: "Required",
    because: "Substring of the component-authored readiness chip 'Attention Required'.",
  },
  {
    path: "onboarding.launchReadiness[*].title",
    value: "Synthetic lead",
    because:
      "Substring of the component-authored metric caption 'Synthetic leads are excluded. ...'.",
  },

  // Role names that the illustrative edge-state matrix prints as part of its own demo cards.
  {
    path: "overview.attention[*].responsibleParty",
    value: "Location Owner",
    because: "Printed by the illustrative edge-state matrix; review mode empties attention.",
  },
  {
    path: "onboarding.getConnected[*].responsibleParty",
    value: "Location Owner",
    because: "Printed by the illustrative edge-state matrix; onboarding does not render here.",
  },
  {
    path: "onboarding.launchReadiness[*].responsibleParty",
    value: "Location Owner",
    because: "Printed by the illustrative edge-state matrix; onboarding does not render here.",
  },
  {
    path: "overview.workspaceStatus[*].detail",
    value: "Active",
    because:
      "Substring of the metric names 'Active partners' and 'Active campaigns'; review mode replaces every workspaceStatus detail.",
  },
];

/**
 * Additional strings the review projection may carry in the server payload even though no review
 * surface renders them. They are slugs, closed enums, and timestamps rather than narrative.
 */
const projectionOnlyAllowances: readonly ReviewSurfaceAllowance[] = [
  {
    path: "navigation.items[*].requiredCapability",
    because: "Capability slug that gates navigation; never rendered.",
  },
  { path: "overview.metrics[*].id", because: "Metric slug kept by notConnectedReviewMetric." },
  { path: "overview.workspaceStatus[*].id", because: "Workspace module slug kept by review." },
  { path: "overview.readiness", because: "Closed enum; review mode sets attention_required." },
  {
    path: "overview.lastVerifiedAt",
    because:
      "Timestamp carried by the spread but never rendered in review mode, which prints 'Last system verification: none.' instead.",
  },
  {
    path: "session.location.verifiedAt",
    because: "Timestamp carried by the spread; the review shell renders no verification time.",
  },
  {
    path: "onboarding.getConnected[*].evidence.verifiedAt",
    because: "Timestamp carried by the spread; onboarding evidence does not render in review mode.",
  },
  { path: "session.accessMode", because: "Closed enum describing the embed mode, not a tenant." },
  { path: "session.user.role", because: "Closed role enum; the displayed roleLabel is replaced." },
  {
    path: "session.user.capabilities[*]",
    because: "Closed capability enum that gates navigation.",
  },
];

const projectionAllowances: readonly ReviewSurfaceAllowance[] = [
  ...renderedAllowances,
  ...projectionOnlyAllowances,
];

beforeEach(() => {
  vi.stubEnv("OALO_ENVIRONMENT", "production");
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", OALO_REVIEW_SURFACE_AUTHORIZED);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * The layout is an async server component since PRD-005a, and in review mode it resolves the shell
 * session from the request rather than from the fixture. No session is presented here, so the shell
 * renders its explicit not-signed-in identity. That is the state a review visitor actually reaches,
 * so it is the state this honesty sweep should cover.
 */
async function renderReviewOverview() {
  const workspace = loadAuthenticatedWorkspace();
  const { container } = render(
    await AuthenticatedLayout({
      children: (
        <OverviewScreen
          overview={workspace.ui.overview}
          session={workspace.ui.session}
          workspaceCampaigns={[]}
          workspaceMode="review"
        />
      ),
    }),
  );
  return { container, workspace };
}

describe("review surface honesty invariant", () => {
  it("sweeps the whole fixture rather than a curated list of narrative keys", () => {
    const fixture = loadSyntheticUiFixture();

    expect(collectFixtureStrings(fixture).length).toBeGreaterThan(400);
    expect(forbiddenReviewStrings(fixture, renderedAllowances).length).toBeGreaterThan(200);
    expect(staleAllowances(fixture, projectionAllowances)).toEqual([]);
  });

  it("keeps every unallowed fixture string out of the rendered review route", async () => {
    const { container } = await renderReviewOverview();
    const forbidden = forbiddenReviewStrings(loadSyntheticUiFixture(), renderedAllowances);

    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden)).toEqual([]);
  });

  it("keeps every unallowed fixture string out of the review workspace projection", () => {
    const workspace = loadAuthenticatedWorkspace();
    const projection = JSON.stringify({
      navigation: workspace.ui.navigation,
      overview: workspace.ui.overview,
      session: workspace.ui.session,
    });
    const forbidden = forbiddenReviewStrings(loadSyntheticUiFixture(), projectionAllowances);

    expect(leakedReviewStrings(projection, forbidden)).toEqual([]);
  });

  it("replaces navigation state detail and session provenance with review-mode statements", async () => {
    const { container, workspace } = await renderReviewOverview();

    expect(workspace.ui.navigation.items.every((item) => item.requiredRole === undefined)).toBe(
      true,
    );
    expect(container.textContent).toContain(
      "Review surface. Demo navigation only. No live entitlement or provider state is evaluated.",
    );
    /**
     * Since PRD-005a the review shell states the session it actually has. Without a verified
     * first-party session that is "Not signed in", not the fixture's demo persona, so the fixture
     * provenance string must be absent rather than present.
     */
    expect(container.textContent).not.toContain("Demo session. No validated HighLevel location.");
    expect(container.textContent).not.toContain("Demo reviewer");
    expect(container.textContent).toContain("Not signed in");
    expect(container.textContent).toContain(
      "No first-party session was presented, so no location was resolved.",
    );
    expect(screen.getByText("REVIEW / DEMO / NOT CONNECTED")).toBeInTheDocument();
  });

  it("renders no numeric demo value in any review metric", async () => {
    const { container } = await renderReviewOverview();
    const values = [...container.querySelectorAll(".oalo-metric__value")].map(
      (element) => element.textContent ?? "",
    );

    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value === "Not connected")).toBe(true);
    expect(values.join(" ")).not.toMatch(/\d/u);
  });

  it("reaches an honest not-connected representation for spend and leads", async () => {
    await renderReviewOverview();

    for (const label of ["Ad spend", "New leads"]) {
      const metric = screen.getByRole("article", { name: label });
      expect(within(metric).getByText("Not connected", { selector: ".oalo-state-label" }));
      expect(metric.textContent).toContain(
        "Not connected. Review surface has no live spend, leads, or CRM feed.",
      );
    }
  });

  it("replaces the persona header and the verification claim in review mode", async () => {
    const { container } = await renderReviewOverview();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Review dashboard (demo, not connected)",
    );
    expect(container.textContent).toContain("Demo workspace (not connected)");
    expect(container.textContent).toContain(
      "Last system verification: none. The review surface performs no live verification.",
    );
  });

  it("shows honest empty regions instead of fixture operational state", async () => {
    await renderReviewOverview();

    for (const title of [
      "No attention items to show",
      "No recorded activity to show",
      "No campaigns in this location yet",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("labels the illustrative edge-state matrix as demo rather than tenant data", async () => {
    const { container } = await renderReviewOverview();
    const label = container.querySelector("[data-demo-label='overview-edge-state-matrix']");

    expect(label?.textContent).toContain("Illustrative demo states");
  });
});
