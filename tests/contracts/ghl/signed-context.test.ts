import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseSignedContextFixture } from "../../../packages/ghl/src/signed-context.js";

function loadFixture(fileName: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/${fileName}`, import.meta.url), "utf8"));
}

describe("sanitized HighLevel signed-context fixtures", () => {
  it("accepts a synthetic location context projection", () => {
    const fixture = parseSignedContextFixture(loadFixture("signed-context-valid.json"));

    expect(fixture.verificationState).toBe("fixture-only");
    expect(fixture.context.contextType).toBe("location");
    expect(fixture.context.activeLocationRef).toBe("synthetic_location_001");
  });

  it("fails every negative signed-context vector closed", () => {
    const vectors = loadFixture("signed-context-negative-vectors.json");
    expect(Array.isArray(vectors)).toBe(true);

    for (const vector of vectors as ReadonlyArray<{ readonly fixture: unknown }>) {
      expect(() => parseSignedContextFixture(vector.fixture)).toThrow();
    }
  });
});
