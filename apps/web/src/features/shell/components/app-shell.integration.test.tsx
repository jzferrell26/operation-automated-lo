import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NOT_CONNECTED_DISCLOSURE, NOT_CONNECTED_HEADLINE } from "../../../copy/user-language.js";
import { loadSyntheticUiFixture } from "../../ui-foundation/data/load-synthetic-ui.js";
import {
  NO_ACCESS_DETAIL,
  mainMenuNavigation,
  projectNavigationForSession,
  type WorkspaceSessionView,
} from "../model/navigation.js";
import { AppShell } from "./app-shell.js";

let pathname = "/overview";
vi.mock("next/navigation.js", () => ({ usePathname: () => pathname }));
vi.mock("../../../theme/index.js", () => ({
  ThemeControl: () => (
    <div role="radiogroup" aria-label="Appearance theme">
      Light Dark System
    </div>
  ),
}));

/**
 * PRD-009a, 009A-AC-009, 013, and 014, and design `00-direction.md` section 2.1. The shell is one
 * light top bar: the "Automated LO" wordmark, the six-item "Main" menu, Help, and an account
 * control. No left rail, no collapse toggle, no Marketing Suite sub-menu, and no shell-wide
 * not-connected banner.
 */

const THE_SIX = [
  ["Home", "/overview"],
  ["Campaigns", "/marketing/campaigns"],
  ["Brand", "/brand"],
  ["Realtor partners", "/partners"],
  ["Homeowner reports", "/homeowners"],
  ["Settings", "/settings"],
] as const;

function renderShell(
  options: {
    session?: WorkspaceSessionView;
    workspaceMode?: "synthetic" | "review";
    accountControls?: React.ReactNode;
  } = {},
) {
  const fixture = loadSyntheticUiFixture();
  const session = options.session ?? fixture.session;
  return render(
    <AppShell
      accountControls={options.accountControls}
      navigation={projectNavigationForSession(mainMenuNavigation(), session)}
      session={session}
      workspaceMode={options.workspaceMode ?? "synthetic"}
    >
      <h1>Authenticated content</h1>
    </AppShell>,
  );
}

function sessionWithout(capability: string): WorkspaceSessionView {
  const fixture = loadSyntheticUiFixture();
  return {
    ...fixture.session,
    user: {
      ...fixture.session.user,
      capabilities: fixture.session.user.capabilities.filter((held) => held !== capability),
    },
  };
}

const REVIEW_SESSION: WorkspaceSessionView = Object.freeze({
  safety: Object.freeze({
    dataMode: "synthetic" as const,
    writesEnabled: false as const,
    disclosure: NOT_CONNECTED_DISCLOSURE,
  }),
  user: Object.freeze({
    displayName: "Dana Reyes",
    roleLabel: "Workspace owner",
    capabilities: Object.freeze([
      "campaign:create",
      "location:read",
      "onboarding:read",
      "pipeline:read",
      "reports:read",
      "settings:read",
    ] as const),
  }),
  location: Object.freeze({
    displayName: "Dana's workspace",
    source: "Signed in with your email. HighLevel, Meta, and Stripe aren't connected yet.",
  }),
});

describe("the top bar (009A-AC-009)", () => {
  beforeEach(() => {
    pathname = "/overview";
    document.body.style.overflow = "";
  });

  it("renders one header with the wordmark, the six-item Main menu, Help, and the account", () => {
    renderShell();

    const headers = screen.getAllByRole("banner");
    expect(headers).toHaveLength(1);
    const header = headers[0] as HTMLElement;

    expect(within(header).getByRole("link", { name: "Automated LO" })).toHaveAttribute(
      "href",
      "/overview",
    );
    const main = within(header).getByRole("navigation", { name: "Main" });
    expect(
      within(main)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual(THE_SIX);
    expect(within(header).getByRole("button", { name: "Help" })).toBeInTheDocument();
    expect(
      within(header).getByRole("button", { name: "Your account: Alex Morgan" }),
    ).toBeInTheDocument();
  });

  it("marks the current page with aria-current and its own tint and weight", () => {
    pathname = "/marketing/campaigns/new";
    renderShell();

    const main = screen.getByRole("navigation", { name: "Main" });
    const current = within(main).getByRole("link", { name: "Campaigns" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAttribute("data-current", "true");
    expect(
      within(main)
        .getAllByRole("link")
        .filter((link) => link.hasAttribute("aria-current")),
    ).toHaveLength(1);
  });

  it("has no left rail, no collapse toggle, and no Marketing Suite toggle (009A-AC-014)", () => {
    renderShell();

    expect(document.querySelector("aside")).toBeNull();
    expect(screen.queryByRole("button", { name: /collapse|expand/iu })).not.toBeInTheDocument();
    expect(screen.queryByText(/Marketing Suite|Leads and Pipeline|Automations/u)).toBeNull();
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("holds the name, the Light/Dark/System choice, and Sign out in the account control", async () => {
    const user = userEvent.setup();
    renderShell({
      accountControls: (
        <form>
          <button type="submit">Sign out</button>
        </form>
      ),
    });

    const trigger = screen.getByRole("button", { name: "Your account: Alex Morgan" });
    await user.click(trigger);
    const account = screen.getByRole("dialog", { name: "Your account" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(account).getByText("Alex Morgan")).toBeInTheDocument();
    expect(within(account).getByRole("radiogroup", { name: "Appearance theme" })).toBeVisible();
    expect(within(account).getByRole("button", { name: "Sign out" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Your account" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("shows the same six labels to a role without access, the restricted one as text with its reason", () => {
    renderShell({ session: sessionWithout("reports:read") });

    const main = screen.getByRole("navigation", { name: "Main" });
    expect(
      within(main)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(THE_SIX.map(([label]) => expect.stringContaining(label)));
    expect(within(main).queryByRole("link", { name: /Homeowner reports/u })).toBeNull();
    const restricted = within(main).getByText("Homeowner reports").closest("[data-state]");
    expect(restricted).toHaveAttribute("data-state", "permission_restricted");
    expect(restricted).toHaveAccessibleDescription(`No access. ${NO_ACCESS_DETAIL}`);
    expect(within(main).getAllByRole("link")).toHaveLength(5);
  });

  it("opens the six links from Menu in a sheet, and Escape returns focus to Menu (009A-AC-011)", async () => {
    const user = userEvent.setup();
    renderShell();

    const menu = screen.getByRole("button", { name: "Menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    await user.click(menu);
    const sheet = screen.getByRole("dialog", { name: "Menu" });
    expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(sheet.contains(document.activeElement)).toBe(true);
    expect(
      within(within(sheet).getByRole("navigation", { name: "Main menu" }))
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(THE_SIX.map(([label]) => label));

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
    expect(menu).toHaveFocus();
  });

  it("closes the menu sheet when a link in it is followed", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Menu" }));
    const sheet = screen.getByRole("dialog", { name: "Menu" });
    const brand = within(sheet).getByRole("link", { name: "Brand" });
    brand.addEventListener("click", (event) => event.preventDefault());
    await user.click(brand);
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
  });

  it("opens the shell's own help panel from Help (the walkthrough's help menu is retired, D4)", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByRole("dialog", { name: "Help" })).toBeInTheDocument();
  });

  it("puts a skip link before the bar that lands on the page's main landmark", () => {
    renderShell();

    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(skip).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      skip.compareDocumentPosition(screen.getByRole("banner")) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("connection facts are not the shell's to state (009A-AC-013)", () => {
  beforeEach(() => {
    pathname = "/overview";
  });

  it("renders no not-connected aside in review mode, and the account says only who is signed in", async () => {
    const user = userEvent.setup();
    renderShell({ session: REVIEW_SESSION, workspaceMode: "review" });

    expect(
      screen.queryByLabelText("Not connected yet: HighLevel, Meta, and Stripe"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(NOT_CONNECTED_DISCLOSURE)).not.toBeInTheDocument();
    expect(screen.queryByText(NOT_CONNECTED_HEADLINE)).not.toBeInTheDocument();
    expect(document.querySelector("aside")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Your account: Dana Reyes" }));
    const account = screen.getByRole("dialog", { name: "Your account" });
    expect(account).toHaveTextContent("Dana Reyes");
    expect(account).toHaveTextContent("Workspace owner");
    expect(account.textContent).not.toMatch(/connected|HighLevel|Meta|Stripe/u);
    expect(document.body.textContent).not.toMatch(/aren't connected|not connected/iu);
  });

  it("renders exactly one sample-data line, in the top bar region, in synthetic mode", () => {
    renderShell();

    const disclosure = loadSyntheticUiFixture().session.safety.disclosure;
    expect(screen.getAllByText(disclosure)).toHaveLength(1);
    expect(within(screen.getByRole("banner")).getByText(disclosure)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Nothing is connected/u);
  });
});
