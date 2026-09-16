import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadSyntheticReporting } from "../../../features/reporting/model/synthetic-reporting.js";
import {
  collectFixtureStrings,
  forbiddenReviewStrings,
  leakedReviewStrings,
  reviewSurfaceText,
  staleAllowances,
  type ReviewSurfaceAllowance,
} from "../review-surface-sweep.js";
import ReportsPage from "./page.js";

/**
 * Every synthetic reporting fixture string that may legitimately reach the review reporting route.
 * The route renders static review copy plus value-free not-connected measures, so nothing from the
 * fixture should survive; each entry below is a short closed-vocabulary token that happens to be a
 * substring of that static copy. A reporting field added later is forbidden until it lands here.
 */
const reportingAllowances: readonly ReviewSurfaceAllowance[] = [
  {
    path: "campaign.metaConnection.state",
    value: "connected",
    because: "Substring of the route's own heading, 'Reporting is not connected'.",
  },
  {
    path: "campaign.creatives[*].placement",
    value: "feed",
    because:
      "Substring of the not-connected metric source, '... no live spend, leads, or CRM feed.'.",
  },
  {
    path: "portfolio.locations[*].state",
    value: "authorized",
    because:
      "Substring of the not-connected next safe action, '... in a separately authorized environment.'.",
  },
];

function stubWorkspaceEnvironment(environment: string, reviewSurface: string | undefined): void {
  vi.stubEnv("OALO_ENVIRONMENT", environment);
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", reviewSurface);
}

describe("authenticated reports route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sweeps the whole reporting fixture rather than a hardcoded amount", () => {
    const reporting = loadSyntheticReporting();

    expect(collectFixtureStrings(reporting).length).toBeGreaterThan(100);
    expect(forbiddenReviewStrings(reporting, reportingAllowances).length).toBeGreaterThan(80);
    expect(staleAllowances(reporting, reportingAllowances)).toEqual([]);
  });

  it("keeps every unallowed reporting fixture string off the review surface", () => {
    stubWorkspaceEnvironment("production", "authorized");

    const { container } = render(<ReportsPage />);
    const forbidden = forbiddenReviewStrings(loadSyntheticReporting(), reportingAllowances);

    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden)).toEqual([]);
  });

  it("reports spend and leads as not connected on the review surface", () => {
    stubWorkspaceEnvironment("production", "authorized");

    const { container } = render(<ReportsPage />);
    const values = [...container.querySelectorAll(".oalo-metric__value")].map(
      (element) => element.textContent ?? "",
    );

    expect(screen.getByRole("article", { name: "Spend" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Leads" })).toBeInTheDocument();
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value === "Not connected")).toBe(true);
  });

  it("keeps the synthetic reporting projection for local development", () => {
    stubWorkspaceEnvironment("local", undefined);

    const { container } = render(<ReportsPage />);
    const forbidden = forbiddenReviewStrings(loadSyntheticReporting(), reportingAllowances);

    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden).length).toBeGreaterThan(20);
  });
});
