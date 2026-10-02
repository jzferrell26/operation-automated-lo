import { describe, expect, it } from "vitest";

import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { LOCAL_SYNTHETIC_ENV, OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import { compileOpenHouseDraft } from "./open-house-draft.test-support.js";

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

  /**
   * PRD-008b 008B-AC-001. The draft builder has no photo input, so the loan officer never supplied
   * an image. The saved version therefore records none, rather than an approved one nobody saw.
   */
  it("records no property image, because the loan officer supplied none", async () => {
    const result = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      createLocalSyntheticPrincipal(),
      LOCAL_SYNTHETIC_ENV,
    );
    expect(result.version.manifest.images).toEqual([]);
  });

  /**
   * PRD-008b 008B-AC-002, the part that needs no database. Preflight checks only the images that
   * are present, so an empty list raises neither image finding and does not block on its own.
   */
  it("raises no image finding for a version with no image", async () => {
    const result = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      createLocalSyntheticPrincipal(),
      LOCAL_SYNTHETIC_ENV,
    );
    const codes = result.preflight.findings.map((item) => item.ruleCode);
    expect(codes).not.toContain("IMAGE_NOT_APPROVED");
    expect(codes).not.toContain("IMAGE_QUALITY_LOW");
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
