import { describe, expect, it } from "vitest";

import {
  CampaignResourceNotAccessibleError,
  campaignMayBeApprovedBy,
  deriveCampaignNextActions,
  freezeAuthenticatedPrincipal,
  principalHasCampaignApprovalRole,
  projectCampaignWorkspace,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceReadRecord,
} from "@oalo/application";
import {
  CampaignManifestSchema,
  type ApprovalDecision,
  type CampaignInputVersions,
  type CampaignManifest,
  type CampaignState,
  type CampaignVersion,
  type PreflightResult,
} from "@oalo/contracts";

const now = "2026-07-21T16:00:00.000Z";
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

const version: CampaignVersion = {
  schemaVersion: 1,
  locationRef: "location_01TenantA",
  campaignRef: "campaign_01OpenHouse",
  campaignVersionRef: "version_01Campaign",
  versionNo: 1,
  inputVersions,
  manifest,
  manifestHash: sha("a"),
  createdBy: "user_01Creator",
  createdAt: now,
};

const preflight: PreflightResult = {
  schemaVersion: 1,
  campaignRef: version.campaignRef,
  campaignVersionRef: version.campaignVersionRef,
  manifestHash: version.manifestHash,
  inputVersions,
  rulesetVersionRef: inputVersions.rulesetVersionRef,
  findings: [
    {
      severity: "blocking",
      ruleCode: "PARTNER_PERMISSION",
      description: "Partner permission is required.",
      affected: "partner.permissionConfirmed",
      remediation: "Confirm partner permission before preflight.",
    },
  ],
  blocking: true,
  resultHash: sha("c"),
  evaluatedAt: now,
};

const approval: ApprovalDecision = {
  schemaVersion: 1,
  approvalRef: "approval_01Decision",
  locationRef: version.locationRef,
  campaignRef: version.campaignRef,
  campaignVersionRef: version.campaignVersionRef,
  manifestHash: version.manifestHash,
  preflightResultHash: sha("d"),
  actorRef: "principal_approver001",
  actorKind: "human",
  actorRole: "approver",
  decidedAt: "2026-07-21T16:05:00.000Z",
  ipAuditHash: sha("e"),
  decision: "approved",
  snapshot: {
    pageVersionRef: "page_01Approved",
    pdfVersionRef: "pdf_01Approved",
    creativeVersionRef: "creative_01Approved",
    copyVersionRef: "copy_01Approved",
    emailPackageVersionRef: "email_01Approved",
    smsPackageVersionRef: "sms_01Approved",
    disclosureVersionRef: "disclosure_01Approved",
    targetingHash: sha("1"),
    budgetHash: sha("2"),
    datesHash: sha("3"),
    formVersionRef: "form_01Approved",
    destinationVersionRef: "destination_01Approved",
  },
};

const approver: AuthenticatedPrincipal = freezeAuthenticatedPrincipal({
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

function principal(overrides: Partial<AuthenticatedPrincipal> = {}): AuthenticatedPrincipal {
  return freezeAuthenticatedPrincipal({ ...approver, ...overrides });
}

function record(overrides: Partial<CampaignWorkspaceReadRecord> = {}): CampaignWorkspaceReadRecord {
  return {
    version,
    preflight,
    state: "preflight_failed",
    rowVersion: 2,
    updatedAt: now,
    ...overrides,
  };
}

describe("campaign workspace read projection", () => {
  it("projects safe UI fields and omits audit-sensitive approval metadata", () => {
    const passing = {
      ...preflight,
      blocking: false,
      findings: [],
      resultHash: sha("f"),
    };
    const projected = projectCampaignWorkspace(
      record({
        state: "approved",
        preflight: passing,
        approval,
      }),
      approver,
      "postgres",
    );

    expect(projected.headline).toBe("Tour 123 Main Street");
    expect(projected.propertyAddress).toBe("123 Main Street");
    expect(projected.realtorDisplayName).toBe("Taylor Reed");
    expect(projected.targetingRegions).toEqual(["Texas"]);
    expect(projected.persistenceKind).toBe("postgres");
    expect(projected.providerPublicationAuthorized).toBe(false);
    expect(projected.detailHref).toBe("/marketing/campaigns/campaign_01OpenHouse");
    expect(projected.approval).toEqual({
      decision: "approved",
      decidedAt: approval.decidedAt,
      actorRole: "approver",
    });
    expect(projected).not.toHaveProperty("ipAuditHash");
    expect(JSON.stringify(projected)).not.toContain(approval.ipAuditHash);
    expect(JSON.stringify(projected)).not.toContain("page_01Approved");
    expect(projected.canApprove).toBe(false);
    expect(projected.nextActions.map((action) => action.id)).toEqual([
      "review_evidence",
      "already_decided",
      "provider_publish",
    ]);
    expect(
      projected.nextActions.every(
        (action) => action.id !== "provider_publish" || !action.available,
      ),
    ).toBe(true);
  });

  it("keeps blocking findings without internal affected paths and refuses cross-tenant reads", () => {
    const projected = projectCampaignWorkspace(record(), approver, "filesystem");
    expect(projected.preflight.findings).toEqual([
      {
        ruleCode: "PARTNER_PERMISSION",
        severity: "blocking",
        description: "Partner permission is required.",
        remediation: "Confirm partner permission before preflight.",
      },
    ]);
    expect(JSON.stringify(projected.preflight)).not.toContain("partner.permissionConfirmed");
    expect(projected.nextActions.some((action) => action.id === "remediate_preflight")).toBe(true);
    expect(() =>
      projectCampaignWorkspace(
        record(),
        principal({ locationRef: "location_otherTenant001" }),
        "postgres",
      ),
    ).toThrow(CampaignResourceNotAccessibleError);
  });

  it("exposes approval only to an authorized human on current passing evidence", () => {
    const passing = { ...preflight, blocking: false, findings: [], resultHash: sha("9") };
    const awaiting = record({ state: "awaiting_approval", preflight: passing });
    expect(campaignMayBeApprovedBy(approver, awaiting)).toBe(true);
    expect(principalHasCampaignApprovalRole(approver)).toBe(true);
    expect(campaignMayBeApprovedBy(principal({ role: "campaign_creator" }), awaiting)).toBe(false);
    expect(campaignMayBeApprovedBy(approver, record())).toBe(false);
    const forApprover = projectCampaignWorkspace(awaiting, approver, "postgres");
    expect(forApprover.canApprove).toBe(true);
    expect(forApprover.nextActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "approve_version", available: true })]),
    );
    const forCreator = projectCampaignWorkspace(
      awaiting,
      principal({ role: "campaign_creator" }),
      "filesystem",
    );
    expect(forCreator.canApprove).toBe(false);
    expect(forCreator.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "wait_for_approver", available: false }),
      ]),
    );
    expect(forCreator.approval).toBeUndefined();
  });

  it("derives next actions for every campaign state without enabling publication", () => {
    const states: CampaignState[] = [
      "draft",
      "generated",
      "preflight_failed",
      "awaiting_approval",
      "approved",
      "publishing",
      "live",
      "paused",
      "completed",
      "archived",
    ];
    for (const state of states) {
      const actions = deriveCampaignNextActions(state, state === "awaiting_approval");
      expect(actions.some((action) => action.id === "provider_publish" && action.available)).toBe(
        false,
      );
      expect(actions[0]?.id).toBe("review_evidence");
    }
    expect(
      deriveCampaignNextActions("awaiting_approval", false).map((action) => action.id),
    ).toEqual(["review_evidence", "wait_for_approver", "provider_publish"]);
  });

  /**
   * PRD-006b D1 and D5. The application layer names steps; it does not write sentences.
   *
   * Every step used to travel with its own English, written in this package, where the
   * user-language guard does not read and the writing review never reached: "Review persisted
   * version evidence." and "Approve this exact persisted version." both went to a loan officer's
   * screen with a D2 word in them. The words now live in `apps/web/src/copy/user-language.ts`,
   * keyed by these identifiers, and this is what keeps them from coming back.
   */
  it("returns keys and no English at all", () => {
    const states: CampaignState[] = [
      "draft",
      "generated",
      "preflight_failed",
      "awaiting_approval",
      "approved",
      "publishing",
      "live",
      "paused",
      "completed",
      "archived",
    ];
    for (const state of states) {
      for (const canApprove of [true, false]) {
        for (const action of deriveCampaignNextActions(state, canApprove)) {
          expect(Object.keys(action).toSorted(), `${state}/${String(canApprove)}`).toEqual([
            "available",
            "id",
          ]);
          // A key is one token. A sentence has a space in it, and that is the whole difference.
          expect(action.id).not.toMatch(/\s/u);
        }
      }
    }
  });
});
