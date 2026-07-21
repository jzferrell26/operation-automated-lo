import { describe, expect, it } from "vitest";

import { loadSyntheticUiFixture } from "../data/load-synthetic-ui.js";
import { parseSyntheticUiFixture } from "./synthetic-ui.js";

describe("synthetic UI fixture boundary", () => {
  it("strictly parses and recursively freezes the complete projection", () => {
    const fixture = loadSyntheticUiFixture();

    expect(fixture.session.safety).toEqual(
      expect.objectContaining({ dataMode: "synthetic", writesEnabled: false }),
    );
    expect(Object.isFrozen(fixture)).toBe(true);
    expect(Object.isFrozen(fixture.session)).toBe(true);
    expect(Object.isFrozen(fixture.navigation.items)).toBe(true);
    const completed = fixture.onboarding.getConnected[0];
    expect(completed?.state).toBe("complete");
    if (completed?.state !== "complete") {
      throw new Error("Expected the install fixture to be complete.");
    }
    expect(Object.isFrozen(completed.evidence)).toBe(true);
  });

  it("rejects enabled writes and unrecognized fixture fields", () => {
    const fixture = loadSyntheticUiFixture();
    const writesEnabled = {
      ...fixture,
      session: {
        ...fixture.session,
        safety: { ...fixture.session.safety, writesEnabled: true },
      },
    };
    const unknownRootField = { ...fixture, productionProvider: "forbidden" };

    expect(() => parseSyntheticUiFixture(writesEnabled)).toThrow();
    expect(() => parseSyntheticUiFixture(unknownRootField)).toThrow();
  });

  it("preserves the exact nine-item and six-item Marketing navigation inventories", () => {
    const { navigation } = loadSyntheticUiFixture();

    expect(navigation.items.map((item) => item.label)).toEqual([
      "Overview",
      "Marketing Suite",
      "Brand Engine",
      "Partners",
      "Leads and Pipeline",
      "Automations",
      "Reports",
      "Marketplace",
      "Settings",
    ]);
    expect(navigation.marketingItems.map((item) => item.label)).toEqual([
      "Campaigns",
      "Property Sites",
      "PDFs and Creative",
      "Ads Manager",
      "Email and SMS",
      "Blueprint Templates",
    ]);
  });
});
