import { describe, expect, it, vi } from "vitest";

import {
  CampaignLibraryAdRefusedError,
  executeHumanCampaignApproval,
  freezeAuthenticatedPrincipal,
  runCampaignPreflight,
  type AuthenticatedPrincipal,
  type CampaignApprovalCommitInput,
  type CampaignApprovalEvidence,
  type CampaignApprovalRepository,
  type HumanCampaignApprovalInput,
  type LibraryAdCatalogPort,
  type LibraryAdCatalogStanding,
} from "@oalo/application";

import {
  SQUARE_DIGEST,
  TALL_DIGEST,
  libraryAdRulesFor,
  libraryAdVersion,
} from "./library-ad-fixtures.js";

/**
 * PRD-009c D4, 009C-AC-008 (the approval-command half). The command resolves a library-ad
 * version's ad through a required catalog port, after its role check, and refuses unless the entry
 * is found, active, the highest version, and its art digests equal the version's. Every caller
 * therefore gets the same refusal, each with a plain message.
 */

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

const ACTIVE: LibraryAdCatalogStanding = {
  status: "active",
  highestVersion: 1,
  highestStatus: "active",
  tallSha256: TALL_DIGEST,
  squareSha256: SQUARE_DIGEST,
};

function catalogWith(standing: LibraryAdCatalogStanding | undefined) {
  const standingOf = vi.fn(async () => standing);
  const port: LibraryAdCatalogPort = { standingOf };
  return { port, standingOf };
}

class MemoryRepository implements CampaignApprovalRepository {
  commits: CampaignApprovalCommitInput[] = [];
  denials = 0;

  constructor(private readonly evidence: CampaignApprovalEvidence) {}

  async run<T>(work: Parameters<CampaignApprovalRepository["run"]>[0]): Promise<T> {
    return (await work({
      loadCurrentEvidence: async () => this.evidence,
      commitApproval: async (input) => {
        this.commits.push(input);
        return {
          decision: input.decision,
          state: input.toState,
          rowVersion: input.expectedRowVersion + 1,
          duplicate: false,
        };
      },
      recordDeniedAttempt: async () => {
        this.denials += 1;
      },
    })) as T;
  }
}

async function repository(): Promise<MemoryRepository> {
  const version = await libraryAdVersion();
  return new MemoryRepository({
    version,
    preflight: runCampaignPreflight(version, libraryAdRulesFor()),
    state: "awaiting_approval",
    rowVersion: 1,
  });
}

function command(overrides: Partial<HumanCampaignApprovalInput> = {}): HumanCampaignApprovalInput {
  return {
    campaignRef: "campaign_01LibraryAd",
    decision: "approved",
    decidedAt: new Date("2026-10-01T17:00:00.000Z"),
    ipAuditHash: "a".repeat(64),
    correlationRef: "correlation_approve_001",
    ...overrides,
  };
}

describe("the approval command's catalog port (009C-AC-008)", () => {
  it("requires the port by its signature and at run time", async () => {
    const repo = await repository();
    // @ts-expect-error The catalog port is a required parameter; a call without it does not type-check.
    await expect(executeHumanCampaignApproval(command(), approver, repo)).rejects.toThrow(
      TypeError,
    );
    for (const notAPort of [{}, null, { standingOf: "yes" }]) {
      await expect(
        executeHumanCampaignApproval(command(), approver, repo, notAPort as LibraryAdCatalogPort),
      ).rejects.toThrow("catalog port");
    }
    expect(repo.commits).toHaveLength(0);
  });

  it("approves a version whose ad is active, the highest version, with matching art", async () => {
    const repo = await repository();
    const { port, standingOf } = catalogWith(ACTIVE);
    const result = await executeHumanCampaignApproval(command(), approver, repo, port);
    expect(result.kind).toBe("committed");
    expect(standingOf).toHaveBeenCalledWith({ id: "sample-first-home", version: 1 });
    expect(repo.commits).toHaveLength(1);
  });

  it.each([
    ["missing from the catalog", undefined, "missing", "isn't in the library"],
    [
      "retired",
      { ...ACTIVE, status: "retired", highestStatus: "retired" },
      "retired",
      "taken out of the library",
    ],
    [
      "replaced by a newer version",
      { ...ACTIVE, status: "replaced", highestVersion: 2 },
      "replaced",
      "newer version",
    ],
    ["not the highest version", { ...ACTIVE, highestVersion: 2 }, "replaced", "newer version"],
    [
      "an older version of an ad that was retired",
      { ...ACTIVE, status: "replaced", highestVersion: 2, highestStatus: "retired" },
      "retired",
      "taken out of the library",
    ],
    [
      "changed tall art",
      { ...ACTIVE, tallSha256: "f".repeat(64) },
      "art_changed",
      "pictures changed",
    ],
    [
      "changed square art",
      { ...ACTIVE, squareSha256: "f".repeat(64) },
      "art_changed",
      "pictures changed",
    ],
  ] as const)(
    "refuses a version whose ad is %s, with a plain message and nothing written",
    async (_label, standing, reason, words) => {
      for (const decision of ["approved", "rejected"] as const) {
        const repo = await repository();
        const { port } = catalogWith(standing as LibraryAdCatalogStanding | undefined);
        const refusal = executeHumanCampaignApproval(command({ decision }), approver, repo, port);
        await expect(refusal).rejects.toBeInstanceOf(CampaignLibraryAdRefusedError);
        await expect(refusal).rejects.toMatchObject({ reason });
        await expect(refusal).rejects.toThrow(words);
        expect(repo.commits).toHaveLength(0);
        expect(repo.denials).toBe(0);
      }
    },
  );

  it("consults the role before the catalog, so a non-approver learns nothing about the ad", async () => {
    const repo = await repository();
    const { port, standingOf } = catalogWith(undefined);
    const viewer = freezeAuthenticatedPrincipal({
      ...approver,
      role: "viewer",
      actorRef: "principal_viewer001",
    });
    expect(await executeHumanCampaignApproval(command(), viewer, repo, port)).toEqual({
      kind: "denied",
    });
    expect(standingOf).not.toHaveBeenCalled();
    expect(repo.denials).toBe(1);
  });
});
