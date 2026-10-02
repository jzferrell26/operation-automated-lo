import { evaluateLibraryAdWords } from "@oalo/application";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, expectTypeOf, it } from "vitest";

import { BAND_PLACEHOLDER } from "../../../copy/launch-messages.js";
import type { LaunchBand } from "../launch-model.js";
import { AD_INK, AD_PAPER, AdCreative } from "./ad-creative.js";
import { BrandBand, bandNameSize } from "./brand-band.js";
import { TEST_BAND } from "./launch-flow.test-support.js";

/**
 * PRD-009d D3, 009D-AC-004 and 009D-AC-023. The brand band: what it prints, its placeholder, how a
 * long name gives way, its colours in both themes, and that nothing about a Realtor can reach it.
 */

const ART = { tall: "/art/tall.png", square: "/art/square.png" };

function creative(shape: "tall" | "square", advertiser = TEST_BAND) {
  return render(
    <AdCreative
      advertiser={advertiser}
      alt="A house drawn in simple shapes"
      art={ART}
      sample={false}
      shape={shape}
    />,
  );
}

describe("the brand band (009D-AC-004)", () => {
  it.each(["tall", "square"] as const)("prints the person's own brand on the %s ad", (shape) => {
    const { container } = creative(shape);
    const band = container.querySelector<HTMLElement>("[data-brand-band='brand']");
    if (band === null) throw new Error("No band");
    expect(container.querySelector("[data-ad-creative]")).toHaveAttribute("data-shape", shape);
    expect(within(band).getByText("Alex Morgan")).toBeInTheDocument();
    expect(within(band).getByText("Loan officer, NMLS 0000000")).toBeInTheDocument();
    expect(within(band).getByText("Prairie Home Lending, NMLS 0000000")).toBeInTheDocument();
    expect(within(band).getByText("Equal Housing Opportunity.")).toBeInTheDocument();
    expect(within(band).getByText("AM")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      shape === "tall" ? ART.tall : ART.square,
    );
  });

  it("shows the placeholder band when the person has no brand", () => {
    const { container } = creative("tall", { ...TEST_BAND, name: "", nmls: "", company: "" });
    expect(container.querySelector("[data-brand-band='placeholder']")).not.toBeNull();
    expect(screen.getByText(BAND_PLACEHOLDER)).toBeInTheDocument();
    expect(BAND_PLACEHOLDER).toBe("Your name and NMLS number go here");
  });

  it("wraps a long name, shrinks it to the 14px floor, and then truncates it", () => {
    expect(bandNameSize("Alex Morgan")).toBe("regular");
    expect(bandNameSize("Alexandra Morgan-Whitfield Smith")).toBe("reduced");
    const eighty =
      "Alexandra Bartholomew Montgomery-Whitfield Fitzgerald Wellington-Smyth the Third";
    expect([...eighty].length).toBe(80);
    expect(bandNameSize(eighty)).toBe("floor");
    const { container } = creative("tall", { ...TEST_BAND, name: eighty });
    const name = container.querySelector("[data-name-size]");
    expect(name).toHaveAttribute("data-name-size", "floor");
    // The whole name is still the text, so a screen reader reads it; the clamp only draws it shorter.
    expect(name?.textContent).toBe(eighty);
  });

  it("is navy on white whatever the theme, set from constants rather than theme tokens", () => {
    for (const theme of ["light", "dark"]) {
      document.documentElement.dataset["theme"] = theme;
      const { container, unmount } = creative("tall");
      const root = container.querySelector<HTMLElement>("[data-ad-creative]");
      expect(root?.style.getPropertyValue("--ad-band-paper")).toBe(AD_PAPER);
      expect(root?.style.getPropertyValue("--ad-band-ink")).toBe(AD_INK);
      expect(root?.style.getPropertyValue("--ad-brand")).toBe("#1F5A3D");
      unmount();
    }
    delete document.documentElement.dataset["theme"];
    expect(AD_PAPER).toBe("#FFFFFF");
    expect(AD_INK).toBe("#061E35");
  });
});

describe("compliance control 9 by structure (009D-AC-023)", () => {
  it("takes the frozen advertiser block as its only prop, and that block has no partner field", () => {
    expectTypeOf<Parameters<typeof BrandBand>[0]>().toEqualTypeOf<
      Readonly<{ advertiser: LaunchBand }>
    >();
    expectTypeOf<keyof LaunchBand>().toEqualTypeOf<
      "name" | "title" | "company" | "nmls" | "companyNmls" | "colorPresetId" | "disclosureLine"
    >();
  });

  it("renders nothing of a partner-shaped object passed beside the advertiser block", () => {
    const smuggled = {
      ...TEST_BAND,
      partner: { realtorDisplayName: "Priya Nadeem", brokerage: "Oakline Realty" },
      realtorDisplayName: "Priya Nadeem",
      realtor: "Priya Nadeem",
      brokerage: "Oakline Realty",
      coBrand: "In partnership with Oakline Realty",
    };
    const { container } = render(<BrandBand advertiser={smuggled} />);
    expect(container.textContent).not.toMatch(/Priya|Nadeem|Oakline|partnership/u);
  });

  it("refuses a co-brand phrase in every Brand text the band prints, before it can be saved", () => {
    const phrase = "in partnership with Oakline Realty";
    for (const field of [
      "name",
      "title",
      "company",
      "disclosureLine",
      "leadFormWording",
    ] as const) {
      const findings = evaluateLibraryAdWords(
        {
          headline: "Thinking about your first home? Start here.",
          primaryText: "Send me a message.",
          name: "Alex Morgan",
          title: "Loan officer",
          company: "Prairie Home Lending",
          disclosureLine: "Equal Housing Opportunity.",
          leadFormWording: "By submitting, you agree to be contacted.",
          [field]: phrase,
        },
        ["Oakline Realty"],
      );
      expect(
        findings.map((finding) => finding.ruleCode),
        field,
      ).toContain("WORDS_CO_BRAND");
    }
  });
});
