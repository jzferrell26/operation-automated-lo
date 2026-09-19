import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NOT_CONNECTED_DISCLOSURE, NOT_CONNECTED_HEADLINE } from "../../../copy/user-language.js";
import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import { projectNavigationForSession } from "../model/navigation.js";
import { AppShell } from "./app-shell.js";

vi.mock("next/navigation.js", () => ({ usePathname: () => "/overview" }));
vi.mock("../../../theme/index.js", () => ({
  ThemeControl: () => <div aria-label="Theme control">Theme control</div>,
}));

describe("authenticated application shell", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  it("renders access-filtered full navigation and interactive expanded and collapsed states", async () => {
    const user = userEvent.setup();
    renderShell();

    const desktopNavigation = screen.getByRole("navigation", { name: "Product navigation" });
    expect(within(desktopNavigation).getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(desktopNavigation).getByText("Reports").closest("[aria-disabled='true']"),
    ).toBeTruthy();
    expect(within(desktopNavigation).getByText("Not included in your plan")).toBeInTheDocument();
    expect(within(desktopNavigation).getByText("Coming later")).toBeInTheDocument();
    expect(within(desktopNavigation).getByText("Having trouble")).toBeInTheDocument();

    await user.click(within(desktopNavigation).getByRole("button", { name: "Expand Marketing" }));
    expect(within(desktopNavigation).getByRole("link", { name: "Campaigns" })).toBeInTheDocument();
    expect(
      within(desktopNavigation).getByRole("link", { name: "Property Sites" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));
    expect(screen.getByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
  });

  it("preserves accessible names and discoverable labels when CSS compacts the desktop rail", async () => {
    const user = userEvent.setup();
    renderShell();

    const desktopNavigation = screen.getByRole("navigation", { name: "Product navigation" });
    const navigationLabels = [
      ["Overview", "Overview"],
      ["Marketing Suite", "Marketing Suite"],
      ["Brand Engine", "Brand Engine. Having trouble"],
      ["Partners", "Partners"],
      ["Leads and Pipeline", "Leads and Pipeline"],
      ["Automations", "Automations. Not included in your plan"],
      ["Reports", "Reports. No access"],
      ["Marketplace", "Marketplace. Coming later"],
      ["Settings", "Settings"],
    ] as const;

    for (const [visibleLabel, accessibleLabel] of navigationLabels) {
      const navigationItem = within(desktopNavigation).getByRole("link", {
        name: accessibleLabel,
      });
      expect(navigationItem).toHaveAttribute("aria-label", accessibleLabel);
      expect(navigationItem.getAttribute("title")).toContain(visibleLabel);
    }

    const reports = within(desktopNavigation).getByRole("link", {
      name: "Reports. No access",
    });
    expect(reports).toHaveAttribute("aria-disabled", "true");
    expect(reports).toHaveAttribute("tabindex", "0");

    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));

    for (const [, accessibleLabel] of navigationLabels) {
      expect(
        within(desktopNavigation).getByRole("link", { name: accessibleLabel }),
      ).toHaveAttribute("aria-label", accessibleLabel);
    }
  });

  it("traps drawer focus, locks scroll, closes with Escape, and returns focus", async () => {
    const user = userEvent.setup();
    renderShell();
    const trigger = screen.getByRole("button", { name: "Open navigation" });

    await user.click(trigger);
    const drawer = screen.getByRole("dialog", { name: "Workspace navigation" });
    const close = within(drawer).getByRole("button", { name: "Close navigation" });
    expect(close).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    const lastLink = within(drawer).getByRole("link", { name: "Settings" });
    lastLink.focus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Workspace navigation" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
  });

  it("renders immutable session identity without a location switcher", () => {
    renderShell();

    expect(screen.getAllByText("Prairie Home Lending").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Loan Officer").length).toBeGreaterThan(0);
    expect(screen.queryByRole("combobox", { name: /location/i })).not.toBeInTheDocument();
    expect(screen.getByText("Local demo")).toBeInTheDocument();
  });

  it("tells the user nothing is connected, in their own language", () => {
    const fixture = loadSyntheticUiFixture();
    const navigation = projectNavigationForSession(fixture.navigation, fixture.session);
    const reviewSession = {
      ...fixture.session,
      safety: { ...fixture.session.safety, disclosure: NOT_CONNECTED_DISCLOSURE },
    };

    render(
      <AppShell navigation={navigation} session={reviewSession} workspaceMode="review">
        <h1>Authenticated content</h1>
      </AppShell>,
    );

    // PRD-006b D4. The banner still says nothing is live and nothing can be published; it now says
    // it the way a loan officer would, and the accessible name says the same thing.
    expect(
      screen.getByLabelText("Not connected yet: HighLevel, Meta, and Stripe"),
    ).toBeInTheDocument();
    expect(screen.getByText(NOT_CONNECTED_DISCLOSURE)).toBeInTheDocument();
    expect(screen.getByText(NOT_CONNECTED_HEADLINE)).toBeInTheDocument();
    expect(document.querySelector("[data-workspace-mode='review']")).toBeTruthy();
  });
});

function renderShell() {
  const fixture = loadSyntheticUiFixture();
  const navigation = projectNavigationForSession(fixture.navigation, fixture.session);

  return render(
    <AppShell navigation={navigation} session={fixture.session}>
      <h1>Authenticated content</h1>
    </AppShell>,
  );
}
