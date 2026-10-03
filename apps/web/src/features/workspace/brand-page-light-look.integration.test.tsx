import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceScreen } from "./workspace-screen.js";
import { workspaceData } from "./workspace.test-support.js";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), part R3, on the Brand page.
 *
 * - F-05: "One obvious primary button per screen" (direction section 2.3, rubric axis 1). Both
 *   saves, "Save your details" and "Save ad settings", were filled action-blue buttons on one page.
 * - F-06: the ad settings' fields had no gap between them (the label of each sat 6 to 10px under the
 *   input above), where "Your details" keeps its own and the partner dialog's fieldset has the
 *   stack's `--space-5`.
 * - F-04: the two previews are not navy panels. The stylesheet half is
 *   `workspace-light-look.unit.test.ts`; here the markup is held to the card the primitive draws.
 */

vi.mock("next/navigation.js", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

function primaryButtons(): readonly string[] {
  return screen
    .getAllByRole("button")
    .filter((button) => button.getAttribute("data-variant") === "primary")
    .map((button) => button.textContent ?? "");
}

describe("F-05: the Brand page has one primary button", () => {
  it('makes "Save your details" the page\'s one primary and "Save ad settings" a secondary', () => {
    render(<WorkspaceScreen data={workspaceData("profile")} />);

    expect(primaryButtons()).toEqual(["Save your details"]);
    expect(screen.getByRole("button", { name: "Save ad settings" })).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });

  it("keeps both saves, with their own names, whoever may edit", () => {
    render(<WorkspaceScreen data={workspaceData("profile", { canEdit: false })} />);

    expect(screen.getByRole("button", { name: "Save your details" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save ad settings" })).toBeDisabled();
    // A disabled page still has no second blue button.
    expect(primaryButtons()).toEqual(["Save your details"]);
  });

  it("leaves the reloads as outlines, so they never compete with a save", () => {
    render(<WorkspaceScreen data={workspaceData("profile")} />);

    for (const name of ["Load latest saved details", "Load latest saved ad settings"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("data-variant", "outline");
    }
  });
});

describe("F-06: the ad settings' fields are a stack", () => {
  it("puts the stack's gap on the ad settings' fieldset, as the partner dialog's has it", () => {
    render(<WorkspaceScreen data={workspaceData("profile")} />);

    const fieldset = screen.getByLabelText(/Title on your ads/u).closest("fieldset");
    const detailsFieldset = screen.getByLabelText("Company name").closest("fieldset");

    expect(fieldset).not.toBeNull();
    // Both read `styles.fields`; only the ad settings' fieldset also reads `styles.stack`.
    expect(fieldset?.className.split(/\s+/u).length).toBeGreaterThanOrEqual(2);
    expect(detailsFieldset?.className.split(/\s+/u).length).toBe(1);
  });

  it("keeps all four ad fields inside that one fieldset", () => {
    render(<WorkspaceScreen data={workspaceData("profile")} />);

    const fieldset = screen.getByLabelText(/Title on your ads/u).closest("fieldset");

    for (const label of [/Title on your ads/u, /Disclosure line/u, /Lead form wording/u]) {
      expect(fieldset?.contains(screen.getByLabelText(label))).toBe(true);
    }
    expect(fieldset?.textContent).toContain("Brand color");
  });
});

describe("F-04: the previews are Cards", () => {
  it("draws both previews on the Card primitive, which brings the white fill and the hairline", () => {
    const { container } = render(<WorkspaceScreen data={workspaceData("profile")} />);

    for (const eyebrow of ["Report preview", "On every ad"]) {
      const card = screen.getByText(eyebrow).closest("article");
      expect(card, `${eyebrow} card`).not.toBeNull();
      expect(card?.getAttribute("data-variant")).toBe("card");
    }
    expect(
      container.querySelectorAll("article[data-variant='card']").length,
    ).toBeGreaterThanOrEqual(4);
  });
});
