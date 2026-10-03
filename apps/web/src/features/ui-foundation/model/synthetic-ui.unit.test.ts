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

  /**
   * Superseded on 2026-10-01 by PRD-009 (009A-AC-014, OD-A, OD-C, D-2): the nine-item navigation
   * and the six Marketing Suite sub-items are gone. The fixture carries the one menu of 009a D2.
   */
  it("carries exactly the six-item menu, with no Marketing Suite sub-items", () => {
    const { navigation } = loadSyntheticUiFixture();

    expect(navigation.items.map((item) => item.label)).toEqual([
      "Home",
      "Campaigns",
      "Brand",
      "Realtor partners",
      "Homeowner reports",
      "Settings",
    ]);
    expect(Object.keys(navigation)).toEqual(["items"]);
  });

  it("rejects a menu that is not the six, and any Marketing Suite list", () => {
    const fixture = loadSyntheticUiFixture();
    const nine = {
      ...fixture,
      navigation: { items: [...fixture.navigation.items, ...fixture.navigation.items.slice(0, 3)] },
    };
    const withMarketing = {
      ...fixture,
      navigation: { ...fixture.navigation, marketingItems: [] },
    };

    expect(() => parseSyntheticUiFixture(nine)).toThrow();
    expect(() => parseSyntheticUiFixture(withMarketing)).toThrow();
  });
});
