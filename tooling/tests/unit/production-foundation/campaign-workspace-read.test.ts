import { describe, expect, it } from "vitest";

import {
  CampaignResourceNotAccessibleError,
  campaignMayBeApprovedBy,
  campaignVersionHref,
  deriveCampaignNextActions,
  deriveCampaignStanding,
  deriveOlderVersionStanding,
  freezeAuthenticatedPrincipal,
  principalHasCampaignApprovalRole,
  projectCampaignVersions,
  projectCampaignWorkspace,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceReadRecord,
  type CampaignWorkspaceVersionRecord,
} from "@oalo/application";
import {
  OpenHouseCampaignManifestSchema,
  type ApprovalDecision,
  type CampaignInputVersions,
  type OpenHouseCampaignManifest,
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

const manifest: OpenHouseCampaignManifest = OpenHouseCampaignManifestSchema.parse({
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
    // PRD-009e D4 and 009E-AC-008. A campaign saved before PRD-009 says which flow made it, and
    // none of its property, open house time, or Realtor fields is projected at all.
    expect(projected.blueprint).toBe("open-house-boost");
    for (const key of [
      "propertyAddress",
      "openHouseStartsAt",
      "openHouseEndsAt",
      "realtorDisplayName",
    ]) {
      expect(projected, key).not.toHaveProperty(key);
    }
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
   * Finding S1b of the 2026-10-01 writing review. A send-back leaves the campaign in
   * `awaiting_approval` (the approval command sets that state again for a rejected decision), so the
   * state alone cannot tell a version nobody has looked at from one that was just sent back. The
   * recorded decision can, and the next steps read it: a decided version is never offered for
   * approval and never waited on, whoever is looking at it.
   */
  it("does not offer a sent-back version for approval or wait for an approver on it", () => {
    for (const canApprove of [true, false]) {
      expect(
        deriveCampaignNextActions("awaiting_approval", canApprove, "rejected"),
        String(canApprove),
      ).toEqual([
        { id: "review_evidence", available: true },
        { id: "already_decided", available: false },
        { id: "provider_publish", available: false },
      ]);
    }
    // With no decision the steps are the ones they always were.
    expect(
      deriveCampaignNextActions("awaiting_approval", true, undefined).map((action) => action.id),
    ).toEqual(["review_evidence", "approve_version", "provider_publish"]);
    expect(deriveCampaignNextActions("awaiting_approval", true)).toEqual(
      deriveCampaignNextActions("awaiting_approval", true, undefined),
    );
  });

  it("reads the recorded decision when it projects a version that was sent back", () => {
    const passing = { ...preflight, blocking: false, findings: [], resultHash: sha("8") };
    const sentBack = projectCampaignWorkspace(
      record({
        state: "awaiting_approval",
        preflight: passing,
        approval: { ...approval, decision: "rejected" },
      }),
      approver,
      "postgres",
    );

    expect(sentBack.state).toBe("awaiting_approval");
    expect(sentBack.approval?.decision).toBe("rejected");
    expect(sentBack.nextActions.map((action) => action.id)).toEqual([
      "review_evidence",
      "already_decided",
      "provider_publish",
    ]);
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
        for (const decision of [undefined, "approved", "rejected"] as const) {
          for (const action of deriveCampaignNextActions(state, canApprove, decision)) {
            expect(
              Object.keys(action).toSorted(),
              `${state}/${String(canApprove)}/${String(decision)}`,
            ).toEqual(["available", "id"]);
            // A key is one token. A sentence has a space in it, and that is the whole difference.
            expect(action.id).not.toMatch(/\s/u);
          }
        }
      }
    }
  });
});

/**
 * PRD-009e D2 and 009E-AC-004. The name the decider's own session recorded travels with the
 * approval projection, and a decision recorded without one (every decision made before PRD-009)
 * carries no name key at all, so a screen can only say the role.
 */
describe("the decider's own name on the approval projection", () => {
  const passing = { ...preflight, blocking: false, findings: [], resultHash: sha("7") };

  it("carries the recorded name beside the role", () => {
    const projected = projectCampaignWorkspace(
      record({
        state: "approved",
        preflight: passing,
        approval: {
          ...approval,
          snapshot: { ...approval.snapshot, approverDisplayName: "Casey Rivera" },
        },
      }),
      approver,
      "postgres",
    );

    expect(projected.approval).toEqual({
      decision: "approved",
      decidedAt: approval.decidedAt,
      actorRole: "approver",
      approverDisplayName: "Casey Rivera",
    });
  });

  it("carries no name key for a decision recorded without one", () => {
    const projected = projectCampaignWorkspace(
      record({ state: "approved", preflight: passing, approval }),
      approver,
      "postgres",
    );

    expect(projected.approval).not.toHaveProperty("approverDisplayName");
  });
});

/**
 * PRD-009e 009E-AC-010. Where a campaign stands is the recorded decision first (a send-back keeps
 * the stored state), then the library's verdict on its ad, then the stored state itself.
 */
describe("a campaign's standing", () => {
  it("is ad retired only for a version nobody has decided on", () => {
    for (const state of ["draft", "generated", "preflight_failed", "awaiting_approval"] as const) {
      expect(deriveCampaignStanding({ state, decision: undefined, adRetired: true }), state).toBe(
        "ad_retired",
      );
      expect(deriveCampaignStanding({ state, decision: undefined, adRetired: false }), state).toBe(
        state,
      );
    }
  });

  it("lets a recorded decision win over retirement", () => {
    expect(
      deriveCampaignStanding({ state: "awaiting_approval", decision: "rejected", adRetired: true }),
    ).toBe("awaiting_approval");
    expect(
      deriveCampaignStanding({ state: "approved", decision: "approved", adRetired: true }),
    ).toBe("approved");
  });

  it("keeps a state a version nobody could still approve is not in", () => {
    for (const state of ["publishing", "live", "paused", "completed", "archived"] as const) {
      expect(deriveCampaignStanding({ state, decision: undefined, adRetired: true }), state).toBe(
        state,
      );
    }
  });

  it("reads an older version from its decision and its last check", () => {
    const failed = { ...preflight, blocking: true };
    const passed = { ...preflight, blocking: false, findings: [], resultHash: sha("6") };

    expect(deriveOlderVersionStanding({ approval })).toBe("approved");
    expect(deriveOlderVersionStanding({ approval: { ...approval, decision: "rejected" } })).toBe(
      "awaiting_approval",
    );
    expect(deriveOlderVersionStanding({})).toBe("generated");
    expect(deriveOlderVersionStanding({ preflight: failed })).toBe("preflight_failed");
    expect(deriveOlderVersionStanding({ preflight: passed })).toBe("replaced");
  });
});

/** PRD-009e D2, D3 and 009E-AC-005. Every version of a campaign, newest first. */
describe("a campaign's versions", () => {
  const passed = { ...preflight, blocking: false, findings: [], resultHash: sha("5") };
  const failed = { ...preflight, blocking: true };

  function versionRecord(
    versionNo: number,
    extra: Partial<CampaignWorkspaceVersionRecord> = {},
    createdBy = "user_01Creator",
  ): CampaignWorkspaceVersionRecord {
    return {
      version: {
        ...version,
        versionNo,
        campaignVersionRef: `version_01Campaign${String(versionNo)}`,
        createdBy,
        createdAt: `2026-07-2${String(versionNo)}T16:00:00.000Z`,
      },
      ...extra,
    };
  }

  it("lists them newest first, the newest by the campaign's state and the rest by their own", () => {
    const summaries = projectCampaignVersions(
      [
        versionRecord(1, { preflight: passed, approval: { ...approval, decision: "rejected" } }),
        versionRecord(3, { preflight: passed }, approver.actorRef),
        versionRecord(2, { preflight: passed }),
      ],
      approver,
      { state: "awaiting_approval", adRetired: false },
    );

    expect(summaries.map((entry) => entry.versionNo)).toEqual([3, 2, 1]);
    expect(summaries.map((entry) => entry.isLatest)).toEqual([true, false, false]);
    expect(summaries.map((entry) => entry.standing)).toEqual([
      "awaiting_approval",
      "replaced",
      "awaiting_approval",
    ]);
    expect(summaries.map((entry) => entry.decision?.decision)).toEqual([
      undefined,
      undefined,
      "rejected",
    ]);
    expect(summaries.map((entry) => entry.savedByViewer)).toEqual([true, false, false]);
    expect(summaries.map((entry) => entry.href)).toEqual([
      "/marketing/campaigns/campaign_01OpenHouse",
      campaignVersionHref("campaign_01OpenHouse", 2),
      "/marketing/campaigns/campaign_01OpenHouse/versions/1",
    ]);
    expect(summaries.map((entry) => entry.savedAt)).toEqual([
      "2026-07-23T16:00:00.000Z",
      "2026-07-22T16:00:00.000Z",
      "2026-07-21T16:00:00.000Z",
    ]);
  });

  it("applies the library's retirement to the newest version only", () => {
    const summaries = projectCampaignVersions(
      [versionRecord(2, { preflight: passed }), versionRecord(1, { preflight: failed })],
      approver,
      { state: "awaiting_approval", adRetired: true },
    );

    expect(summaries.map((entry) => entry.standing)).toEqual(["ad_retired", "preflight_failed"]);
  });

  it("carries the name a decision recorded, and only that", () => {
    const [summary] = projectCampaignVersions(
      [
        versionRecord(1, {
          preflight: passed,
          approval: {
            ...approval,
            snapshot: { ...approval.snapshot, approverDisplayName: "Casey Rivera" },
          },
        }),
      ],
      approver,
      { state: "approved", adRetired: false },
    );

    expect(summary?.decision).toEqual({
      decision: "approved",
      decidedAt: approval.decidedAt,
      actorRole: "approver",
      approverDisplayName: "Casey Rivera",
    });
    expect(JSON.stringify(summary)).not.toContain(approval.ipAuditHash);
  });

  it("refuses a version in another location, as an unknown campaign is refused", () => {
    expect(() =>
      projectCampaignVersions(
        [versionRecord(1, { preflight: passed })],
        principal({ locationRef: "location_otherTenant001" }),
        { state: "awaiting_approval", adRetired: false },
      ),
    ).toThrow(CampaignResourceNotAccessibleError);
  });

  it("answers an empty list for a campaign with no versions", () => {
    expect(projectCampaignVersions([], approver, { state: "draft", adRetired: false })).toEqual([]);
  });
});
