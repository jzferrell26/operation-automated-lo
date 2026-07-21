import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MaliciousRenderInputFixtureSetSchema,
  assessUntrustedRenderInput,
} from "@oalo/test-support";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Phase 0 malicious rendering input corpus", () => {
  it("rejects all eight required vectors without network access", async () => {
    const source = await readFile(
      resolve("tests/fixtures/security/rendering/v1/malicious-inputs.json"),
      "utf8",
    );
    const fixtureSet = MaliciousRenderInputFixtureSetSchema.parse(JSON.parse(source));
    const network = vi.fn(() => {
      throw new Error("Network access is prohibited in the Phase 0 security harness");
    });
    vi.stubGlobal("fetch", network);

    expect(new Set(fixtureSet.fixtures.map((fixture) => fixture.vector))).toEqual(
      new Set([
        "image",
        "svg",
        "html",
        "url",
        "oversized",
        "mislabeled",
        "corrupt",
        "high-decompression",
      ]),
    );
    for (const fixture of fixtureSet.fixtures) {
      expect(assessUntrustedRenderInput(fixture)).toEqual(fixture.expected);
    }
    expect(network).not.toHaveBeenCalled();
  });
});
