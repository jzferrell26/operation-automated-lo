import { describe, expect, it } from "vitest";

import {
  canonicalCampaignHash,
  createApprovalDecision,
  freezeAuthenticatedPrincipal,
  projectCampaignWorkspace,
  runCampaignPreflight,
} from "@oalo/application";
import { evaluateCampaignPreflight } from "@oalo/domain";

import { campaignManifestFixture } from "../../../../packages/db/test/campaign-manifest-fixture.mjs";
import {
  LIBRARY_AD_INPUT_VERSIONS,
  libraryAdManifestInput,
  libraryAdRulesFor,
  libraryAdVersion,
  memoryVersionRepository,
} from "./library-ad-fixtures.js";
import { createCampaignVersion } from "@oalo/application";
import { CampaignManifestSchema, OpenHouseCampaignManifestSchema } from "@oalo/contracts";

/**
 * PRD-009 run rule on exported types. The manifest union reaches the domain's checks, the campaign
 * workspace read, and the approval snapshot, which all read open house fields today. Each of them
 * now narrows on `blueprintId`, and an open house version reads exactly as it did.
 */

const reader = freezeAuthenticatedPrincipal({
  actorRef: "principal_approver001",
  actorId: "00000000-0000-4000-8000-000000000812",
  locationRef: "location_01TenantA",
  locationId: "00000000-0000-4000-8000-000000000801",
  installationRef: "installation_alpha001",
  role: "campaign_approver",
  roleVersion: 1,
  sessionId: "session_approver001",
  authenticationMode: "embedded",
});

describe("manifest consumers narrow on blueprintId", () => {
  it("runs no open house rule on a library-ad manifest and every shared rule still applies", () => {
    const manifest = CampaignManifestSchema.parse(libraryAdManifestInput());
    expect(evaluateCampaignPreflight(manifest, libraryAdRulesFor())).toEqual([]);

    const blank = CampaignManifestSchema.parse(libraryAdManifestInput({ disclosureText: "" }));
    const codes = evaluateCampaignPreflight(blank, {
      ...libraryAdRulesFor(),
      minimumImageWidth: 1_200,
      minimumImageHeight: 630,
    }).map((finding) => finding.ruleCode);
    // PRD-009d D5: an empty disclosure line also has no Equal Housing statement.
    expect(codes).toEqual(["DISCLOSURE_REQUIRED", "IMAGE_QUALITY_LOW", "EQUAL_HOUSING_REQUIRED"]);
    for (const openHouseOnly of [
      "OPEN_HOUSE_DATES_INVALID",
      "PARTNER_PERMISSION_REQUIRED",
      "PROPERTY_PERMISSION_REQUIRED",
    ]) {
      expect(codes).not.toContain(openHouseOnly);
    }
  });

  it("keeps the open house rules for an open house manifest", () => {
    const manifest = OpenHouseCampaignManifestSchema.parse({
      ...campaignManifestFixture,
      partner: { ...campaignManifestFixture.partner, permissionConfirmed: false },
      property: { ...campaignManifestFixture.property, permissionConfirmed: false },
    });
    const codes = evaluateCampaignPreflight(manifest, {
      ...libraryAdRulesFor("2026-07-20T00:00:00.000Z"),
      allowedClaims: [...manifest.content.claims],
    }).map((finding) => finding.ruleCode);
    expect(codes).toEqual(["PARTNER_PERMISSION_REQUIRED", "PROPERTY_PERMISSION_REQUIRED"]);
  });

  it("projects a library-ad version without inventing a property, a Realtor, or open house times", async () => {
    const version = await libraryAdVersion({ startsAt: "2026-10-02T09:00:00.000Z" });
    const preflight = runCampaignPreflight(version, libraryAdRulesFor());
    const projection = projectCampaignWorkspace(
      {
        version,
        preflight,
        state: "awaiting_approval",
        rowVersion: 1,
        updatedAt: "2026-10-01T16:00:00.000Z",
      },
      reader,
      "filesystem",
    );
    expect(projection.headline).toBe("Buying your first home? Start with a plan.");
    expect(projection.propertyAddress).toBe("");
    expect(projection.realtorDisplayName).toBe("");
    expect(projection.openHouseStartsAt).toBe("2026-10-02T09:00:00.000Z");
    expect(projection.openHouseEndsAt).toBe("2026-10-15T23:59:00.000Z");
    expect(projection.targetingRegions).toEqual(["TX"]);
    expect(projection.disclosureText).toBe("Equal Housing Opportunity.");

    const unscheduled = await libraryAdVersion();
    expect(
      projectCampaignWorkspace(
        {
          version: unscheduled,
          preflight: runCampaignPreflight(unscheduled, libraryAdRulesFor()),
          state: "awaiting_approval",
          rowVersion: 1,
          updatedAt: "2026-10-01T16:00:00.000Z",
        },
        reader,
        "filesystem",
      ).openHouseStartsAt,
    ).toBe("");
  });

  it("builds the open house approval snapshot exactly as before", async () => {
    const manifest = OpenHouseCampaignManifestSchema.parse(campaignManifestFixture);
    const version = await createCampaignVersion(
      {
        createdAt: new Date("2026-07-21T16:00:00.000Z"),
        version: {
          schemaVersion: 1,
          locationRef: "location_01TenantA",
          campaignRef: "campaign_01OpenHouse",
          campaignVersionRef: "campaignversion_01OpenHouse",
          inputVersions: { ...LIBRARY_AD_INPUT_VERSIONS, rulesetVersionRef: "ruleset_01Policy" },
          manifest,
          createdBy: "user_01Creator",
        },
      },
      memoryVersionRepository(),
    );
    const decision = await createApprovalDecision(
      {
        approvalRef: "approval_01OpenHouse",
        campaignVersion: version,
        preflight: runCampaignPreflight(version, {
          ...libraryAdRulesFor("2026-07-20T00:00:00.000Z"),
          rulesetVersionRef: "ruleset_01Policy",
          allowedClaims: [...manifest.content.claims],
        }),
        actorRef: "principal_approver001",
        actorKind: "human",
        actorRole: "approver",
        decidedAt: new Date("2026-07-21T17:00:00.000Z"),
        ipAuditHash: "a".repeat(64),
        decision: "approved",
      },
      { async assertMayApprove() {} },
    );
    expect(decision.snapshot).toEqual({
      pageVersionRef: manifest.artifacts.pageVersionRef,
      pdfVersionRef: manifest.artifacts.pdfVersionRef,
      creativeVersionRef: manifest.artifacts.creativeVersionRef,
      copyVersionRef: manifest.artifacts.copyVersionRef,
      emailPackageVersionRef: manifest.artifacts.emailPackageVersionRef,
      smsPackageVersionRef: manifest.artifacts.smsPackageVersionRef,
      disclosureVersionRef: manifest.artifacts.disclosureVersionRef,
      targetingHash: canonicalCampaignHash(manifest.meta.targeting),
      budgetHash: canonicalCampaignHash({
        dailyBudgetMinor: manifest.meta.dailyBudgetMinor,
        totalBudgetMinor: manifest.meta.totalBudgetMinor,
      }),
      datesHash: canonicalCampaignHash({
        openHouseStartsAt: manifest.property.openHouseStartsAt,
        openHouseEndsAt: manifest.property.openHouseEndsAt,
      }),
      formVersionRef: manifest.artifacts.formVersionRef,
      destinationVersionRef: manifest.artifacts.destinationVersionRef,
    });
  });
});
