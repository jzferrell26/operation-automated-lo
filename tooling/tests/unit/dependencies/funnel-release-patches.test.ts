import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lock = readFileSync("pnpm-lock.yaml", "utf8");
const workspace = readFileSync("pnpm-workspace.yaml", "utf8");

describe("reference-funnel dependency qualification", () => {
  it("resolves the patched raster decoder in the app, renderer and test toolchain", () => {
    const versions = [...lock.matchAll(/^  sharp@(\d+)\.(\d+)\.(\d+):/gmu)];
    expect(versions.length).toBeGreaterThan(0);
    for (const [, major, minor, patch] of versions) {
      expect(
        Number(major) > 0 || Number(minor) > 35 || (Number(minor) === 35 && Number(patch) >= 5),
      ).toBe(true);
    }
    for (const file of ["package.json", "packages/rendering/package.json"]) {
      const manifest = JSON.parse(readFileSync(file, "utf8"));
      expect(manifest.dependencies?.sharp ?? manifest.devDependencies?.sharp).toBe("0.35.5");
    }
    expect(workspace).toContain("sharp@0.35.5: true");
  });

  it("keeps the inherited SDK on the issuer-binding patch without an advisory waiver", () => {
    const versions = [
      ...lock.matchAll(/^  '?@modelcontextprotocol\/sdk@(\d+)\.(\d+)\.(\d+)'?:/gmu),
    ];
    expect(versions.length).toBeGreaterThan(0);
    for (const [, major, minor] of versions) {
      expect(Number(major) > 1 || (Number(major) === 1 && Number(minor) >= 31)).toBe(true);
    }
    const exceptions = workspace.slice(workspace.indexOf("auditConfig:"));
    expect(exceptions).not.toContain("GHSA-wq5f-xc86-pv6w");
    expect(exceptions).not.toContain("GHSA-6qxp-vccf-f47h");
  });
});
