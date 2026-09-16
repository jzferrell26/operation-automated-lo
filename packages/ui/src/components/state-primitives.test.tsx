import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DegradedState, ErrorState, PermissionState } from "./async-state.js";
import { Metric, type MetricProps } from "./metric.js";
import { OnboardingChecklist, type OnboardingChecklistItemModel } from "./onboarding-checklist.js";

function renderMetric(stateProps: MetricProps) {
  return renderToStaticMarkup(createElement(Metric, stateProps));
}

describe("state and data primitives", () => {
  it("renders all seven Metric states without leaking contract props to the DOM", () => {
    const metrics = [
      {
        freshness: "Verified 2 minutes ago",
        label: "New leads",
        source: "HighLevel",
        state: "current",
        value: 0,
      },
      {
        freshness: "Verified 3 hours ago",
        label: "Appointments",
        nextAction: "Refresh HighLevel reporting",
        source: "HighLevel",
        state: "stale",
        value: 4,
      },
      {
        freshness: "No successful read",
        label: "Funded volume",
        source: "Lender feed",
        state: "unavailable",
      },
      {
        freshness: "Meta verified 1 minute ago",
        label: "Campaign reach",
        pendingSources: ["HighLevel attribution"],
        source: "Meta and HighLevel",
        state: "partial",
        value: "1,204+",
      },
      {
        correlationId: "corr-metric-42",
        freshness: "Write attempted 30 seconds ago",
        label: "Publishing status",
        source: "Meta",
        state: "uncertain",
        value: "Last known: queued",
      },
      {
        accessPath: "Ask an Owner for reporting access",
        freshness: "Access checked now",
        label: "Pipeline value",
        requiredRole: "Owner",
        source: "HighLevel",
        state: "permission_restricted",
      },
      {
        freshness: "No live observation",
        label: "Ad spend",
        nextAction: "Connect a provider in a separately authorized environment",
        source: "No provider is connected",
        state: "not_connected",
      },
    ] satisfies readonly MetricProps[];

    const markupByState = metrics.map((metric) => [metric.state, renderMetric(metric)] as const);

    for (const [state, markup] of markupByState) {
      expect(markup).toContain(`data-state="${state}"`);
      expect(markup).toContain("Source");
      expect(markup).toContain("Freshness");
      expect(markup).not.toMatch(
        /nextaction=|pendingsources=|correlationid=|requiredrole=|accesspath=/i,
      );
    }

    expect(markupByState[0]?.[1]).toContain(">0<");
    expect(markupByState[1]?.[1]).toContain("Next safe action");
    expect(markupByState[2]?.[1]).toContain("Unavailable");
    expect(markupByState[3]?.[1]).toContain("Sources pending");
    expect(markupByState[4]?.[1]).toContain("Uncertain, reconciling");
    expect(markupByState[4]?.[1]).toContain("corr-metric-42");
    expect(markupByState[5]?.[1]).toContain("Permission restricted");
    expect(markupByState[5]?.[1]).not.toContain("Pipeline value</p>");
    expect(markupByState[6]?.[1]).toContain('<p class="oalo-metric__value">Not connected</p>');
    expect(markupByState[6]?.[1]).toContain("Next safe action");
  });

  it("labels synthetic metrics and exposes source and freshness", () => {
    const markup = renderMetric({
      freshness: "Fixture timestamp: 2026-07-20T12:00:00Z",
      label: "Active work",
      source: "Frozen UI fixture",
      state: "current",
      synthetic: true,
      value: "3 items",
    });

    expect(markup).toContain("Synthetic data");
    expect(markup).toContain("Frozen UI fixture");
    expect(markup).toContain("Fixture timestamp");
  });

  it("requires the permission-restricted reason, role, and authorized resolver", () => {
    const markup = renderToStaticMarkup(
      createElement(PermissionState, {
        description: "Protected reporting data is not available to this viewer.",
        reason: "The current session has viewer access only.",
        requiredRole: "Owner",
        responsibleParty: "Location owner",
        title: "Reporting access required",
      }),
    );

    expect(markup).toContain('data-state="permission_restricted"');
    expect(markup).toContain("Permission restricted");
    expect(markup).toContain("viewer access only");
    expect(markup).toContain("Required role");
    expect(markup).toContain("Location owner");
    expect(markup).not.toMatch(/reason=|requiredrole=|responsibleparty=/i);
  });

  it("provides explicit non-color error and degraded semantics", () => {
    const error = renderToStaticMarkup(
      createElement(ErrorState, {
        description: "The read failed safely.",
        title: "Metrics unavailable",
      }),
    );
    const degraded = renderToStaticMarkup(
      createElement(DegradedState, {
        description: "The last verified result remains visible.",
        title: "Provider delayed",
      }),
    );

    expect(error).toContain('role="alert"');
    expect(error).toContain("Error");
    expect(degraded).toContain("Degraded");
  });

  it("renders onboarding items in source order with verified completion evidence", () => {
    const items: readonly OnboardingChecklistItemModel[] = [
      {
        id: "install",
        state: "complete",
        title: "Install and permissions",
        evidence: {
          summary: "Required scopes verified",
          verifiedAt: "2026-07-20T12:00:00Z",
          verifierVersion: "permissions-v2",
        },
      },
      {
        id: "brand",
        state: "blocked",
        title: "Brand and compliance",
        reason: "NMLS review is incomplete",
        responsibleParty: "Loan officer",
        nextAction: "Review the licensing profile",
      },
    ];
    const markup = renderToStaticMarkup(
      createElement(OnboardingChecklist, { items, title: "Get Connected" }),
    );

    expect(markup.indexOf("Install and permissions")).toBeLessThan(
      markup.indexOf("Brand and compliance"),
    );
    expect(markup).toContain("Required scopes verified");
    expect(markup).toContain("permissions-v2");
    expect(markup).toContain("Blocked");
    expect(markup).toContain("Next safe action");
  });
});
