import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import {
  CampaignManifestSchema,
  WebinarAdPreparationRequestSchema,
  LibraryAdCampaignManifestSchema,
  type CampaignVersion,
} from "@oalo/contracts";
import {
  canonicalCampaignHash,
  CampaignApprovalStaleError,
  createApprovalDecision,
  executeHumanCampaignApproval,
  freezeAuthenticatedPrincipal,
  runCampaignPreflight,
  type CampaignApprovalEvidence,
  type CampaignApprovalRepository,
  type CampaignApprovalCommitInput,
  type HumanCampaignApprovalInput,
  type WebinarAdEvidencePort,
} from "@oalo/application";
import { rulesetRuleCodes } from "@oalo/domain";
import { libraryAdVersion, libraryAdRulesFor } from "../ads-library/library-ad-fixtures.js";
import {
  WEBINAR_NOW,
  webinarVersion,
  webinarRules,
  webinarEvidence,
} from "./webinar-foundation-fixtures.js";

const principal = freezeAuthenticatedPrincipal({
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
const catalog = { standingOf: vi.fn(async () => undefined) };
function command(evidence: CampaignApprovalEvidence): HumanCampaignApprovalInput {
  return {
    campaignRef: evidence.version.campaignRef,
    decision: "approved",
    decidedAt: WEBINAR_NOW,
    ipAuditHash: "a".repeat(64),
    correlationRef: "correlation_webinar001",
    approverDisplayName: "Actual Session Name",
    expectedCampaignVersionRef: evidence.version.campaignVersionRef,
    expectedManifestHash: evidence.version.manifestHash,
    expectedPreflightResultHash: evidence.preflight.resultHash,
    expectedRowVersion: 1,
  };
}
function repository(evidence: CampaignApprovalEvidence) {
  const commits: CampaignApprovalCommitInput[] = [];
  const denied = vi.fn(async () => {});
  const repo: CampaignApprovalRepository = {
    async run(work) {
      return work({
        loadCurrentEvidence: async () => evidence,
        recordDeniedAttempt: denied,
        commitApproval: async (input) => {
          commits.push(input);
          return {
            decision: input.decision,
            state: input.toState,
            rowVersion: input.expectedRowVersion + 1,
            duplicate: false,
          };
        },
      });
    },
  };
  return { repo, commits, denied };
}
const request = {
  requestId: "00000000-0000-4000-8000-000000000813",
  templateId: "webinar-plan-first",
  templateVersion: 1,
  publicationId: "00000000-0000-4000-8000-000000000801",
  headline: "Make a plan",
  primaryText: "Learn the homebuying path.",
  endsOn: "2026-10-12",
  dailyBudgetDollars: 10,
  totalBudgetDollars: 100,
  places: ["Illinois"],
};

describe("CTR-002 webinar foundation", () => {
  it("preserves legacy parsed JSON, hashes and literal approved image requirement", async () => {
    const legacy = await libraryAdVersion();
    expect(CampaignManifestSchema.parse(legacy.manifest)).toEqual(legacy.manifest);
    expect(canonicalCampaignHash(CampaignManifestSchema.parse(legacy.manifest))).toBe(
      legacy.manifestHash,
    );
    if (legacy.manifest.blueprintId !== "library-ad") throw new Error("Wrong fixture");
    expect(
      LibraryAdCampaignManifestSchema.safeParse({
        ...legacy.manifest,
        images: legacy.manifest.images.map((image) => ({ ...image, approvalStatus: "pending" })),
      }).success,
    ).toBe(false);
    expect(runCampaignPreflight(legacy, libraryAdRulesFor()).blocking).toBe(false);
  });
  it.each([
    "publicUrl",
    "locationRef",
    "actorRef",
    "brand",
    "sourceHash",
    "rightsBasis",
    "images",
    "approved",
    "approverDisplayName",
    "decidedAt",
    "providerAuthority",
  ])("rejects browser %s overrides", (field) => {
    expect(
      WebinarAdPreparationRequestSchema.safeParse({ ...request, [field]: "injected" }).success,
    ).toBe(false);
  });
  it("normalizes geography and requires editing version, finite budgets and visible bounded words", () => {
    expect(WebinarAdPreparationRequestSchema.parse(request).places).toEqual({
      states: ["IL"],
      cities: [],
    });
    for (const patch of [
      { campaignRef: "campaign_existing001" },
      { expectedCampaignVersionRef: "campaignversion_existing001" },
      { dailyBudgetDollars: Infinity },
      { places: ["78701"] },
      { headline: "Hidden\u200bword" },
      { primaryText: "x".repeat(301) },
    ]) {
      expect(WebinarAdPreparationRequestSchema.safeParse({ ...request, ...patch }).success).toBe(
        false,
      );
    }
  });
  it("has separate deterministic raster/publication rules and never needs invented GHL validity", async () => {
    const evidence = await webinarEvidence();
    expect(evidence.preflight.blocking).toBe(false);
    expect(evidence.version.manifest).not.toHaveProperty("routing");
    expect(evidence.version.manifest.images[0]).not.toHaveProperty("approvalStatus");
    expect(rulesetRuleCodes("ruleset_webinarAd001")).toContain("WEBINAR_RASTER_CHANGED");
    expect(() => runCampaignPreflight(evidence.version, libraryAdRulesFor())).toThrow(
      "webinar ruleset",
    );
    if (evidence.version.manifest.blueprintId !== "webinar-ad") throw new Error("Wrong fixture");
    const rules = webinarRules(evidence.version.manifest);
    if (!("webinarAd" in rules)) throw new Error("Wrong rules");
    rules.webinarAd.squareSha256 = "f".repeat(64);
    expect(
      runCampaignPreflight(evidence.version, rules).findings.map((finding) => finding.ruleCode),
    ).toContain("WEBINAR_RASTER_CHANGED");
  });
  it("requires exact expected evidence before a webinar decision", async () => {
    const evidence = await webinarEvidence();
    const state = repository(evidence);
    const input = command(evidence);
    const { expectedManifestHash: _missing, ...incomplete } = input;
    await expect(
      executeHumanCampaignApproval(incomplete, principal, state.repo, catalog),
    ).rejects.toThrow("changed after review");
    expect(state.commits).toHaveLength(0);
  });
  it("fails closed without an injected live evidence adapter at both decision seams", async () => {
    const evidence = await webinarEvidence();
    const state = repository(evidence);
    await expect(
      executeHumanCampaignApproval(command(evidence), principal, state.repo, catalog),
    ).rejects.toThrow("Current webinar");
    await expect(
      createApprovalDecision(
        {
          approvalRef: "approval_webinar001",
          campaignVersion: evidence.version,
          preflight: evidence.preflight,
          actorRef: principal.actorRef,
          actorKind: "human",
          actorRole: "approver",
          decidedAt: WEBINAR_NOW,
          ipAuditHash: "a".repeat(64),
          decision: "approved",
          approverDisplayName: undefined,
        },
        { assertMayApprove: async () => {} },
      ),
    ).rejects.toThrow("Current webinar");
    expect(state.commits).toHaveLength(0);
  });
  it("freezes exact raster, placement copy, destination, lender and effective UTC stop evidence", async () => {
    const evidence = await webinarEvidence();
    const state = repository(evidence);
    const assertCurrent = vi.fn(async () => {});
    const result = await executeHumanCampaignApproval(
      command(evidence),
      principal,
      state.repo,
      catalog,
      { assertCurrent },
    );
    expect(result.kind).toBe("committed");
    const decision = state.commits[0]?.decision;
    expect(decision?.actorRef).toBe(principal.actorRef);
    expect(decision?.actorKind).toBe("human");
    expect(decision?.snapshot).toMatchObject({
      blueprintId: "webinar-ad",
      templateId: "webinar-plan-first",
      templateSourceHash: "2".repeat(64),
      tallSha256: "5".repeat(64),
      squareSha256: "6".repeat(64),
      publicationId: request.publicationId,
      endsAt: "2026-10-12T18:00:00.000Z",
      approverDisplayName: "Actual Session Name",
    });
    expect(assertCurrent).toHaveBeenCalled();
    expect(catalog.standingOf).not.toHaveBeenCalled();
  });
  it.each([
    "missing source",
    "retired template",
    "changed art",
    "revoked publication",
    "changed raster",
  ])("refuses %s before writes and replay", async (reason) => {
    const evidence = await webinarEvidence();
    const state = repository(evidence);
    await executeHumanCampaignApproval(command(evidence), principal, state.repo, catalog, {
      assertCurrent: async () => {},
    });
    const decision = state.commits[0]?.decision;
    if (!decision) throw new Error("Missing fixture decision");
    const refused: WebinarAdEvidencePort = {
      assertCurrent: async () => {
        throw new Error(reason);
      },
    };
    const fresh = repository(evidence);
    await expect(
      executeHumanCampaignApproval(command(evidence), principal, fresh.repo, catalog, refused),
    ).rejects.toThrow(reason);
    const replay = repository({
      ...evidence,
      state: "approved",
      rowVersion: 2,
      existingApproval: decision,
    });
    await expect(
      executeHumanCampaignApproval(command(evidence), principal, replay.repo, catalog, refused),
    ).rejects.toThrow(reason);
    expect(fresh.commits).toHaveLength(0);
    expect(replay.commits).toHaveLength(0);
  });
  it("allows identical replay only after fresh evidence and preserves original provenance", async () => {
    const evidence = await webinarEvidence();
    const state = repository(evidence);
    await executeHumanCampaignApproval(command(evidence), principal, state.repo, catalog, {
      assertCurrent: async () => {},
    });
    const decision = state.commits[0]?.decision;
    if (!decision) throw new Error("Missing decision");
    const replay = repository({
      ...evidence,
      state: "approved",
      rowVersion: 2,
      existingApproval: decision,
    });
    const assertCurrent = vi.fn(async () => {});
    const result = await executeHumanCampaignApproval(
      { ...command(evidence), approverDisplayName: "Later Session Name" },
      principal,
      replay.repo,
      catalog,
      { assertCurrent },
    );
    expect(result).toMatchObject({ kind: "committed", duplicate: true, decision });
    expect(assertCurrent).toHaveBeenCalledTimes(1);
    expect(replay.commits).toHaveLength(0);
    await expect(
      executeHumanCampaignApproval(command(evidence), principal, replay.repo, catalog),
    ).rejects.toThrow("Current webinar");
  });
  it("preserves malformed stored-check validation errors on first decision and replay without writes", async () => {
    const base = await webinarEvidence();
    const committed = repository(base);
    await executeHumanCampaignApproval(command(base), principal, committed.repo, catalog, {
      assertCurrent: async () => {},
    });
    const decision = committed.commits[0]?.decision;
    if (!decision) throw new Error("Missing fixture decision");
    const invalid = { ...base, preflight: { ...base.preflight, evaluatedAt: "not-a-date" } };
    for (const evidence of [
      invalid,
      { ...invalid, state: "approved" as const, rowVersion: 2, existingApproval: decision },
    ]) {
      const state = repository(evidence);
      const assertCurrent = vi.fn(async () => {});
      await expect(
        executeHumanCampaignApproval(command(evidence), principal, state.repo, catalog, {
          assertCurrent,
        }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(assertCurrent).toHaveBeenCalledExactlyOnceWith({
        version: evidence.version,
        checkedAt: WEBINAR_NOW,
      });
      expect(state.commits).toEqual([]);
      expect(state.denied).not.toHaveBeenCalled();
    }
    expect(committed.commits).toHaveLength(1);
    expect(decision.preflightResultHash).toBe(base.preflight.resultHash);
  });
  it.each(["manifestHash", "preflightResultHash"] as const)(
    "refuses replay when the existing approval's %s differs from current saved evidence",
    async (field) => {
      const evidence = await webinarEvidence();
      const committed = repository(evidence);
      await executeHumanCampaignApproval(command(evidence), principal, committed.repo, catalog, {
        assertCurrent: async () => {},
      });
      const decision = committed.commits[0]?.decision;
      if (!decision) throw new Error("Missing fixture decision");
      const conflicting = { ...decision, [field]: "f".repeat(64) };
      const replay = repository({
        ...evidence,
        state: "approved",
        rowVersion: 2,
        existingApproval: conflicting,
      });
      const assertCurrent = vi.fn(async () => {});
      await expect(
        executeHumanCampaignApproval(command(evidence), principal, replay.repo, catalog, {
          assertCurrent,
        }),
      ).rejects.toBeInstanceOf(CampaignApprovalStaleError);
      expect(assertCurrent).toHaveBeenCalledExactlyOnceWith({
        version: evidence.version,
        checkedAt: WEBINAR_NOW,
      });
      expect(replay.commits).toEqual([]);
      expect(replay.denied).not.toHaveBeenCalled();
      expect(conflicting[field]).toBe("f".repeat(64));
      expect(decision[field]).toBe(
        field === "manifestHash" ? evidence.version.manifestHash : evidence.preflight.resultHash,
      );
    },
  );
  it("checks role before evidence and denies a revoked reviewer even on replay", async () => {
    const evidence = await webinarEvidence();
    const state = repository(evidence);
    const assertCurrent = vi.fn(async () => {});
    const viewer = freezeAuthenticatedPrincipal({ ...principal, role: "viewer" });
    expect(
      await executeHumanCampaignApproval(command(evidence), viewer, state.repo, catalog, {
        assertCurrent,
      }),
    ).toEqual({ kind: "denied" });
    expect(assertCurrent).not.toHaveBeenCalled();
    expect(state.denied).toHaveBeenCalledOnce();
  });
  it("rejects expired destination, mismatched destination hash and foreign publisher before adapter success", async () => {
    for (const change of [
      (manifest: Extract<CampaignVersion["manifest"], { blueprintId: "webinar-ad" }>) => {
        manifest.destinationHash = "f".repeat(64);
      },
      (manifest: Extract<CampaignVersion["manifest"], { blueprintId: "webinar-ad" }>) => {
        manifest.destination.publisherActorRef = "principal_foreign001";
        manifest.destinationHash = canonicalCampaignHash(manifest.destination);
      },
    ]) {
      const version = await webinarVersion(change);
      if (version.manifest.blueprintId !== "webinar-ad") throw new Error("Wrong fixture");
      const evidence = {
        version,
        preflight: runCampaignPreflight(version, webinarRules(version.manifest)),
        state: "awaiting_approval" as const,
        rowVersion: 1,
      };
      const state = repository(evidence);
      await expect(
        executeHumanCampaignApproval(command(evidence), principal, state.repo, catalog, {
          assertCurrent: async () => {},
        }),
      ).rejects.toThrow("Current webinar");
      expect(state.commits).toHaveLength(0);
    }
    const evidence = await webinarEvidence();
    const state = repository(evidence);
    await expect(
      executeHumanCampaignApproval(
        { ...command(evidence), decidedAt: new Date("2026-10-16T00:00:00Z") },
        principal,
        state.repo,
        catalog,
        { assertCurrent: async () => {} },
      ),
    ).rejects.toThrow("Current webinar");
  });
  it("refuses forged or cross-version preflight evidence before first decision and replay", async () => {
    const base = await webinarEvidence();
    const committed = repository(base);
    await executeHumanCampaignApproval(command(base), principal, committed.repo, catalog, {
      assertCurrent: async () => {},
    });
    const approval = committed.commits[0]?.decision;
    if (!approval) throw new Error("Missing fixture decision");
    for (const patch of [
      { resultHash: "f".repeat(64) },
      { campaignRef: "campaign_foreign001" },
      { rulesetVersionRef: "ruleset_libraryAd001" },
      {
        inputVersions: {
          ...base.preflight.inputVersions,
          brandProfileVersionRef: "profile_changed001",
        },
      },
    ]) {
      const altered = { ...base, preflight: { ...base.preflight, ...patch } };
      for (const evidence of [
        altered,
        { ...altered, state: "approved" as const, rowVersion: 2, existingApproval: approval },
      ]) {
        const state = repository(evidence);
        await expect(
          executeHumanCampaignApproval(command(evidence), principal, state.repo, catalog, {
            assertCurrent: async () => {},
          }),
        ).rejects.toThrow("passing preflight");
        expect(state.commits).toHaveLength(0);
      }
    }
  });
  it("requires fresh snapshots after material words, brand, destination, budget, schedule or raster edits", async () => {
    async function snapshot(change?: Parameters<typeof webinarVersion>[0]) {
      const evidence = await webinarEvidence(change);
      const state = repository(evidence);
      await executeHumanCampaignApproval(command(evidence), principal, state.repo, catalog, {
        assertCurrent: async () => {},
      });
      return state.commits[0]?.decision.snapshot;
    }
    const original = await snapshot();
    const variations: readonly [Parameters<typeof webinarVersion>[0], string][] = [
      [
        (manifest) => {
          manifest.content.headline = "Learn the buying journey";
        },
        "copyHash",
      ],
      [
        (manifest) => {
          manifest.advertiser.title = "Mortgage specialist";
        },
        "brandHash",
      ],
      [
        (manifest) => {
          manifest.content.disclosureText = "Equal Housing Lender.";
        },
        "disclosureHash",
      ],
      [
        (manifest) => {
          manifest.meta.totalBudgetMinor += 100;
        },
        "budgetHash",
      ],
      [
        (manifest) => {
          manifest.meta.targeting.regions = ["IL"];
        },
        "targetingHash",
      ],
      [
        (manifest) => {
          manifest.schedule.endsAt = "2026-10-11T18:00:00.000Z";
        },
        "datesHash",
      ],
      [
        (manifest) => {
          manifest.images[0].contentSha256 = "f".repeat(64);
        },
        "tallSha256",
      ],
      [
        (manifest) => {
          manifest.destination.snapshotHash = "e".repeat(64);
          manifest.destinationHash = canonicalCampaignHash(manifest.destination);
        },
        "destinationHash",
      ],
    ];
    for (const [change, field] of variations) {
      const changed = await snapshot(change);
      expect(changed).not.toEqual(original);
      expect(changed?.[field as keyof typeof changed]).not.toEqual(
        original?.[field as keyof typeof original],
      );
    }
  });
});
