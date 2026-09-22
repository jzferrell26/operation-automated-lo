import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import { OnboardingScreen } from "./onboarding-screen.js";
import { PermissionScreen } from "./permission-screen.js";

describe("Onboarding screen", () => {
  it("renders exactly five Get Connected and four locked Launch Readiness items", () => {
    const fixture = loadSyntheticUiFixture();
    render(<OnboardingScreen onboarding={fixture.onboarding} session={fixture.session} />);

    const connected = screen.getByRole("region", { name: "Connect your accounts" });
    const readiness = screen.getByRole("region", { name: "Ready to launch" });

    expect(within(connected).getAllByRole("listitem")).toHaveLength(5);
    expect(within(readiness).getAllByRole("listitem")).toHaveLength(4);
    expect(readiness).toHaveAttribute("data-locked", "true");
    expect(within(readiness).queryByRole("link")).not.toBeInTheDocument();
    expect(within(connected).getAllByRole("link")).toHaveLength(5);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  /**
   * PRD-006b D5 removed the line that named how the user got here. Whether the session came from
   * an embed or from a sign-in is not something a loan officer needs told, and both words were in
   * the forbidden vocabulary. The setup itself is identical either way, which is what this asserts.
   */
  it.each([["embedded"], ["first-party"]] as const)(
    "renders the same setup under %s access",
    (accessMode) => {
      const fixture = loadSyntheticUiFixture();
      render(
        <OnboardingScreen
          onboarding={fixture.onboarding}
          session={{ ...fixture.session, accessMode }}
        />,
      );

      expect(screen.getByRole("heading", { name: "Connect your accounts" })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Ready to launch", level: 2 }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/embedded/iu)).not.toBeInTheDocument();
    },
  );

  it("renders all five states with evidence, freshness, responsible parties, and exact routes", () => {
    const fixture = loadSyntheticUiFixture();
    render(<OnboardingScreen onboarding={fixture.onboarding} session={fixture.session} />);

    for (const state of ["Done", "Started", "Stuck", "Needs a refresh", "Not started"]) {
      expect(screen.getAllByText(state).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Checked on:").length).toBe(9);
    expect(screen.getByText("synthetic-verifier-1.0.0")).toBeInTheDocument();
    expect(screen.getByText("synthetic-install-app-test-001")).toBeInTheDocument();
    expect(screen.getByText("Compliance Approver")).toBeInTheDocument();
    const brandItem = screen.getByRole("heading", { name: "Brand and compliance" }).closest("li");
    if (!brandItem) {
      throw new Error("Expected the Brand and compliance checklist item.");
    }
    expect(within(brandItem).getByRole("link", { name: "Open this step" })).toHaveAttribute(
      "href",
      "/brand",
    );
  });

  it("dismisses optional guidance without removing the persistent checklist", async () => {
    const user = userEvent.setup();
    const fixture = loadSyntheticUiFixture();
    render(<OnboardingScreen onboarding={fixture.onboarding} session={fixture.session} />);

    await user.click(screen.getByRole("button", { name: "Close this tip" }));

    expect(screen.queryByText("Need a hand? Open the setup guide")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Tip closed. Your setup list is still below.",
    );
    expect(
      within(screen.getByRole("region", { name: "Connect your accounts" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(5);
    expect(
      within(screen.getByRole("region", { name: "Ready to launch" })).getAllByRole("listitem"),
    ).toHaveLength(4);
  });

  it("groups permissions by business purpose and preserves the safe return path", () => {
    const fixture = loadSyntheticUiFixture();
    render(<PermissionScreen onboarding={fixture.onboarding} />);

    for (const group of ["Required", "Granted", "Missing", "Optional"]) {
      expect(screen.getByRole("heading", { name: group })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Why it's needed")).toHaveLength(4);
    expect(screen.getByText("Nothing is connected from this page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to setup" })).toHaveAttribute(
      "href",
      "/onboarding",
    );
  });
});
