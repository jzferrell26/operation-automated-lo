import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  connectionStatementsOutsideTheSetupCard,
  repeatedConnectionStatements,
} from "../../../features/overview/components/connection-statements.test-support.js";
import { OverviewScreen } from "../../../features/overview/components/overview-screen.js";
import { buildHomeChecklist } from "../../../features/overview/model/home-checklist.js";
import type { HomeData } from "../../../features/overview/model/home-view.js";
import { loadSyntheticUiFixture } from "../../../features/ui-foundation/data/load-synthetic-ui.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";
import AuthenticatedLayout from "../layout.js";
import { useReviewModeEnvironment } from "../review-mode-test-support.js";
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
  // PRD-009a (009A-AC-014, 2026-10-01): the Marketing Suite sub-items left the fixture with the
  // six-item menu, so their four allowances went with them.
  {
    path: "navigation.items[*].state",
    because: "Closed navigationStateSchema enum; the visible label is component-authored.",
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

useReviewModeEnvironment();

/**
 * A signed-in owner of a brand-new account, as the page reads it: nothing saved, nothing connected,
 * no campaign, and an empty library (the real catalog ships empty, 009C-AC-012).
 */
const BRAND_NEW_ACCOUNT: HomeData = {
  checklist: buildHomeChecklist({ installationStatuses: ["pending"], brand: undefined }),
  topics: [],
  running: { rows: [], total: 0 },
  approval: { rows: [], total: 0 },
};

/**
 * The layout is an async server component since PRD-005a, and in review mode it resolves the shell
 * session from the request rather than from the fixture. No session is presented here, so the shell
 * renders its explicit not-signed-in identity. That is the state a review visitor actually reaches,
 * so it is the state this honesty sweep should cover.
 *
 * Amended on 2026-10-01 by PRD-009b: the page is Home, which reads its own data and takes nothing
 * from the fixture, so the sweep's job is now to prove that nothing from the fixture reaches it.
 */
async function renderReviewOverview(home: HomeData = BRAND_NEW_ACCOUNT) {
  const workspace = loadAuthenticatedWorkspace();
  const { container } = render(
    await AuthenticatedLayout({
      children: <OverviewScreen firstName="Alex" home={home} />,
    }),
  );
  return { container, workspace };
}

describe("review surface honesty invariant", () => {
  it("sweeps the whole fixture rather than a curated list of narrative keys", () => {
    const fixture = loadSyntheticUiFixture();

    // PRD-009a: the six-item menu replaced 15 navigation entries, so the fixture holds fewer
    // strings (382 on 2026-10-01); the floor still proves the sweep reads the whole fixture.
    expect(collectFixtureStrings(fixture).length).toBeGreaterThan(350);
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
    /**
     * The payload, not a page. It legitimately carries closed enums such as `setup_required` and
     * capability slugs, which gate what the page renders and which no user ever reads, so the
     * user-language contract's vocabulary does not apply here (PRD-006b D2 governs what is read).
     */
    const forbidden = forbiddenReviewStrings(
      loadSyntheticUiFixture(),
      projectionAllowances,
      "projection",
    );

    expect(leakedReviewStrings(projection, forbidden)).toEqual([]);
  });

  it("replaces navigation state detail and session provenance with review-mode statements", async () => {
    const { container, workspace } = await renderReviewOverview();

    expect(workspace.ui.navigation.items.every((item) => item.requiredRole === undefined)).toBe(
      true,
    );
    /**
     * Amended on 2026-10-01 by PRD-009 (009A-AC-014): every item of the six-item menu is
     * available, so no navigation item carries state detail to replace, and the locked-item
     * sentence "Available once your accounts are connected." no longer renders in the shell.
     */
    expect(workspace.ui.navigation.items.every((item) => item.stateDetail === undefined)).toBe(
      true,
    );
    expect(container.textContent).not.toContain("Available once your accounts are connected.");
    /**
     * Since PRD-005a the shell states the session it actually has. Without a real sign-in that is
     * "You're signed out", not the fixture's demo persona, so the fixture provenance string must be
     * absent rather than present. PRD-006b D4 supplies the words.
     */
    expect(container.textContent).not.toContain("Demo session");
    expect(container.textContent).not.toContain("Demo reviewer");
    expect(container.textContent).toContain("You're signed out");
    expect(container.textContent).toContain("Sign in to see your workspace");
  });
});

/**
 * 009B-AC-013. On the review URL, Home shows honest empty and not-connected states and no
 * unlabelled sample data. `RGL-002` (ledger `GGL-001`) and `004A-AC-003` (ledger `GGL-002`) are
 * re-proved here, on the new Home: nothing on the page is a figure with no live source, and every
 * not-connected fact is one the saved records support.
 */
describe("Home on the review surface (009B-AC-013)", () => {
  it("is the start card, the checklist, the two lists, and the footer, and nothing a CRM shows", async () => {
    const { container } = await renderReviewOverview();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "One property. One partner. A stronger first impression.",
    );
    expect(screen.getByRole("heading", { level: 2, name: "Launch an ad" })).toBeInTheDocument();
    for (const heading of ["Get set up", "Running now", "Needs your approval"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    for (const gone of ["Your numbers", "Quick actions", "Coming later", "Your workspace"]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
    expect(container.querySelector(".oalo-metric")).toBeNull();
    expect(container.querySelector("[data-demo-label]")).toBeNull();
    expect(container.querySelector("[data-overview-state]")).toBeNull();
  });

  it("shows no figure that has no live source: no money and no metric value", async () => {
    const { container } = await renderReviewOverview();
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/\$\s?\d/u);
    expect(container.querySelector(".oalo-metric__value")).toBeNull();
    for (const metric of ["Ad spend", "Appointments", "Opportunities", "Applications"]) {
      expect(text).not.toContain(metric);
    }
  });

  it("shows honest empty states: nothing running, nothing to approve, an empty library", async () => {
    await renderReviewOverview();

    for (const title of ["No ads running", "Nothing to approve"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(
      screen.getByText(
        "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sample ad")).toBeNull();
  });

  it("states what is not connected once, in the Get set up card, and nowhere else (009B-AC-008)", async () => {
    const { container } = await renderReviewOverview();

    expect(screen.getAllByText("Not connected yet")).toHaveLength(2);
    expect(connectionStatementsOutsideTheSetupCard(container)).toEqual([]);
    expect(repeatedConnectionStatements(container)).toEqual([]);
    expect(container.textContent).not.toContain("HighLevel and Meta aren't connected.");
    expect(container.textContent).not.toMatch(/Not connected\b(?! yet)/u);
  });
});
