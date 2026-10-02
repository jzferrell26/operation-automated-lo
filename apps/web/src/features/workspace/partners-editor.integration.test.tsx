import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { stubDialogLayout } from "../homeowners/home-workspace.test-support.js";
import { PartnersEditor } from "./preference-editors.js";
import { workspaceData } from "./workspace.test-support.js";

/**
 * Writing review pass 2, W-11. The Realtor partners page says "Realtor partners never appear in
 * paid ads", so its empty state must not contradict that, its note must not mention a permission
 * step PRD-009 does not have, and its link must use the name of the flow ("Launch an ad", D-16).
 */

describe("the Realtor partners card (writing review W-11)", () => {
  function renderEmpty() {
    stubDialogLayout();
    return render(<PartnersEditor data={workspaceData("partners")} />);
  }

  it("says what the page is for without implying a partner will appear in an ad", () => {
    renderEmpty();
    expect(
      screen.getByRole("heading", { name: "Add your first Realtor partner" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Keep your Realtor partners' details in one place. Nothing is imported from HighLevel, and partners never appear in your ads.",
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ready for the next campaign/u);
  });

  it("names the flow Launch an ad, as everywhere else", () => {
    renderEmpty();
    expect(screen.getByRole("link", { name: "Launch an ad" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new",
    );
    expect(screen.queryByRole("link", { name: "Create a campaign" })).toBeNull();
  });

  it("says the list is saved and sends no invitation, and mentions no permission step", () => {
    renderEmpty();
    expect(
      screen.getByText(
        "Your Realtor partner list is saved to this account and workspace. Adding a partner sends no invitation.",
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/permission/iu);
  });
});
