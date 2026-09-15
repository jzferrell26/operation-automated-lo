import { describe, expect, it } from "vitest";

import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { LOCAL_SYNTHETIC_ENV, OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import { compileOpenHouseDraft } from "./open-house-draft.js";

describe("open house draft compiler", () => {
  it("builds a frozen production-contract version and passes deterministic preflight", async () => {
    const result = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      createLocalSyntheticPrincipal(),
      LOCAL_SYNTHETIC_ENV,
    );
    expect(result.version.manifest.blueprintId).toBe("open-house-boost");
    expect(result.version.manifest.meta.specialAdCategory).toBe("HOUSING");
    expect(result.preflight.blocking).toBe(false);
  });

  it("uses the real preflight rules to block missing attestations", async () => {
    const result = await compileOpenHouseDraft(
      {
        ...OPEN_HOUSE_DRAFT_INPUT,
        propertyPermissionConfirmed: false,
        realtorPermissionConfirmed: false,
      },
      createLocalSyntheticPrincipal(),
      LOCAL_SYNTHETIC_ENV,
    );
    expect(result.preflight.blocking).toBe(true);
    expect(result.preflight.findings.map((item) => item.ruleCode)).toEqual(
      expect.arrayContaining(["PROPERTY_PERMISSION_REQUIRED", "PARTNER_PERMISSION_REQUIRED"]),
    );
  });
});
