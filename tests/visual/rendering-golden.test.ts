import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadGoldenFixtureRegistry, verifyGoldenFixtureSet } from "@oalo/test-support";

const fixtureRoot = resolve("tests/fixtures/rendering/v1");
const canonicalRoot = resolve("tests/visual/rendering/v1");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("versioned golden rendering fixtures", () => {
  it("matches canonical bytes and stable SHA-256 values without network access", async () => {
    let networkAttempts = 0;
    vi.stubGlobal("fetch", () => {
      networkAttempts += 1;
      throw new Error("Remote network is forbidden in the Phase 0 render harness");
    });

    const registry = await loadGoldenFixtureRegistry(fixtureRoot);
    const verified = await verifyGoldenFixtureSet(fixtureRoot);

    expect(Object.isFrozen(registry)).toBe(true);
    expect(verified).toHaveLength(3);
    expect(networkAttempts).toBe(0);

    for (const result of verified) {
      const expected = registry.fixtures.find((entry) => entry.file === result.file);
      expect(expected).toBeDefined();
      if (expected === undefined) {
        throw new Error(`Missing registry entry for ${result.file}`);
      }
      const goldenBytes = await readFile(resolve(canonicalRoot, expected.canonicalFile));
      expect(Buffer.from(result.canonicalBytes)).toEqual(goldenBytes);
      expect(result.sha256).toBe(expected.sha256);
      expect(Object.isFrozen(result.manifest)).toBe(true);
      expect(Object.isFrozen(result.manifest.content)).toBe(true);
    }
  });

  it("covers common, long, and adversarial text inputs as inert data", async () => {
    const fixtures = await verifyGoldenFixtureSet(fixtureRoot);
    const longFixture = fixtures.find((fixture) => fixture.file === "long-content.json");
    const adversarialFixture = fixtures.find(
      (fixture) => fixture.file === "adversarial-content.json",
    );

    expect(longFixture?.manifest.content.disclosure.length).toBeGreaterThan(1_000);
    expect(adversarialFixture?.manifest.content.headline).toContain("<script>");
    expect(adversarialFixture?.manifest.assets).toEqual([]);
  });
});
