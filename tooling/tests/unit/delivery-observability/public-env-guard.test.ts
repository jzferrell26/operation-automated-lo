import {
  PUBLIC_ENVIRONMENT_VARIABLE_NAMES,
  SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES,
  assertPublicEnvironmentAllowlistSecure,
  collectAssignmentViolationsInSource,
  collectPublicAllowlistViolations,
} from "@oalo/config";
import { describe, expect, it } from "vitest";

describe("public environment secret boundary", () => {
  it("accepts the canonical public allowlist", () => {
    expect(() =>
      assertPublicEnvironmentAllowlistSecure(PUBLIC_ENVIRONMENT_VARIABLE_NAMES),
    ).not.toThrow();
    expect(collectPublicAllowlistViolations(PUBLIC_ENVIRONMENT_VARIABLE_NAMES)).toEqual([]);
  });

  it("rejects a secret-bearing name on the public allowlist", () => {
    const violatingAllowlist = ["NEXT_PUBLIC_OALO_DATABASE_URL"] as const;

    expect(collectPublicAllowlistViolations(violatingAllowlist)).toEqual([
      "Public environment variable name bears a secret-bearing segment: NEXT_PUBLIC_OALO_DATABASE_URL",
      "Public environment variable must not mirror server-only secret OALO_DATABASE_URL: NEXT_PUBLIC_OALO_DATABASE_URL",
    ]);
    expect(() => assertPublicEnvironmentAllowlistSecure(violatingAllowlist)).toThrow(
      "Public environment allowlist violates secret boundary:\nPublic environment variable name bears a secret-bearing segment: NEXT_PUBLIC_OALO_DATABASE_URL\nPublic environment variable must not mirror server-only secret OALO_DATABASE_URL: NEXT_PUBLIC_OALO_DATABASE_URL",
    );
  });

  it("rejects mirroring a server-only auth secret onto the public allowlist", () => {
    const violatingAllowlist = ["NEXT_PUBLIC_OALO_TASK_AUTHORITY_HMAC_KEY"] as const;

    expect(() => assertPublicEnvironmentAllowlistSecure(violatingAllowlist)).toThrow(
      /Public environment variable must not mirror server-only secret OALO_TASK_AUTHORITY_HMAC_KEY/u,
    );
  });

  it("lists every server-only secret the repository treats as non-public", () => {
    expect(SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES).toContain("OALO_DATABASE_URL");
    expect(SERVER_ONLY_SECRET_ENVIRONMENT_VARIABLE_NAMES).toContain("OALO_TASK_AUTHORITY_HMAC_KEY");
  });

  it("rejects assigning a server-only secret into a NEXT_PUBLIC variable", () => {
    const violations = collectAssignmentViolationsInSource({
      filePath: "synthetic/violating-bridge.ts",
      source: "process.env.NEXT_PUBLIC_OALO_DATABASE_URL = process.env.OALO_DATABASE_URL;",
    });

    expect(violations.length).toBeGreaterThan(0);
    expect(violations.join("\n")).toMatch(
      /assigns or maps a server-only secret into a NEXT_PUBLIC variable/u,
    );
  });
});
