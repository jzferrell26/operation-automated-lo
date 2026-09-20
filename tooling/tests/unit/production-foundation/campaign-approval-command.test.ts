import { describe, expect, it } from "vitest";

import {
  CampaignApprovalNotReadyError,
  CampaignApprovalStaleError,
  CampaignPrincipalInvalidError,
  CampaignResourceNotAccessibleError,
  createCampaignVersion,
  executeHumanCampaignApproval,
  freezeAuthenticatedPrincipal,
  runCampaignPreflight,
  type AuthenticatedPrincipal,
  type CampaignApprovalCommitInput,
  type CampaignApprovalCommitResult,
  type CampaignApprovalEvidence,
  type CampaignApprovalRepository,
  type HumanCampaignApprovalInput,
} from "@oalo/application";
import {
  CampaignManifestSchema,
  type ApprovalDecision,
  type CampaignInputVersions,
  type CampaignManifest,
  type PreflightRules,
} from "@oalo/contracts";

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

class MemoryApprovalRepository implements CampaignApprovalRepository {
  evidence: CampaignApprovalEvidence | undefined;
  commits: CampaignApprovalCommitInput[] = [];
  denials: Array<{
    campaignRef: string;
    correlationId: string;
    inputHash: string;
    beforeHash: string;
  }> = [];
  commitResult: Partial<CampaignApprovalCommitResult> = {};

  async run<T>(
    work: (transaction: {
      loadCurrentEvidence: (campaignRef: string) => Promise<CampaignApprovalEvidence | undefined>;
      commitApproval: (input: CampaignApprovalCommitInput) => Promise<CampaignApprovalCommitResult>;
      recordDeniedAttempt: (input: {
        campaignRef: string;
        correlationId: string;
        inputHash: string;
        beforeHash: string;
      }) => Promise<void>;
    }) => Promise<T>,
  ): Promise<T> {
    const evidence = this.evidence;
    return work({
      loadCurrentEvidence: async () => evidence,
      commitApproval: async (input) => {
        this.commits.push(input);
        return {
          decision: input.decision,
          state: input.toState,
          rowVersion: input.expectedRowVersion + 1,
          duplicate: false,
          ...this.commitResult,
        };
      },
      recordDeniedAttempt: async (input) => {
        this.denials.push(input);
      },
    });
  }
}

async function passingEvidence(
  overrides: Partial<CampaignApprovalEvidence> = {},
): Promise<CampaignApprovalEvidence> {
  const version = await createCampaignVersion(
    {
      version: {
        schemaVersion: 1,
        locationRef: approver.locationRef,
        campaignRef: "campaign_01OpenHouse",
        campaignVersionRef: "version_01Campaign",
        inputVersions,
        manifest,
        createdBy: "user_01Creator",
      },
      createdAt: now,
    },
    {
      async run(work) {
        return work({
          async getByCampaignVersionRef() {
            return undefined;
          },
          async getLatestVersionNo() {
            return 0;
          },
          async append() {
            return undefined;
          },
        });
      },
    },
  );
  const preflight = runCampaignPreflight(version, rules);
  return {
    version,
    preflight,
    state: "awaiting_approval",
    rowVersion: 2,
    ...overrides,
  };
}

function command(overrides: Partial<HumanCampaignApprovalInput> = {}): HumanCampaignApprovalInput {
  return {
    campaignRef: "campaign_01OpenHouse",
    decision: "approved",
    decidedAt: now,
    ipAuditHash: sha("a"),
    correlationRef: "correlation_approve_001",
    ...overrides,
  };
}

describe("human campaign approval command", () => {
  it("records an approved decision from a verified approver and transitions the aggregate", async () => {
    const repository = new MemoryApprovalRepository();
    repository.evidence = await passingEvidence();
    const result = await executeHumanCampaignApproval(
      command({
        expectedCampaignVersionRef: repository.evidence.version.campaignVersionRef,
        expectedManifestHash: repository.evidence.version.manifestHash,
        expectedPreflightResultHash: repository.evidence.preflight.resultHash,
        expectedRowVersion: repository.evidence.rowVersion,
      }),
      approver,
      repository,
    );
    expect(result.kind).toBe("committed");
    if (result.kind !== "committed") return;
    expect(result.decision.actorKind).toBe("human");
    expect(result.decision.actorRole).toBe("approver");
    expect(result.decision.actorRef).toBe(approver.actorRef);
    expect(result.decision.decision).toBe("approved");
    expect(result.state).toBe("approved");
    expect(result.duplicate).toBe(false);
    expect(repository.commits[0]?.event?.toState).toBe("approved");
    expect(repository.denials).toHaveLength(0);
  });

  it("lets a location admin approve and keeps a rejection in awaiting_approval", async () => {
    const admin = principal({ role: "location_admin", actorRef: "principal_adminUser001" });
    const approvedRepo = new MemoryApprovalRepository();
    approvedRepo.evidence = await passingEvidence();
    const approved = await executeHumanCampaignApproval(command(), admin, approvedRepo);
    expect(approved.kind).toBe("committed");
    if (approved.kind === "committed") {
      expect(approved.decision.actorRole).toBe("location_admin");
    }

    const rejectedRepo = new MemoryApprovalRepository();
    rejectedRepo.evidence = await passingEvidence();
    const rejected = await executeHumanCampaignApproval(
      command({ decision: "rejected" }),
      approver,
      rejectedRepo,
    );
    expect(rejected.kind).toBe("committed");
    if (rejected.kind === "committed") {
      expect(rejected.decision.decision).toBe("rejected");
      expect(rejected.state).toBe("awaiting_approval");
    }
    expect(rejectedRepo.commits[0]?.event).toBeUndefined();
  });

  it("returns a duplicate without rewriting when the same actor already recorded that decision", async () => {
    const evidence = await passingEvidence();
    const existing = {
      schemaVersion: 1 as const,
      approvalRef: "approval_existingDecision01",
      locationRef: evidence.version.locationRef,
      campaignRef: evidence.version.campaignRef,
      campaignVersionRef: evidence.version.campaignVersionRef,
      manifestHash: evidence.version.manifestHash,
      preflightResultHash: evidence.preflight.resultHash,
      actorRef: approver.actorRef,
      actorKind: "human" as const,
      actorRole: "approver" as const,
      decidedAt: now.toISOString(),
      ipAuditHash: sha("a"),
      decision: "approved" as const,
      snapshot: {
        pageVersionRef: evidence.version.manifest.artifacts.pageVersionRef,
        pdfVersionRef: evidence.version.manifest.artifacts.pdfVersionRef,
        creativeVersionRef: evidence.version.manifest.artifacts.creativeVersionRef,
        copyVersionRef: evidence.version.manifest.artifacts.copyVersionRef,
        emailPackageVersionRef: evidence.version.manifest.artifacts.emailPackageVersionRef,
        smsPackageVersionRef: evidence.version.manifest.artifacts.smsPackageVersionRef,
        disclosureVersionRef: evidence.version.manifest.artifacts.disclosureVersionRef,
        targetingHash: sha("t"),
        budgetHash: sha("b"),
        datesHash: sha("d"),
        formVersionRef: evidence.version.manifest.artifacts.formVersionRef,
        destinationVersionRef: evidence.version.manifest.artifacts.destinationVersionRef,
      },
    } satisfies ApprovalDecision;
    const repository = new MemoryApprovalRepository();
    repository.evidence = { ...evidence, state: "approved", existingApproval: existing };
    const result = await executeHumanCampaignApproval(
      command({
        expectedCampaignVersionRef: evidence.version.campaignVersionRef,
        expectedManifestHash: evidence.version.manifestHash,
        expectedPreflightResultHash: evidence.preflight.resultHash,
        expectedRowVersion: 1,
      }),
      approver,
      repository,
    );
    expect(result).toEqual({
      kind: "committed",
      decision: existing,
      state: "approved",
      rowVersion: 2,
      duplicate: true,
    });
    expect(repository.commits).toHaveLength(0);
  });

  it("propagates repository duplicate commits for retrying the same command key", async () => {
    const repository = new MemoryApprovalRepository();
    repository.evidence = await passingEvidence();
    repository.commitResult = { duplicate: true, rowVersion: 2 };
    const result = await executeHumanCampaignApproval(command(), approver, repository);
    expect(result.kind).toBe("committed");
    if (result.kind === "committed") {
      expect(result.duplicate).toBe(true);
      expect(result.rowVersion).toBe(2);
    }
  });

  it("hides missing and cross-tenant campaigns behind the same not-accessible error", async () => {
    const missing = new MemoryApprovalRepository();
    await expect(executeHumanCampaignApproval(command(), approver, missing)).rejects.toBeInstanceOf(
      CampaignResourceNotAccessibleError,
    );
    const cross = new MemoryApprovalRepository();
    cross.evidence = await passingEvidence();
    await expect(
      executeHumanCampaignApproval(
        command(),
        principal({ locationRef: "location_otherTenant001" }),
        cross,
      ),
    ).rejects.toBeInstanceOf(CampaignResourceNotAccessibleError);
  });

  it("rejects stale browser hints and already-approved conflicting decisions", async () => {
    const evidence = await passingEvidence();
    const stale = new MemoryApprovalRepository();
    stale.evidence = evidence;
    await expect(
      executeHumanCampaignApproval(
        command({ expectedCampaignVersionRef: "version_02Stale" }),
        approver,
        stale,
      ),
    ).rejects.toBeInstanceOf(CampaignApprovalStaleError);
    await expect(
      executeHumanCampaignApproval(command({ expectedManifestHash: sha("f") }), approver, stale),
    ).rejects.toBeInstanceOf(CampaignApprovalStaleError);
    await expect(
      executeHumanCampaignApproval(
        command({ expectedPreflightResultHash: sha("f") }),
        approver,
        stale,
      ),
    ).rejects.toBeInstanceOf(CampaignApprovalStaleError);
    await expect(
      executeHumanCampaignApproval(command({ expectedRowVersion: 99 }), approver, stale),
    ).rejects.toBeInstanceOf(CampaignApprovalStaleError);

    const approved = new MemoryApprovalRepository();
    approved.evidence = { ...evidence, state: "approved" };
    await expect(
      executeHumanCampaignApproval(command(), approver, approved),
    ).rejects.toBeInstanceOf(CampaignApprovalStaleError);
  });

  it("rejects blocking, missing, or draft evidence instead of recording an approval", async () => {
    const blocking = new MemoryApprovalRepository();
    const evidence = await passingEvidence();
    blocking.evidence = {
      ...evidence,
      preflight: { ...evidence.preflight, blocking: true },
    };
    await expect(
      executeHumanCampaignApproval(command(), approver, blocking),
    ).rejects.toBeInstanceOf(CampaignApprovalNotReadyError);

    const draft = new MemoryApprovalRepository();
    draft.evidence = { ...evidence, state: "draft" };
    await expect(executeHumanCampaignApproval(command(), approver, draft)).rejects.toBeInstanceOf(
      CampaignApprovalNotReadyError,
    );

    const tampered = new MemoryApprovalRepository();
    tampered.evidence = {
      ...evidence,
      version: { ...evidence.version, manifestHash: sha("f") },
    };
    await expect(executeHumanCampaignApproval(command(), approver, tampered)).rejects.toThrow(
      "manifest hash",
    );
  });

  it("writes denied audit for unauthorized humans and never commits an approval row", async () => {
    const evidence = await passingEvidence();
    for (const role of [
      "campaign_creator",
      "viewer",
      "campaign_publisher",
      "platform_support",
    ] as const) {
      const repository = new MemoryApprovalRepository();
      repository.evidence = evidence;
      const result = await executeHumanCampaignApproval(
        command(),
        principal({ role, actorRef: `principal_${role}001` }),
        repository,
      );
      expect(result).toEqual({ kind: "denied" });
      expect(repository.commits).toHaveLength(0);
      expect(repository.denials).toHaveLength(1);
    }
  });

  it("rejects invalid principals before opening a repository transaction", async () => {
    const repository = new MemoryApprovalRepository();
    expect(() => freezeAuthenticatedPrincipal({ ...approver, actorRef: "short" })).toThrow(
      CampaignPrincipalInvalidError,
    );
    await expect(
      executeHumanCampaignApproval(command(), { ...approver, actorRef: "short" }, repository),
    ).rejects.toBeInstanceOf(CampaignPrincipalInvalidError);
    expect(repository.denials).toHaveLength(0);
  });
});
