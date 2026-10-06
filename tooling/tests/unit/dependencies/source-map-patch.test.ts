import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../../..");

describe("source-map-js advisory remediation (GHSA-68fv-2mgg-jv7q)", () => {
  it("keeps every resolved copy at or above the published 1.2.2 patch floor", () => {
    const lock = readFileSync(resolve(root, "pnpm-lock.yaml"), "utf8");
    const versions = [...lock.matchAll(/^  source-map-js@(\d+)\.(\d+)\.(\d+):/gmu)];
    expect(versions.length).toBeGreaterThan(0);
    for (const match of versions) {
      const major = Number(match[1]),
        minor = Number(match[2]),
        patch = Number(match[3]);
      expect(major > 1 || (major === 1 && (minor > 2 || (minor === 2 && patch >= 2)))).toBe(true);
    }
  });

  it("records a dependency patch rather than an ignored advisory", () => {
    const workspace = readFileSync(resolve(root, "pnpm-workspace.yaml"), "utf8");
    expect(workspace).toContain("source-map-js@<1.2.2: 1.2.2");
    expect(workspace.slice(workspace.indexOf("auditConfig:"))).not.toContain("GHSA-68fv-2mgg-jv7q");
  });
});

describe("proxy-addr advisory remediation (GHSA-jqcg-44mw-7w3h)", () => {
  it("keeps resolved copies at or above the published 2.0.8 patch floor", () => {
    const lock = readFileSync(resolve(root, "pnpm-lock.yaml"), "utf8");
    const versions = [...lock.matchAll(/^  proxy-addr@(\d+)\.(\d+)\.(\d+):/gmu)];
    expect(versions.length).toBeGreaterThan(0);
    for (const match of versions) {
      const major = Number(match[1]),
        minor = Number(match[2]),
        patch = Number(match[3]);
      expect(major > 2 || (major === 2 && (minor > 0 || (minor === 0 && patch >= 8)))).toBe(true);
    }
  });

  it("patches the development dependency rather than ignoring its critical advisory", () => {
    const workspace = readFileSync(resolve(root, "pnpm-workspace.yaml"), "utf8");
    expect(workspace).toContain("proxy-addr@<2.0.8: 2.0.8");
    expect(workspace.slice(workspace.indexOf("auditConfig:"))).not.toContain("GHSA-jqcg-44mw-7w3h");
  });
});
