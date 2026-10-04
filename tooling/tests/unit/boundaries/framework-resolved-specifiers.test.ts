import { describe, expect, it } from "vitest";

import { isUndeclaredImport } from "../../../scripts/audit-boundaries.mjs";

/**
 * PRD-009 (009C-AC-013, MTK-010). The boundary audit lets a package that declares `next` import
 * `server-only` and `client-only` without a manifest entry, because Next.js resolves both itself,
 * and holds every other import, and every other package, to the manifest.
 */
describe("framework-resolved specifiers in the boundary audit", () => {
  const nextApp = new Set(["next", "react"]);
  const plainPackage = new Set(["zod"]);

  it("accepts server-only and client-only in a package that declares next", () => {
    expect(isUndeclaredImport("server-only", nextApp)).toBe(false);
    expect(isUndeclaredImport("client-only", nextApp)).toBe(false);
  });

  it("refuses them in a package that does not declare next", () => {
    expect(isUndeclaredImport("server-only", plainPackage)).toBe(true);
    expect(isUndeclaredImport("client-only", plainPackage)).toBe(true);
  });

  it("still refuses any other undeclared import in a next package", () => {
    expect(isUndeclaredImport("left-pad", nextApp)).toBe(true);
    expect(isUndeclaredImport("server-only-ish", nextApp)).toBe(true);
  });

  it("accepts a declared import", () => {
    expect(isUndeclaredImport("react", nextApp)).toBe(false);
    expect(isUndeclaredImport("zod", plainPackage)).toBe(false);
  });
});
