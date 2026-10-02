import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AD_BRAND_COLOR_PRESETS,
  AD_BRAND_LIMITS,
  DEFAULT_AD_BRAND,
  adBrandColorValue,
  type AdBrand,
} from "./ad-brand.js";
import { stubDialogLayout } from "../homeowners/home-workspace.test-support.js";
import { AdBrandEditor } from "./preference-editors.js";
import { TEST_BRAND, workspaceData } from "./workspace.test-support.js";

/**
 * PRD-009d D3, 009D-AC-003 and 009D-AC-024. The Brand page's "Your brand on ads" card: the four
 * fields it saves beside the report brand, the band preview that follows them, and the limits it
 * holds before anything is sent. The report brand's name, company, and NMLS numbers are not
 * fields here; they come from the report brand, which this card does not change.
 */

const REVISION = "3b1f6f5e-6c0e-4a39-9f0e-6d7f3c1a9b22";

const network = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();

function savedAs(value: AdBrand): Response {
  return new Response(
    JSON.stringify({
      preferences: {
        brand: null,
        adBrand: { revision: REVISION, value },
        partners: null,
        messages: {},
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function sentCommands(): unknown[] {
  return network.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
}

beforeEach(() => {
  network.mockReset();
  vi.stubGlobal("fetch", network);
  stubDialogLayout();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the ad brand card on the Brand page (009D-AC-003)", () => {
  it("shows the four ad fields, and a band that carries the report brand's name and NMLS", () => {
    render(<AdBrandEditor data={workspaceData("profile")} />);

    expect(screen.getByRole("textbox", { name: /Title on your ads/u })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: /Brand colour/u })).toHaveTextContent("Navy");
    expect(screen.getByRole("textbox", { name: /Disclosure line/u })).toHaveValue(
      DEFAULT_AD_BRAND.disclosureLine,
    );
    expect(screen.getByRole("textbox", { name: /Lead form wording/u })).toHaveValue(
      DEFAULT_AD_BRAND.leadFormWording,
    );
    expect(screen.queryByRole("textbox", { name: /^Name|NMLS|Company/u })).toBeNull();

    const band = document.querySelector("[data-brand-band]");
    expect(band?.textContent).toContain(TEST_BRAND.name);
    expect(band?.textContent).toContain(TEST_BRAND.nmls);
    expect(band?.textContent).toContain(DEFAULT_AD_BRAND.disclosureLine);
  });

  it("saves the four fields as the ad_brand preference, and the band follows them before saving", async () => {
    const chosen = {
      title: "Loan officer",
      colorPresetId: "forest",
      disclosureLine: "NMLS 123456. Equal Housing Opportunity.",
      leadFormWording: "By sending this, you agree that Casey Rivera may contact you about a loan.",
    } satisfies AdBrand;
    network.mockResolvedValueOnce(savedAs(chosen));
    render(<AdBrandEditor data={workspaceData("profile")} />);

    fireEvent.change(screen.getByRole("textbox", { name: /Title on your ads/u }), {
      target: { value: chosen.title },
    });
    fireEvent.click(screen.getByRole("combobox", { name: /Brand colour/u }));
    fireEvent.click(screen.getByRole("option", { name: "Forest green" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Disclosure line/u }), {
      target: { value: chosen.disclosureLine },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Lead form wording/u }), {
      target: { value: chosen.leadFormWording },
    });

    const preview = document.querySelector<HTMLElement>("[data-brand-band]")?.parentElement;
    expect(preview?.textContent).toContain("Loan officer");
    expect(preview?.style.getPropertyValue("--ad-brand")).toBe(adBrandColorValue("forest"));
    expect(network).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save ad brand" }));

    expect(await screen.findByText("Your changes are saved.")).toBeInTheDocument();
    expect(network).toHaveBeenCalledTimes(1);
    expect(network.mock.calls[0]?.[0]).toBe("/api/workspace/preferences");
    expect(sentCommands()).toEqual([{ key: "ad_brand", expectedRevision: null, value: chosen }]);
  });

  it("offers exactly the six colour presets", () => {
    render(<AdBrandEditor data={workspaceData("profile")} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Brand colour/u }));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(
      AD_BRAND_COLOR_PRESETS.map((preset) => preset.label),
    );
  });
});

describe("the ad brand limits hold before anything is sent (009D-AC-024)", () => {
  it.each([
    ["Title on your ads", "x".repeat(AD_BRAND_LIMITS.title + 1)],
    ["Disclosure line", "x".repeat(AD_BRAND_LIMITS.disclosureLine + 1)],
    ["Lead form wording", "x".repeat(AD_BRAND_LIMITS.leadFormWording + 1)],
    ["Disclosure line", "   "],
    ["Lead form wording", "   "],
  ])("refuses %s set to %j characters", async (label, value) => {
    render(<AdBrandEditor data={workspaceData("profile")} />);
    fireEvent.change(screen.getByRole("textbox", { name: new RegExp(label, "u") }), {
      target: { value },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save ad brand" }));

    await waitFor(() =>
      expect(document.body.textContent).toContain(
        "Check the title, the disclosure line and the lead form wording before saving.",
      ),
    );
    expect(network).not.toHaveBeenCalled();
  });

  it("leaves the browser's own required check on the disclosure line and the lead form wording", () => {
    render(<AdBrandEditor data={workspaceData("profile")} />);
    for (const label of [/Disclosure line/u, /Lead form wording/u]) {
      const field = screen.getByRole("textbox", { name: label });
      fireEvent.change(field, { target: { value: "" } });
      expect(field).toBeRequired();
      expect(field).toBeInvalid();
    }
    fireEvent.click(screen.getByRole("button", { name: "Save ad brand" }));
    expect(network).not.toHaveBeenCalled();
  });

  it("is read-only for a role that cannot edit Brand", () => {
    render(<AdBrandEditor data={workspaceData("profile", { canEdit: false })} />);
    expect(screen.getByRole("textbox", { name: /Title on your ads/u })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save ad brand" })).toBeDisabled();
  });
});
