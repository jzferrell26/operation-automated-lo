import { fireEvent, render, screen } from "@testing-library/react";
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

  /**
   * The scored baseline review pass 2, P2-07: "screens ... do not implement state views ad hoc"
   * (`03-components/async-empty-error-permission-state.md`). The empty list is the `AsyncState`, on
   * the page's card surface, the same view the Campaigns and library empty states are.
   */
  it("draws the empty list as the product's empty state on the card surface", () => {
    renderEmpty();
    const heading = screen.getByRole("heading", { name: "Add your first Realtor partner" });
    const state = heading.closest("section");

    expect(state).toHaveAttribute("data-state", "empty");
    expect(state).toHaveAttribute("data-surface", "card");
    expect(state).toHaveAttribute("role", "status");
  });

  /**
   * The scored review pass 3, R3 P3-03. The page note is the mockups' `.notice`, which is the
   * `Surface` primitive's `info` variant with the information glyph, as Connections draws its notice,
   * not a sunken well of its own on the canvas.
   */
  it("draws the page note as the information notice with its glyph (R3 P3-03)", () => {
    renderEmpty();
    const sentence = screen.getByText(
      "Your Realtor partner list is saved to this account and workspace. Adding a partner sends no invitation.",
    );
    const notice = sentence.closest("[data-variant]");

    expect(notice).toHaveAttribute("data-variant", "info");
    expect(notice?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  // The writing review delta check, D-7. The list has partners in it, so the empty state's "Empty"
  // chip would say something untrue. A search that found nothing is one plain line, and a status.
  it("says a search that found nothing in one plain line, not in the empty state", () => {
    stubDialogLayout();
    render(
      <PartnersEditor
        data={workspaceData("partners", {
          preferences: {
            brand: null,
            adBrand: null,
            messages: {},
            partners: {
              revision: "22222222-2222-4222-8222-222222222222",
              value: {
                items: [
                  {
                    id: "11111111-1111-4111-8111-111111111111",
                    name: "Jordan Lee",
                    company: "Lee Realty",
                    email: "",
                    phone: "",
                  },
                ],
              },
            },
          },
        })}
      />,
    );
    fireEvent.change(screen.getByLabelText("Search your Realtor partners"), {
      target: { value: "nobody by that name" },
    });
    const line = screen.getByText(
      "No partners match this search. Try a different name or company.",
    );

    expect(line).toHaveAttribute("role", "status");
    expect(line.closest("[data-state]")).toBeNull();
    expect(screen.queryByRole("heading", { name: "No partners match this search" })).toBeNull();
    expect(screen.queryByText("Empty")).toBeNull();
    expect(screen.queryByText("Add your first Realtor partner")).toBeNull();
  });

  it("keeps the empty state, with its chip, for a person with no partners at all", () => {
    renderEmpty();

    expect(screen.getByRole("heading", { name: "Add your first Realtor partner" })).toBeVisible();
    expect(screen.queryByText(/No partners match this search/u)).toBeNull();
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
