import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedPrincipal } from "@oalo/application";

import { readSavedAdBrand } from "../../server/ad-brand-read.js";
import { loadSyntheticBrandProfile } from "../brand/model/synthetic-brand-profile.js";
import { syntheticBrandPageData } from "./synthetic-brand-page.js";
import { WorkspaceScreen } from "./workspace-screen.js";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), part R3, F-13.
 *
 * The local demo's Brand page was the pre-PRD-009 "Brand and compliance details" page. It is the
 * PRD-009 Brand page now, fed by the demo's own sample identity, which must be the identity the
 * demo's Launch an ad flow puts on its ads (`server/ad-brand-read.ts`), so the page and the ad it
 * previews agree.
 */

vi.mock("next/navigation.js", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe("the demo's Brand page data", () => {
  it("holds the sample identity the demo's ads carry, from the synthetic brand fixture", async () => {
    const data = syntheticBrandPageData(loadSyntheticBrandProfile());
    const environment = {
      OALO_ENVIRONMENT: "local",
      OALO_PROVIDER_MODE: "stub",
      OALO_SYNTHETIC_DATA_ONLY: "true",
    };
    // In the demo the reader ignores who is asking and answers with the sample band.
    const saved = await readSavedAdBrand({} as AuthenticatedPrincipal, environment);

    expect(data.defaultBrand).toMatchObject({
      name: saved.band.name,
      company: saved.band.company,
      nmls: saved.band.nmls,
      companyNmls: saved.band.companyNmls,
    });
    expect(data.defaultAdBrand).toEqual({
      title: saved.band.title,
      colorPresetId: saved.band.colorPresetId,
      disclosureLine: saved.band.disclosureLine,
      leadFormWording: saved.leadFormWording,
    });
    expect(data.defaultBrand.name).toBe("Alex Morgan");
    expect(data.defaultBrand.nmls).toBe("0000000");
  });

  it("is the profile view, with nothing saved and nobody able to save", () => {
    const data = syntheticBrandPageData(loadSyntheticBrandProfile());

    expect(data.view).toBe("profile");
    expect(data.canEdit).toBe(false);
    expect(data.preferences).toEqual({ brand: null, adBrand: null, partners: null, messages: {} });
    expect(data.reportsEnabled).toBe(false);
  });
});

describe("the demo's Brand page", () => {
  it("is the PRD-009 Brand page: the details, the ad settings, and the band preview", () => {
    render(<WorkspaceScreen data={syntheticBrandPageData(loadSyntheticBrandProfile())} />);

    expect(screen.getByRole("heading", { level: 1, name: "Brand" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your brand on ads" })).toBeInTheDocument();
    expect(screen.getByText("On every ad")).toBeInTheDocument();
    expect(screen.getByLabelText("Title on your ads")).toHaveValue("Loan officer");
    expect(screen.getByLabelText("Disclosure line")).toHaveValue("Equal Housing Opportunity.");
  });

  it("is read only, and still has one primary button", () => {
    render(<WorkspaceScreen data={syntheticBrandPageData(loadSyntheticBrandProfile())} />);

    expect(screen.getByLabelText("Loan officer name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save your details" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save ad settings" })).toBeDisabled();
    // Each form says so under its own buttons.
    expect(screen.getAllByText("Your role has read-only access to these details.")).toHaveLength(2);
    const primaries = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("data-variant") === "primary");
    expect(primaries.map((button) => button.textContent)).toEqual(["Save your details"]);
  });
});
