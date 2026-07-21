import { describe, expect, it } from "vitest";

import { getFoundationSnapshot } from "@oalo/application";
import { RenderFixtureManifestSchema, canonicalBytes, canonicalSha256 } from "@oalo/test-support";

describe("Phase 0 foundation", () => {
  it("keeps production traffic disabled in the shared application shell", () => {
    expect(getFoundationSnapshot()).toEqual({
      phase: "phase-0-evidence-harness",
      productionTrafficEnabled: false,
      contractVersion: "2026-07-20",
    });
  });

  it("canonicalizes key order, line endings, and Unicode deterministically", () => {
    const left = { z: "Cafe\u0301\r\nline", a: 1 };
    const right = { a: 1, z: "Café\nline" };

    expect(canonicalBytes(left)).toEqual(canonicalBytes(right));
    expect(canonicalSha256(left)).toBe(canonicalSha256(right));
  });

  it("rejects remote assets at the fixture boundary", () => {
    const result = RenderFixtureManifestSchema.safeParse({
      schemaVersion: 1,
      fixtureId: "remote-asset",
      renderer: { id: "phase0-canonical-fixture", version: "1.0.0" },
      template: { id: "single-property-campaign", version: "1.0.0" },
      fonts: [{ family: "Inter", version: "4.1", sha256: "1".repeat(64) }],
      content: { headline: "Synthetic", address: "Synthetic", disclosure: "Synthetic" },
      assets: [
        {
          id: "remote",
          kind: "remote-url",
          mediaType: "image/png",
          sha256: "2".repeat(64),
          url: "https://example.invalid/image.png",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
