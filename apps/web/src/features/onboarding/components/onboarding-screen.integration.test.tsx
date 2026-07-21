import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import { OnboardingScreen } from "./onboarding-screen.js";

describe("Onboarding screen", () => {
  it("renders exactly five Get Connected and four locked Launch Readiness items", () => {
    const fixture = loadSyntheticUiFixture();
    render(<OnboardingScreen onboarding={fixture.onboarding} session={fixture.session} />);

    const connected = screen.getByRole("region", { name: "Get Connected" });
    const readiness = screen.getByRole("region", { name: "Launch Readiness" });

    expect(within(connected).getAllByRole("listitem")).toHaveLength(5);
    expect(within(readiness).getAllByRole("listitem")).toHaveLength(4);
    expect(readiness).toHaveAttribute("data-locked", "true");
    expect(within(readiness).queryByRole("link")).not.toBeInTheDocument();
    expect(within(connected).getAllByRole("link")).toHaveLength(5);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("renders all five states with evidence, freshness, responsible parties, and exact routes", () => {
    const fixture = loadSyntheticUiFixture();
    render(<OnboardingScreen onboarding={fixture.onboarding} session={fixture.session} />);

    for (const state of ["Complete", "In progress", "Blocked", "Stale", "Not started"]) {
      expect(screen.getAllByText(state).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Evidence freshness:").length).toBe(9);
    expect(screen.getByText("synthetic-verifier-1.0.0")).toBeInTheDocument();
    expect(screen.getByText("synthetic-install-app-test-001")).toBeInTheDocument();
    expect(screen.getByText("Compliance Approver")).toBeInTheDocument();
    const brandItem = screen.getByRole("heading", { name: "Brand and compliance" }).closest("li");
    if (!brandItem) {
      throw new Error("Expected the Brand and compliance checklist item.");
    }
    expect(
      within(brandItem).getByRole("link", { name: "Open completion surface" }),
    ).toHaveAttribute("href", "/brand");
  });
});
