import { describe, expect, it, vi } from "vitest";

import {
  appendCampaignTransition,
  authorizePaidAdProjectionForRendering,
  completeRegeneration,
  createApprovalDecision,
  createCampaignVersion,
  createCampaignProjections,
  createProjectionApprovalDecision,
  duplicateCampaign,
  recordGeneration,
  redeemApprovalLink,
  retryCampaignOperation,
  runCampaignPreflight,
  runPaidAdBrandPreflight,
  type CampaignVersionRepository,
  type CampaignVersionTransaction,
} from "@oalo/application";
import {
  CampaignManifestSchema,
  type CampaignEvent,
  type CampaignInputVersions,
  type CampaignManifest,
  type CampaignVersion,
  type PreflightRules,
} from "@oalo/contracts";
import {
  assertCampaignTransition,
  assertCampaignVersionTenant,
  assertPublishFreshness,
  validateApprovalLink,
} from "@oalo/domain";

const locationRef = "location_01TenantA";
const campaignRef = "campaign_01OpenHouse";
const now = new Date("2026-07-21T16:00:00.000Z");
const sha = (character: string) => character.repeat(64);

const inputVersions: CampaignInputVersions = {
  blueprintVersionRef: "blueprint_01OpenHouse",
  brandProfileVersionRef: "profile_01Brand",
  complianceProfileVersionRef: "profile_01Compliance",
  partnerProfileVersionRef: "profile_01Partner",
  routingProfileVersionRef: "profile_01Routing",
  rulesetVersionRef: "ruleset_01Policy",
};

const manifest: CampaignManifest = CampaignManifestSchema.parse({
  schemaVersion: 1,
  blueprintId: "open-house-boost",
  property: {
    address: "123 Main Street",
    description: "A fixture-backed property.",
    openHouseStartsAt: "2026-07-25T18:00:00.000Z",
    openHouseEndsAt: "2026-07-25T20:00:00.000Z",
    stateCode: "TX",
    permissionConfirmed: true,
  },
  content: {
    headline: "Tour 123 Main Street",
    callToAction: "View the open house",
    disclosureText: "Equal Housing Opportunity.",
    consentText: "By submitting, you consent to contact.",
    body: "Join {{realtor_name}} for an open house.",
    claims: ["Open house information is subject to change."],
    mergeTokens: ["{{realtor_name}}"],
    financingTerms: [],
  },
  images: [
    {
      assetRef: "asset_01Exterior",
      approvalStatus: "approved",
      width: 1_600,
      height: 900,
      altText: "Exterior of 123 Main Street",
    },
  ],
  partner: { realtorDisplayName: "Taylor Reed", permissionConfirmed: true },
  artifacts: {
    pageVersionRef: "page_01Approved",
    pdfVersionRef: "pdf_01Approved",
    creativeVersionRef: "creative_01Approved",
    copyVersionRef: "copy_01Approved",
    emailPackageVersionRef: "email_01Approved",
    smsPackageVersionRef: "sms_01Approved",
    disclosureVersionRef: "disclosure_01Approved",
    formVersionRef: "form_01Approved",
    destinationVersionRef: "destination_01Approved",
    qrDestinationVersionRef: "destination_01Approved",
  },
  meta: {
    enabled: true,
    specialAdCategory: "HOUSING",
    platform: "meta",
    targeting: {
      country: "US",
      regions: ["Texas"],
      zipCodes: [],
      customAudienceRefs: [],
      protectedDimensions: [],
    },
    dailyBudgetMinor: 2_000,
    totalBudgetMinor: 10_000,
  },
  routing: { mappingVersionRef: "mapping_01Routing", validationStatus: "valid" },
});

const rules: PreflightRules = {
  schemaVersion: 1,
  rulesetVersionRef: inputVersions.rulesetVersionRef,
  evaluatedAt: now.toISOString(),
  minimumImageWidth: 1_200,
  minimumImageHeight: 630,
  earliestStartAt: "2026-07-22T00:00:00.000Z",
  allowedMergeTokens: ["{{realtor_name}}"],
  bannedPhrases: ["guaranteed approval"],
  allowedClaims: ["Open house information is subject to change."],
  allowsFinancingTerms: false,
  minimumDailyBudgetMinor: 500,
  maximumDailyBudgetMinor: 10_000,
  maximumTotalBudgetMinor: 50_000,
  warnings: [],
};

function versionInput(
  campaignVersionRef = "version_01Campaign",
  nextManifest: CampaignManifest = manifest,
) {
  return {
    schemaVersion: 1 as const,
    locationRef,
    campaignRef,
    campaignVersionRef,
    inputVersions,
    manifest: nextManifest,
    createdBy: "user_01Creator",
  };
}

function repositoryHarness() {
  const versions: CampaignVersion[] = [];
  const repository: CampaignVersionRepository = {
    async run<T>(work: (transaction: CampaignVersionTransaction) => Promise<T>): Promise<T> {
      const length = versions.length;
      try {
        return await work({
          async getLatestVersionNo(location, campaign) {
            return Math.max(
              0,
              ...versions
                .filter(
                  (version) => version.locationRef === location && version.campaignRef === campaign,
                )
                .map((version) => version.versionNo),
            );
          },
          async append(version) {
            if (
              versions.some(
                (existing) => existing.campaignVersionRef === version.campaignVersionRef,
              )
            ) {
              throw new Error("duplicate campaign version");
            }
            versions.push(version);
          },
        });
      } catch (error: unknown) {
        versions.splice(length);
        throw error;
      }
    },
  };
  return { repository, versions };
}

async function approvedVersion() {
  return createCampaignVersion(
    { version: versionInput(), createdAt: now },
    repositoryHarness().repository,
  );
}

describe("immutable campaign versions", () => {
  it("records every input version and hashes all material manifest content", async () => {
    const harness = repositoryHarness();
    const first = await createCampaignVersion(
      { version: versionInput(), createdAt: now },
      harness.repository,
    );
    const same = await createCampaignVersion(
      {
        version: versionInput("version_02Campaign"),
        createdAt: new Date("2026-07-21T16:01:00.000Z"),
      },
      harness.repository,
    );
    const changed = await createCampaignVersion(
      {
        version: versionInput(
          "version_03Campaign",
          CampaignManifestSchema.parse({
            ...manifest,
            content: { ...manifest.content, headline: "A material edit" },
          }),
        ),
        createdAt: new Date("2026-07-21T16:02:00.000Z"),
      },
      harness.repository,
    );
    expect(first.versionNo).toBe(1);
    expect(same.versionNo).toBe(2);
    expect(same.manifestHash).toBe(first.manifestHash);
    expect(changed.manifestHash).not.toBe(first.manifestHash);
    expect(first.inputVersions).toEqual(inputVersions);
    expect(harness.versions).toHaveLength(3);
    expect(() => {
      (first.manifest.content as { headline: string }).headline = "mutated";
    }).toThrow();
  });

  it("duplicates an approved campaign as a new draft only after current dependencies revalidate", async () => {
    const source = await approvedVersion();
    const harness = repositoryHarness();
    const duplicate = await duplicateCampaign(
      {
        sourceVersion: source,
        sourceState: "approved",
        newCampaignRef: "campaign_02Duplicate",
        newCampaignVersionRef: "version_01Duplicate",
        currentInputVersions: {
          ...inputVersions,
          brandProfileVersionRef: "profile_02BrandCurrent",
        },
        currentDependenciesValid: true,
        actorRef: "user_01Creator",
        createdAt: now,
      },
      harness.repository,
    );
    expect(duplicate.sourceCampaignRef).toBe(source.campaignRef);
    expect(duplicate.campaignRef).toBe("campaign_02Duplicate");
    expect(duplicate.inputVersions.brandProfileVersionRef).toBe("profile_02BrandCurrent");
    await expect(
      duplicateCampaign(
        {
          sourceVersion: source,
          sourceState: "approved",
          newCampaignRef: "campaign_03Blocked",
          newCampaignVersionRef: "version_01Blocked",
          currentInputVersions: inputVersions,
          currentDependenciesValid: false,
          actorRef: "user_01Creator",
          createdAt: now,
        },
        harness.repository,
      ),
    ).rejects.toThrow("must revalidate");
    await expect(
      duplicateCampaign(
        {
          sourceVersion: source,
          sourceState: "live",
          newCampaignRef: "campaign_04InvalidState",
          newCampaignVersionRef: "version_01InvalidState",
          currentInputVersions: inputVersions,
          currentDependenciesValid: true,
          actorRef: "user_01Creator",
          createdAt: now,
        },
        harness.repository,
      ),
    ).rejects.toThrow("approved or completed");
  });

  it("rejects cross-location repository results", async () => {
    const version = await approvedVersion();
    expect(assertCampaignVersionTenant(version, locationRef)).toEqual(version);
    expect(() => assertCampaignVersionTenant(version, "location_02TenantB")).toThrow(
      "outside the active location",
    );
  });
});

describe("deterministic preflight and approval", () => {
  it("is deterministic, side-effect free, separately testable, and preserves warnings", async () => {
    const version = await approvedVersion();
    const withWarning = {
      ...rules,
      warnings: [
        {
          ruleCode: "ALT_TEXT_REVIEW",
          description: "Review image alternative text before approval.",
          affected: "images[0].altText",
          remediation: "Confirm that the description is useful and concise.",
        },
      ],
    };
    const first = runCampaignPreflight(version, withWarning);
    const second = runCampaignPreflight(structuredClone(version), structuredClone(withWarning));
    expect(second).toEqual(first);
    expect(first.blocking).toBe(false);
    expect(first.findings).toEqual([
      expect.objectContaining({ severity: "warning", ruleCode: "ALT_TEXT_REVIEW" }),
    ]);
    expect(first.inputVersions).toEqual(inputVersions);
    expect(first.rulesetVersionRef).toBe(inputVersions.rulesetVersionRef);
  });

  it("covers every blocking rule family and cannot accept a model waiver", async () => {
    const version = await approvedVersion();
    const badManifest = CampaignManifestSchema.parse({
      ...manifest,
      property: {
        ...manifest.property,
        openHouseStartsAt: "2026-07-20T20:00:00.000Z",
        openHouseEndsAt: "2026-07-20T19:00:00.000Z",
        permissionConfirmed: false,
      },
      content: {
        ...manifest.content,
        disclosureText: "",
        consentText: "",
        body: "Guaranteed approval {{unknown_token}}",
        claims: ["Unapproved claim"],
        mergeTokens: ["{{unknown_token}}"],
        financingTerms: ["3 percent APR"],
      },
      images: [
        {
          ...manifest.images[0],
          approvalStatus: "pending",
          width: 640,
          height: 480,
        },
      ],
      partner: { ...manifest.partner, permissionConfirmed: false },
      meta: {
        ...manifest.meta,
        specialAdCategory: "NONE",
        platform: "google",
        targeting: {
          ...manifest.meta.targeting,
          zipCodes: ["78701"],
          customAudienceRefs: ["audience_01Blocked"],
          protectedDimensions: ["age"],
        },
        dailyBudgetMinor: 50_000,
        totalBudgetMinor: 100_000,
      },
      routing: { ...manifest.routing, validationStatus: "missing" },
    });
    const badVersion = await createCampaignVersion(
      {
        version: versionInput("version_02BadCampaign", badManifest),
        createdAt: now,
      },
      repositoryHarness().repository,
    );
    const result = runCampaignPreflight(badVersion, rules);
    const codes = new Set(result.findings.map((item) => item.ruleCode));
    expect(codes).toEqual(
      new Set([
        "DISCLOSURE_REQUIRED",
        "CONSENT_REQUIRED",
        "IMAGE_NOT_APPROVED",
        "IMAGE_QUALITY_LOW",
        "OPEN_HOUSE_DATES_INVALID",
        "BRAND_BANNED_PHRASE",
        "MERGE_TOKEN_NOT_ALLOWED",
        "CLAIM_POLICY_BLOCKED",
        "FINANCING_TERMS_BLOCKED",
        "PARTNER_PERMISSION_REQUIRED",
        "PROPERTY_PERMISSION_REQUIRED",
        "META_HOUSING_CATEGORY_REQUIRED",
        "TARGETING_NOT_ALLOWED",
        "BUDGET_OUT_OF_BOUNDS",
        "GHL_ROUTING_INCOMPLETE",
      ]),
    );
    expect(result.blocking).toBe(true);
    expect(() => runCampaignPreflight(version, { ...rules, modelWaiver: true })).toThrow();
  });

  it("rejects tampered versions, mismatched rules, and stale approval inputs", async () => {
    const version = await approvedVersion();
    expect(() => runCampaignPreflight({ ...version, manifestHash: sha("f") }, rules)).toThrow(
      "manifest hash",
    );
    expect(() =>
      runCampaignPreflight(version, { ...rules, rulesetVersionRef: "ruleset_02Wrong" }),
    ).toThrow("does not match");
    const passing = runCampaignPreflight(version, rules);
    const authority = { assertMayApprove: vi.fn(async () => undefined) };
    await expect(
      createApprovalDecision(
        {
          approvalRef: "approval_02Tampered",
          campaignVersion: { ...version, manifestHash: sha("f") },
          preflight: passing,
          actorRef: "user_01Approver",
          actorKind: "human",
          actorRole: "approver",
          decidedAt: now,
          ipAuditHash: sha("a"),
          decision: "approved",
        },
        authority,
      ),
    ).rejects.toThrow("manifest hash");
    await expect(
      createApprovalDecision(
        {
          approvalRef: "approval_02Blocked",
          campaignVersion: version,
          preflight: { ...passing, blocking: true },
          actorRef: "user_01Approver",
          actorKind: "human",
          actorRole: "approver",
          decidedAt: now,
          ipAuditHash: sha("a"),
          decision: "approved",
        },
        authority,
      ),
    ).rejects.toThrow("passing preflight");
  });

  it("authorizes approvals, captures the exact snapshot, and rechecks freshness at publish", async () => {
    const version = await approvedVersion();
    const preflight = runCampaignPreflight(version, rules);
    const deniedAuthority = {
      assertMayApprove: vi.fn(async () => Promise.reject(new Error("not authorized"))),
    };
    for (const actorKind of ["model", "service"] as const) {
      await expect(
        createApprovalDecision(
          {
            approvalRef: `approval_01${actorKind}`,
            campaignVersion: version,
            preflight,
            actorRef: `principal_01${actorKind}`,
            actorKind,
            actorRole: "approver",
            decidedAt: now,
            ipAuditHash: sha("a"),
            decision: "approved",
          },
          deniedAuthority,
        ),
      ).rejects.toThrow("Only a human principal");
    }
    expect(deniedAuthority.assertMayApprove).not.toHaveBeenCalled();
    await expect(
      createApprovalDecision(
        {
          approvalRef: "approval_01Blocked",
          campaignVersion: version,
          preflight,
          actorRef: "user_01Viewer",
          actorKind: "human",
          actorRole: "approver",
          decidedAt: now,
          ipAuditHash: sha("a"),
          decision: "approved",
        },
        deniedAuthority,
      ),
    ).rejects.toThrow("not authorized");
    const authority = { assertMayApprove: vi.fn(async () => undefined) };
    const realtor = await createApprovalDecision(
      {
        approvalRef: "approval_01Realtor",
        campaignVersion: version,
        preflight,
        actorRef: "user_01Realtor",
        actorKind: "human",
        actorRole: "realtor_approver",
        decidedAt: now,
        ipAuditHash: sha("a"),
        decision: "approved",
      },
      authority,
    );
    const lender = await createApprovalDecision(
      {
        approvalRef: "approval_01Lender",
        campaignVersion: version,
        preflight,
        actorRef: "user_01Lender",
        actorKind: "human",
        actorRole: "lender_approver",
        decidedAt: now,
        ipAuditHash: sha("b"),
        decision: "approved",
      },
      authority,
    );
    expect(authority.assertMayApprove).toHaveBeenCalledTimes(2);
    expect(realtor.snapshot).toMatchObject({
      pageVersionRef: manifest.artifacts.pageVersionRef,
      pdfVersionRef: manifest.artifacts.pdfVersionRef,
      creativeVersionRef: manifest.artifacts.creativeVersionRef,
      copyVersionRef: manifest.artifacts.copyVersionRef,
      emailPackageVersionRef: manifest.artifacts.emailPackageVersionRef,
      smsPackageVersionRef: manifest.artifacts.smsPackageVersionRef,
      disclosureVersionRef: manifest.artifacts.disclosureVersionRef,
      formVersionRef: manifest.artifacts.formVersionRef,
      destinationVersionRef: manifest.artifacts.destinationVersionRef,
    });
    expect(() =>
      assertPublishFreshness({
        campaignVersion: version,
        preflight,
        approvals: [realtor],
        requiredApprovalRoles: ["realtor_approver", "lender_approver"],
      }),
    ).toThrow("lender_approver");
    expect(() =>
      assertPublishFreshness({
        campaignVersion: version,
        preflight,
        approvals: [realtor, lender],
        requiredApprovalRoles: ["realtor_approver", "lender_approver"],
      }),
    ).not.toThrow();
    expect(() =>
      assertPublishFreshness({
        campaignVersion: { ...version, manifestHash: sha("f") },
        preflight,
        approvals: [realtor, lender],
        requiredApprovalRoles: ["realtor_approver", "lender_approver"],
      }),
    ).toThrow("stale");
  });

  it("keeps approval links short-lived, single-purpose, and tenant-bound", () => {
    const claims = {
      schemaVersion: 1,
      linkRef: "link_01Approval",
      locationRef,
      campaignVersionRef: "version_01Campaign",
      purpose: "campaign-approval",
      approverRole: "realtor_approver",
      expiresAt: "2026-07-21T16:05:00.000Z",
    };
    expect(() =>
      validateApprovalLink(claims, {
        locationRef,
        campaignVersionRef: "version_01Campaign",
        now,
      }),
    ).not.toThrow();
    for (const invalid of [
      { ...claims, expiresAt: now.toISOString() },
      { ...claims, redeemedAt: now.toISOString() },
      { ...claims, locationRef: "location_02TenantB" },
    ]) {
      expect(() =>
        validateApprovalLink(invalid, {
          locationRef,
          campaignVersionRef: "version_01Campaign",
          now,
        }),
      ).toThrow();
    }
  });

  it("redeems an approval link atomically once", async () => {
    const claims = {
      schemaVersion: 1,
      linkRef: "link_01Approval",
      locationRef,
      campaignVersionRef: "version_01Campaign",
      purpose: "campaign-approval",
      approverRole: "realtor_approver",
      expiresAt: "2026-07-21T16:05:00.000Z",
    } as const;
    const redeemOnce = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(
      redeemApprovalLink(
        claims,
        { locationRef, campaignVersionRef: "version_01Campaign", now },
        { redeemOnce },
      ),
    ).resolves.toMatchObject({ redeemedAt: now.toISOString() });
    await expect(
      redeemApprovalLink(
        claims,
        { locationRef, campaignVersionRef: "version_01Campaign", now },
        { redeemOnce },
      ),
    ).rejects.toThrow("already redeemed");
  });
});

describe("append-only campaign state and generation accounting", () => {
  it("fails invalid transitions and appends a valid event exactly once", async () => {
    expect(() => assertCampaignTransition("draft", "live")).toThrow("Invalid campaign transition");
    const event: CampaignEvent = {
      schemaVersion: 1,
      eventRef: "event_01Generated",
      locationRef,
      campaignRef,
      campaignVersionRef: "version_01Campaign",
      fromState: "draft",
      toState: "generated",
      actorRef: "user_01Creator",
      occurredAt: now.toISOString(),
      correlationRef: "correlation_01Campaign",
    };
    const append = vi.fn(async () => undefined);
    await expect(
      appendCampaignTransition(event, {
        currentState: async () => "draft",
        append,
      }),
    ).resolves.toEqual(event);
    expect(append).toHaveBeenCalledOnce();
    await expect(
      appendCampaignTransition(event, {
        currentState: async () => "approved",
        append,
      }),
    ).rejects.toThrow("state changed");
  });

  it("retries the same campaign version and consumes allowance only for usable output", () => {
    const operation = {
      operationRef: "operation_01Generate",
      campaignRef,
      campaignVersionRef: "version_01Campaign",
    } as const;
    expect(retryCampaignOperation(operation)).toBe(operation);
    expect(
      recordGeneration({
        schemaVersion: 1,
        generationRef: "generation_01Usable",
        locationRef,
        campaignRef,
        campaignVersionRef: operation.campaignVersionRef,
        promptSnapshotHash: sha("a"),
        modelPolicyRef: "policy_01Model",
        promptPolicyRef: "policy_01Prompt",
        providerRequestRef: "request_01Provider",
        inputTokens: 100,
        outputTokens: 50,
        acceptedOutputHash: sha("b"),
        result: "usable",
        planAllowanceConsumed: true,
        createdAt: now.toISOString(),
      }),
    ).toMatchObject({ result: "usable", planAllowanceConsumed: true });
    expect(() =>
      recordGeneration({
        schemaVersion: 1,
        generationRef: "generation_02Rejected",
        locationRef,
        campaignRef,
        campaignVersionRef: operation.campaignVersionRef,
        promptSnapshotHash: sha("a"),
        modelPolicyRef: "policy_01Model",
        promptPolicyRef: "policy_01Prompt",
        providerRequestRef: "request_02Provider",
        inputTokens: 100,
        outputTokens: 0,
        result: "rejected",
        planAllowanceConsumed: true,
        createdAt: now.toISOString(),
      }),
    ).toThrow("Only usable accepted generations");
  });

  it("creates a new immutable version only for a usable regeneration", async () => {
    const harness = repositoryHarness();
    const generation = {
      schemaVersion: 1,
      generationRef: "generation_03Usable",
      locationRef,
      campaignRef,
      campaignVersionRef: "version_02Regenerated",
      promptSnapshotHash: sha("a"),
      modelPolicyRef: "policy_01Model",
      promptPolicyRef: "policy_01Prompt",
      providerRequestRef: "request_03Provider",
      inputTokens: 100,
      outputTokens: 50,
      acceptedOutputHash: sha("c"),
      result: "usable",
      planAllowanceConsumed: true,
      createdAt: now.toISOString(),
    } as const;
    const result = await completeRegeneration(
      {
        generation,
        newVersion: versionInput("version_02Regenerated"),
        createdAt: now,
      },
      harness.repository,
    );
    expect(result).toMatchObject({
      kind: "usable",
      version: { campaignVersionRef: "version_02Regenerated", versionNo: 1 },
    });
    expect(harness.versions).toHaveLength(1);

    await expect(
      completeRegeneration(
        {
          generation: { ...generation, campaignVersionRef: "version_99Wrong" },
          newVersion: versionInput("version_98Expected"),
          createdAt: now,
        },
        harness.repository,
      ),
    ).rejects.toThrow("must bind");

    const rejected = await completeRegeneration(
      {
        generation: {
          ...generation,
          generationRef: "generation_04Rejected",
          campaignVersionRef: "version_03Rejected",
          acceptedOutputHash: undefined,
          result: "rejected",
          planAllowanceConsumed: false,
        },
        newVersion: versionInput("version_03Rejected"),
        createdAt: now,
      },
      harness.repository,
    );
    expect(rejected.kind).toBe("rejected");
    expect(harness.versions).toHaveLength(1);
  });
});

describe("collateral and paid-ad brand boundary", () => {
  async function projectionFixture() {
    const version = await approvedVersion();
    const collateral = {
      schemaVersion: 1,
      projectionRef: "projection_01Collateral",
      locationRef,
      campaignRef,
      campaignVersionRef: version.campaignVersionRef,
      template: { id: "open-house-boost-collateral", version: "1.0.0" },
      content: {
        headline: "Tour 123 Main Street",
        propertyAddress: "123 Main Street",
        propertyDescription: "A fixture-backed property.",
        openHouseLabel: "Saturday, 1 PM to 3 PM",
        loanOfficerIdentity: {
          displayName: "Alex Morgan",
          logoAssetRef: "asset_01LenderLogo",
          contactInformation: { email: "alex@lender.example" },
        },
        realtorIdentity: {
          displayName: "Taylor Reed",
          logoAssetRef: "asset_01RealtorLogo",
          imageAssetRef: "asset_01RealtorPhoto",
          contactInformation: {
            phone: "+1 407 555 0100",
            email: "taylor@brokerage.example",
            websiteUrl: "https://brokerage.example/taylor",
          },
        },
        disclosureBlocks: ["Equal Housing Opportunity."],
        callToActionLabel: "View the open house",
        destinationPath: "/c/campaign-public-01",
      },
      approvalSummary: {
        approvalSummaryRef: "summary_01Collateral",
        scope: "collateral",
        previewRef: "preview_01Collateral",
        requiredApproverRoles: ["realtor_approver", "lender_approver"],
      },
    } as const;
    const paidAd = {
      schemaVersion: 1,
      projectionRef: "projection_01PaidAd",
      locationRef,
      campaignRef,
      campaignVersionRef: version.campaignVersionRef,
      template: { id: "open-house-boost-paid-ad", version: "2.0.0" },
      advertiserIdentity: {
        kind: "lender",
        displayName: "Acme Home Lending",
        logoAssetRef: "asset_01LenderLogo",
        contactInformation: { websiteUrl: "https://lender.example/open-house" },
      },
      copy: {
        primaryText: "Explore a home and connect with a licensed lender.",
        headline: "Tour 123 Main Street",
        description: "Open house details and financing guidance.",
      },
      creative: {
        headline: "Tour 123 Main Street",
        body: "Open Saturday from 1 PM to 3 PM.",
        callToActionLabel: "Learn more",
        propertyImageAssetRefs: ["asset_01Exterior"],
        identityAssetRefs: ["asset_01LenderLogo"],
        disclosureBlocks: ["Equal Housing Opportunity."],
      },
      leadForm: {
        headline: "Request open house details",
        description: "A licensed lender will follow up with property and financing information.",
        callToActionLabel: "Request details",
        privacyPolicyUrl: "https://lender.example/privacy",
      },
      approvalSummary: {
        approvalSummaryRef: "summary_01PaidAd",
        scope: "paid_ad",
        previewRef: "preview_01PaidAd",
        requiredApproverRoles: ["lender_approver"],
      },
    } as const;
    return {
      version,
      collateral,
      paidAd,
      projections: createCampaignProjections({ campaignVersion: version, collateral, paidAd }),
    };
  }

  const boundaryRules = {
    rulesetVersionRef: "ruleset_01PaidAdBrand",
    realtorIdentityValues: ["Taylor Reed"],
    brokerageMarks: ["Reed Realty"],
    coBrandPhrases: ["in partnership with"],
    prohibitedContactValues: ["brokerage.example"],
    realtorAssetRefs: ["asset_01RealtorLogo", "asset_01RealtorPhoto"],
    allowedPaidAdIdentityAssetRefs: ["asset_01LenderLogo"],
    allowedPropertyImageAssetRefs: ["asset_01Exterior"],
  } as const;

  it("creates separate immutable projections, hashes, templates, summaries, and previews", async () => {
    const { projections } = await projectionFixture();
    expect(projections.collateral.projectionHash).not.toBe(projections.paidAd.projectionHash);
    expect(projections.collateral.template).toEqual({
      id: "open-house-boost-collateral",
      version: "1.0.0",
    });
    expect(projections.paidAd.template).toEqual({
      id: "open-house-boost-paid-ad",
      version: "2.0.0",
    });
    expect(projections.collateral.approvalSummary).toMatchObject({
      scope: "collateral",
      previewRef: "preview_01Collateral",
      projectionHash: projections.collateral.projectionHash,
    });
    expect(projections.paidAd.approvalSummary).toMatchObject({
      scope: "paid_ad",
      previewRef: "preview_01PaidAd",
      projectionHash: projections.paidAd.projectionHash,
    });
    expect(Object.isFrozen(projections)).toBe(true);
    expect(Object.isFrozen(projections.collateral.content.realtorIdentity)).toBe(true);
    expect(Object.isFrozen(projections.paidAd.advertiserIdentity)).toBe(true);
    expect(projections.paidAd).not.toHaveProperty("content.realtorIdentity");
    expect(projections.paidAd).not.toHaveProperty("realtorDisplayName");
  });

  it("rejects projection pairs outside one version or sharing identity and preview references", async () => {
    const { collateral, paidAd, version } = await projectionFixture();
    expect(() =>
      createCampaignProjections({
        campaignVersion: version,
        collateral,
        paidAd: { ...paidAd, campaignVersionRef: "version_02Outside" },
      }),
    ).toThrow("outside its immutable campaign version");
    expect(() =>
      createCampaignProjections({
        campaignVersion: version,
        collateral,
        paidAd: { ...paidAd, projectionRef: collateral.projectionRef },
      }),
    ).toThrow("separate references");
    expect(() =>
      createCampaignProjections({
        campaignVersion: version,
        collateral,
        paidAd: {
          ...paidAd,
          approvalSummary: {
            ...paidAd.approvalSummary,
            previewRef: collateral.approvalSummary.previewRef,
          },
        },
      }),
    ).toThrow("separate approval previews");
  });

  it("runs deterministic paid-ad preflight and rejects every Realtor identity surface", async () => {
    const { collateral, paidAd, projections, version } = await projectionFixture();
    const passing = runPaidAdBrandPreflight(projections, boundaryRules);
    expect(passing.blocking).toBe(false);
    expect(runPaidAdBrandPreflight(structuredClone(projections), boundaryRules)).toEqual(passing);

    const cases = [
      ["copy", { ...projections.paidAd.copy, primaryText: "Meet Taylor Reed at the open house" }],
      ["copy", { ...projections.paidAd.copy, primaryText: "Meet Taylor-Reed at the open house" }],
      ["copy", { ...projections.paidAd.copy, headline: "Taylor Reed presents 123 Main" }],
      ["copy", { ...projections.paidAd.copy, description: "In partnership with a lender" }],
      ["creative", { ...projections.paidAd.creative, headline: "Taylor Reed open house" }],
      ["creative", { ...projections.paidAd.creative, body: "Presented by Reed Realty" }],
      ["creative", { ...projections.paidAd.creative, callToActionLabel: "Call Taylor Reed" }],
      ["leadForm", { ...projections.paidAd.leadForm, headline: "Contact Taylor Reed" }],
      ["leadForm", { ...projections.paidAd.leadForm, description: "Visit brokerage.example" }],
      ["leadForm", { ...projections.paidAd.leadForm, callToActionLabel: "Message Taylor Reed" }],
      [
        "leadForm",
        {
          ...projections.paidAd.leadForm,
          privacyPolicyUrl: "https://brokerage.example/privacy",
        },
      ],
      [
        "advertiserIdentity",
        {
          ...projections.paidAd.advertiserIdentity,
          contactInformation: { websiteUrl: "https://brokerage.example/paid-ad" },
        },
      ],
    ] as const;
    for (const [surface, value] of cases) {
      const changed = createCampaignProjections({
        campaignVersion: version,
        collateral,
        paidAd: { ...paidAd, [surface]: value },
      });
      const result = runPaidAdBrandPreflight(changed, boundaryRules);
      expect(result.blocking, surface).toBe(true);
    }
  });

  it("fails closed on tampering, Realtor assets, contact information, and dual-brand fields", async () => {
    const { collateral, paidAd, projections, version } = await projectionFixture();
    expect(() =>
      runPaidAdBrandPreflight(
        {
          ...projections,
          paidAd: { ...projections.paidAd, projectionHash: sha("f") },
        },
        boundaryRules,
      ),
    ).toThrow("projection hash");
    expect(() =>
      runPaidAdBrandPreflight(
        {
          ...projections,
          collateral: { ...projections.collateral, projectionHash: sha("e") },
        },
        boundaryRules,
      ),
    ).toThrow("Collateral projection hash");

    const otherCampaignVersionRef = "version_02OtherCampaign";
    const otherVersion = { ...version, campaignVersionRef: otherCampaignVersionRef };
    const otherProjections = createCampaignProjections({
      campaignVersion: otherVersion,
      collateral: { ...collateral, campaignVersionRef: otherCampaignVersionRef },
      paidAd: { ...paidAd, campaignVersionRef: otherCampaignVersionRef },
    });
    expect(() =>
      runPaidAdBrandPreflight(
        { collateral: projections.collateral, paidAd: otherProjections.paidAd },
        boundaryRules,
      ),
    ).toThrow("do not share one campaign version");

    for (const changedPaidAd of [
      {
        ...paidAd,
        advertiserIdentity: {
          ...paidAd.advertiserIdentity,
          logoAssetRef: "asset_01RealtorLogo",
        },
      },
      {
        ...paidAd,
        advertiserIdentity: {
          ...paidAd.advertiserIdentity,
          contactInformation: { email: "taylor@brokerage.example" },
        },
      },
      {
        ...paidAd,
        creative: {
          ...paidAd.creative,
          identityAssetRefs: ["asset_01LenderLogo", "asset_01RealtorPhoto"],
        },
      },
      {
        ...paidAd,
        creative: {
          ...paidAd.creative,
          identityAssetRefs: ["asset_01UnknownBrokerageLogo"],
        },
      },
      {
        ...paidAd,
        creative: {
          ...paidAd.creative,
          propertyImageAssetRefs: ["asset_01UnknownDualBrandComposite"],
        },
      },
    ]) {
      const regenerated = createCampaignProjections({
        campaignVersion: version,
        collateral,
        paidAd: changedPaidAd,
      });
      expect(runPaidAdBrandPreflight(regenerated, boundaryRules).blocking).toBe(true);
    }
    expect(() =>
      createCampaignProjections({
        campaignVersion: version,
        collateral,
        paidAd: { ...paidAd, realtorDisplayName: "Taylor Reed" },
      }),
    ).toThrow();
  });

  it("limits Realtor approval to collateral and binds decisions to one projection preview", async () => {
    const { projections } = await projectionFixture();
    const authority = { assertMayApprove: vi.fn(async () => undefined) };
    const realtorApproval = await createProjectionApprovalDecision(
      {
        approvalRef: "approval_03Collateral",
        projection: projections.collateral,
        actorRef: "user_01Realtor",
        actorKind: "human",
        actorRole: "realtor_approver",
        decidedAt: now,
        ipAuditHash: sha("a"),
        decision: "approved",
      },
      authority,
    );
    expect(realtorApproval).toMatchObject({
      scope: "collateral",
      projectionHash: projections.collateral.projectionHash,
      previewRef: projections.collateral.approvalSummary.previewRef,
    });
    await expect(
      createProjectionApprovalDecision(
        {
          approvalRef: "approval_04PaidAd",
          projection: projections.paidAd,
          actorRef: "user_01Realtor",
          actorKind: "human",
          actorRole: "realtor_approver",
          decidedAt: now,
          ipAuditHash: sha("b"),
          decision: "approved",
        },
        authority,
      ),
    ).rejects.toThrow("limited to co-branded collateral");
    expect(authority.assertMayApprove).toHaveBeenCalledOnce();
  });

  it("rejects paid-ad approval when copy changes under stale hash and preview evidence", async () => {
    const { projections } = await projectionFixture();
    const authority = { assertMayApprove: vi.fn(async () => undefined) };
    await expect(
      createProjectionApprovalDecision(
        {
          approvalRef: "approval_07TamperedPaidAd",
          projection: {
            ...projections.paidAd,
            copy: { ...projections.paidAd.copy, headline: "Tampered after preview" },
          },
          actorRef: "user_01Lender",
          actorKind: "human",
          actorRole: "lender_approver",
          decidedAt: now,
          ipAuditHash: sha("e"),
          decision: "approved",
        },
        authority,
      ),
    ).rejects.toThrow("current immutable content and preview binding");
    expect(authority.assertMayApprove).not.toHaveBeenCalled();
  });

  it("authorizes rendering only with exact non-blocking projection-bound evidence", async () => {
    const { projections } = await projectionFixture();
    const result = runPaidAdBrandPreflight(projections, boundaryRules);
    const evidence = {
      schemaVersion: 1,
      campaignVersionRef: result.campaignVersionRef,
      collateralProjectionHash: result.collateralProjectionHash,
      paidAdProjectionHash: result.paidAdProjectionHash,
      rulesetVersionRef: result.rulesetVersionRef,
      brandBoundaryRulesHash: result.brandBoundaryRulesHash,
      blocking: false,
      resultHash: result.resultHash,
    } as const;
    const expectedAttestation = {
      campaignVersionRef: evidence.campaignVersionRef,
      collateralProjectionHash: evidence.collateralProjectionHash,
      paidAdProjectionHash: evidence.paidAdProjectionHash,
      rulesetVersionRef: evidence.rulesetVersionRef,
      brandBoundaryRulesHash: evidence.brandBoundaryRulesHash,
      preflightResultHash: evidence.resultHash,
    };
    const authority = {
      assertAuthorized: vi.fn((actual: unknown) => {
        if (JSON.stringify(actual) !== JSON.stringify(expectedAttestation)) {
          throw new Error("Stored paid-ad brand attestation does not match");
        }
      }),
    };
    await expect(
      authorizePaidAdProjectionForRendering(projections.paidAd, evidence, authority),
    ).resolves.toEqual(projections.paidAd);
    for (const staleEvidence of [
      { ...evidence, resultHash: sha("f") },
      { ...evidence, collateralProjectionHash: sha("f") },
      { ...evidence, paidAdProjectionHash: sha("f") },
      { ...evidence, campaignVersionRef: "version_02Stale" },
      { ...evidence, rulesetVersionRef: "ruleset_02Stale" },
      { ...evidence, brandBoundaryRulesHash: sha("f") },
    ]) {
      await expect(
        authorizePaidAdProjectionForRendering(projections.paidAd, staleEvidence, authority),
      ).rejects.toThrow();
    }
    await expect(
      authorizePaidAdProjectionForRendering(
        { ...projections.paidAd, copy: { ...projections.paidAd.copy, headline: "Tampered" } },
        evidence,
        authority,
      ),
    ).rejects.toThrow("current non-blocking brand preflight evidence");
  });

  it("fails closed when an asynchronous stored brand authority rejects", async () => {
    const { projections } = await projectionFixture();
    const result = runPaidAdBrandPreflight(projections, boundaryRules);
    const evidence = {
      schemaVersion: 1,
      campaignVersionRef: result.campaignVersionRef,
      collateralProjectionHash: result.collateralProjectionHash,
      paidAdProjectionHash: result.paidAdProjectionHash,
      rulesetVersionRef: result.rulesetVersionRef,
      brandBoundaryRulesHash: result.brandBoundaryRulesHash,
      blocking: false,
      resultHash: result.resultHash,
    } as const;

    await expect(
      authorizePaidAdProjectionForRendering(projections.paidAd, evidence, {
        async assertAuthorized() {
          await Promise.resolve();
          throw new Error("Stored paid-ad brand attestation is not authorized");
        },
      }),
    ).rejects.toThrow("not authorized");
  });

  it("rejects non-human and out-of-summary projection approvals before authorization", async () => {
    const { projections } = await projectionFixture();
    const authority = { assertMayApprove: vi.fn(async () => undefined) };
    await expect(
      createProjectionApprovalDecision(
        {
          approvalRef: "approval_05Model",
          projection: projections.collateral,
          actorRef: "model_01Generator",
          actorKind: "model",
          actorRole: "realtor_approver",
          decidedAt: now,
          ipAuditHash: sha("c"),
          decision: "approved",
        },
        authority,
      ),
    ).rejects.toThrow("Only a human principal");
    await expect(
      createProjectionApprovalDecision(
        {
          approvalRef: "approval_06WrongRole",
          projection: projections.collateral,
          actorRef: "user_01Approver",
          actorKind: "human",
          actorRole: "approver",
          decidedAt: now,
          ipAuditHash: sha("d"),
          decision: "approved",
        },
        authority,
      ),
    ).rejects.toThrow("outside the projection approval summary");
    expect(authority.assertMayApprove).not.toHaveBeenCalled();
  });
});
