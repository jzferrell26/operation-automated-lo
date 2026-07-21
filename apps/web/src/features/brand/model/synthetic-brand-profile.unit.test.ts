import { describe, expect, it } from "vitest";

import { loadSyntheticBrandProfile } from "./synthetic-brand-profile.js";

describe("synthetic brand profile boundary", () => {
  it("freezes one current canonical profile and names Open House Boost gaps", () => {
    const profile = loadSyntheticBrandProfile();
    const missingFields = profile.canonicalProfile.requiredFields.filter(
      (field) => field.state === "missing",
    );

    expect(profile.safety).toMatchObject({ dataMode: "synthetic", writesEnabled: false });
    expect(profile.canonicalProfile.current).toBe(true);
    expect(profile.canonicalProfile.version).toBe("brand-v3");
    expect(missingFields.map((field) => field.label)).toEqual([
      "Equal Housing asset",
      "Florida license display",
    ]);
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile.canonicalProfile.fields)).toBe(true);
    expect(Object.isFrozen(profile.aiAssistance.suggestions)).toBe(true);
  });

  it("limits AI assistance to approved sample-backed suggestion fields", () => {
    const profile = loadSyntheticBrandProfile();
    const approvedSampleIds = new Set(
      profile.aiAssistance.approvedSamples.map((sample) => sample.id),
    );

    expect(
      profile.aiAssistance.suggestions.every(
        (suggestion) =>
          suggestion.state === "needs_confirmation" &&
          suggestion.sourceSampleIds.every((sourceId) => approvedSampleIds.has(sourceId)),
      ),
    ).toBe(true);
    expect(profile.aiAssistance.suggestions.map((suggestion) => suggestion.field)).toEqual([
      "voice",
      "signature_language",
      "banned_language",
    ]);
    expect(profile.aiAssistance.protectedFieldGroups).toContain("NMLS and licenses");
    expect(profile.aiAssistance.protectedFieldGroups).toContain("Lender and disclosures");
  });
});
