import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import {
  OALO_REVIEW_SURFACE_AUTHORIZED,
  OALO_REVIEW_SURFACE_ENV,
  loadAuthenticatedWorkspace,
} from "../../../server/authenticated-workspace-data.js";
import { OverviewScreen } from "./overview-screen.js";

const reviewEnvironment = {
  OALO_ENVIRONMENT: "production",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
  [OALO_REVIEW_SURFACE_ENV]: OALO_REVIEW_SURFACE_AUTHORIZED,
} as const;

/**
 * Keys whose fixture values read as observed tenant narrative. Structural labels (`label`,
 * `affectedModule`, `responsibleParty`, `module`) are deliberately excluded: they name a region or
 * a role, and the review surface keeps naming its regions. Collection is generic so a new fixture
 * field under any of these keys is covered without editing this test.
 */
const narrativeKeys: ReadonlySet<string> = new Set([
  "accessPath",
  "correlationId",
  "detail",
  "disclosure",
  "exceptionCode",
  "freshness",
  "heading",
  "nextAction",
  "pendingSources",
  "remediation",
  "source",
  "status",
  "summary",
  "title",
]);

/** Persona identity is short, so it is swept without a length floor. */
const identityKeys: ReadonlySet<string> = new Set(["displayName", "roleLabel"]);

/** Below this, fixture values are single words like "Active" that collide with region labels. */
const minimumNarrativeLength = 12;

function collectStrings(
  value: unknown,
  key: string,
  keys: ReadonlySet<string>,
  minimumLength: number,
  found: Set<string>,
): void {
  if (typeof value === "string") {
    if (keys.has(key) && value.length >= minimumLength) {
      found.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectStrings(entry, key, keys, minimumLength, found);
    }
    return;
  }

  if (typeof value === "object" && value !== null) {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectStrings(childValue, childKey, keys, minimumLength, found);
    }
  }
}

function syntheticFixtureNarrative(): readonly string[] {
  const fixture = loadSyntheticUiFixture();
  const found = new Set<string>();
  collectStrings(fixture.overview, "", narrativeKeys, minimumNarrativeLength, found);
  collectStrings(fixture.session, "", identityKeys, 1, found);
  return [...found];
}

function renderReviewOverview() {
  const workspace = loadAuthenticatedWorkspace(reviewEnvironment);
  const { container } = render(
    <OverviewScreen
      overview={workspace.ui.overview}
      session={workspace.ui.session}
      workspaceCampaigns={[]}
      workspaceMode="review"
    />,
  );
  return { container, workspace };
}

describe("review surface honesty invariant", () => {
  it("collects a meaningful set of fixture narrative to assert against", () => {
    expect(syntheticFixtureNarrative().length).toBeGreaterThan(30);
  });

  it("keeps synthetic fixture narrative out of the review workspace projection", () => {
    const workspace = loadAuthenticatedWorkspace(reviewEnvironment);
    const projection = JSON.stringify({
      overview: workspace.ui.overview,
      session: workspace.ui.session,
    });

    expect(syntheticFixtureNarrative().filter((value) => projection.includes(value))).toEqual([]);
  });

  it("keeps synthetic fixture narrative out of the rendered review overview", () => {
    const { container } = renderReviewOverview();
    const rendered = container.textContent ?? "";

    expect(syntheticFixtureNarrative().filter((value) => rendered.includes(value))).toEqual([]);
  });

  it("renders no numeric demo value in any review metric", () => {
    const { container } = renderReviewOverview();
    const values = [...container.querySelectorAll(".oalo-metric__value")].map(
      (element) => element.textContent ?? "",
    );

    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value === "Not connected")).toBe(true);
    expect(values.join(" ")).not.toMatch(/\d/u);
  });

  it("reaches an honest not-connected representation for spend and leads", () => {
    renderReviewOverview();

    for (const label of ["Ad spend", "New leads"]) {
      const metric = screen.getByRole("article", { name: label });
      expect(within(metric).getByText("Not connected", { selector: ".oalo-state-label" }));
      expect(metric.textContent).toContain(
        "Not connected. Review surface has no live spend, leads, or CRM feed.",
      );
    }
  });

  it("replaces the persona header and the verification claim in review mode", () => {
    const { container } = renderReviewOverview();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Review dashboard (demo, not connected)",
    );
    expect(container.textContent).toContain("Demo workspace (not connected)");
    expect(container.textContent).toContain(
      "Last system verification: none. The review surface performs no live verification.",
    );
  });

  it("shows honest empty regions instead of fixture operational state", () => {
    renderReviewOverview();

    for (const title of [
      "No attention items to show",
      "No recorded activity to show",
      "No campaigns in this location yet",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("labels the illustrative edge-state matrix as demo rather than tenant data", () => {
    const { container } = renderReviewOverview();
    const label = container.querySelector("[data-demo-label='overview-edge-state-matrix']");

    expect(label?.textContent).toContain("Illustrative demo states");
  });
});
