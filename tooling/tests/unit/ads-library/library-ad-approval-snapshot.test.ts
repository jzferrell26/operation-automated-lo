import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  canonicalCampaignHash,
  createApprovalDecision,
  libraryAdCopyRef,
  libraryAdCreativeRef,
  libraryAdDisclosureRef,
  libraryAdImageRef,
  runCampaignPreflight,
  type ApprovalAuthorityPort,
} from "@oalo/application";
import {
  ApprovalSnapshotSchema,
  type ApprovalDecision,
  type CampaignVersion,
} from "@oalo/contracts";

import {
  SQUARE_DIGEST,
  TALL_DIGEST,
  imageRef,
  libraryAdRulesFor,
  libraryAdVersion,
  type LibraryAdVariation,
} from "./library-ad-fixtures.js";

/**
 * PRD-009c D5, 009C-AC-015. A library-ad version's approval snapshot names the ad, its art bytes,
 * the words, the disclosure line, and the run dates, and no field of it is a reference minted
 * per draft: two drafts with the same content get the same snapshot, and a change to any one of
 * those parts gets a different one.
 */

const allowAll: ApprovalAuthorityPort = { async assertMayApprove() {} };

const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

async function snapshotFor(
  variation: LibraryAdVariation = {},
  refs: Readonly<{ campaignRef?: string; campaignVersionRef?: string }> = {},
): Promise<ApprovalDecision["snapshot"]> {
  const version = await libraryAdVersion(variation, refs);
  return (await decide(version)).snapshot;
}

async function decide(
  version: CampaignVersion,
  approverDisplayName: string | undefined = undefined,
): Promise<ApprovalDecision> {
  return createApprovalDecision(
    {
      approvalRef: "approval_01LibraryAd",
      campaignVersion: version,
      preflight: runCampaignPreflight(version, libraryAdRulesFor()),
      actorRef: "principal_approver001",
      actorKind: "human",
      actorRole: "approver",
      decidedAt: new Date("2026-10-01T17:00:00.000Z"),
      ipAuditHash: "a".repeat(64),
      decision: "approved",
      approverDisplayName,
    },
    allowAll,
  );
}

describe("library-ad approval snapshot (009C-AC-015)", () => {
  it("derives every reference from content, as D5 states", () => {
    expect(libraryAdImageRef("sample-first-home", 1, "tall", TALL_DIGEST)).toBe(
      imageRef("sample-first-home", 1, "tall", TALL_DIGEST),
    );
    expect(libraryAdCreativeRef("sample-first-home", 1, TALL_DIGEST, SQUARE_DIGEST)).toBe(
      `libcreative_${sha256Hex(`sample-first-home:1:${TALL_DIGEST}:${SQUARE_DIGEST}`).slice(0, 40)}`,
    );
    expect(libraryAdCopyRef("A headline", "Some text")).toBe(
      `libcopy_${canonicalCampaignHash({ headline: "A headline", primaryText: "Some text" }).slice(0, 40)}`,
    );
    expect(libraryAdDisclosureRef("Equal Housing Opportunity.")).toBe(
      `libdisclosure_${canonicalCampaignHash({ disclosure: "Equal Housing Opportunity." }).slice(0, 40)}`,
    );
  });

  it("builds the library-ad snapshot from the variant with no per-draft reference", async () => {
    const first = await snapshotFor(
      {},
      { campaignRef: "campaign_01First", campaignVersionRef: "campaignversion_01First" },
    );
    const second = await snapshotFor(
      {},
      { campaignRef: "campaign_02Second", campaignVersionRef: "campaignversion_02Second" },
    );
    expect(first).toEqual(second);
    expect(first).toEqual({
      blueprintId: "library-ad",
      libraryAdId: "sample-first-home",
      libraryAdVersion: 1,
      tallSha256: TALL_DIGEST,
      squareSha256: SQUARE_DIGEST,
      creativeVersionRef: libraryAdCreativeRef("sample-first-home", 1, TALL_DIGEST, SQUARE_DIGEST),
      copyVersionRef: libraryAdCopyRef(
        "Buying your first home? Start with a plan.",
        "I help first-time buyers understand every step of the way.",
      ),
      disclosureVersionRef: libraryAdDisclosureRef("Equal Housing Opportunity."),
      targetingHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      budgetHash: canonicalCampaignHash({ dailyBudgetMinor: 2_500, totalBudgetMinor: 35_000 }),
      datesHash: canonicalCampaignHash({ startsAt: null, endsAt: "2026-10-15T23:59:00.000Z" }),
    });
  });

  it("changes when one word, one art digest, the disclosure line, or the run dates change", async () => {
    const base = await snapshotFor();
    const variations: readonly Readonly<[string, LibraryAdVariation, string]>[] = [
      ["one word", { headline: "Buying your first house? Start with a plan." }, "copyVersionRef"],
      [
        "one word of the text",
        { body: "I help first-time buyers understand every step of it." },
        "copyVersionRef",
      ],
      ["one art digest", { squareSha256: "3".repeat(64) }, "creativeVersionRef"],
      ["the disclosure line", { disclosureText: "Equal Housing Lender." }, "disclosureVersionRef"],
      ["the end date", { endsAt: "2026-10-16T23:59:00.000Z" }, "datesHash"],
      ["the start date", { startsAt: "2026-10-02T09:00:00.000Z" }, "datesHash"],
      ["the library ad version", { version: 2 }, "creativeVersionRef"],
      ["the places", { cities: ["Dallas, TX"] }, "targetingHash"],
    ];
    for (const [label, variation, field] of variations) {
      const changed = await snapshotFor(variation);
      expect(changed, label).not.toEqual(base);
      expect((changed as Record<string, unknown>)[field], label).not.toBe(
        (base as Record<string, unknown>)[field],
      );
    }
  });

  it("records the decider's own session name beside the same references, and no key without one", async () => {
    const version = await libraryAdVersion();
    const unnamed = await decide(version);
    const named = await decide(version, "Alex Morgan");

    expect(unnamed.snapshot).not.toHaveProperty("approverDisplayName");
    expect(named.snapshot).toEqual({ ...unnamed.snapshot, approverDisplayName: "Alex Morgan" });
  });

  it("accepts an optional approver display name on both variants and nothing unknown", () => {
    const library = {
      blueprintId: "library-ad",
      libraryAdId: "sample-first-home",
      libraryAdVersion: 1,
      tallSha256: TALL_DIGEST,
      squareSha256: SQUARE_DIGEST,
      creativeVersionRef: libraryAdCreativeRef("sample-first-home", 1, TALL_DIGEST, SQUARE_DIGEST),
      copyVersionRef: libraryAdCopyRef("A", "B"),
      disclosureVersionRef: libraryAdDisclosureRef("C"),
      targetingHash: "a".repeat(64),
      budgetHash: "b".repeat(64),
      datesHash: "c".repeat(64),
    };
    expect(ApprovalSnapshotSchema.safeParse(library).success).toBe(true);
    expect(
      ApprovalSnapshotSchema.safeParse({ ...library, approverDisplayName: "Alex Morgan" }).success,
    ).toBe(true);
    expect(ApprovalSnapshotSchema.safeParse({ ...library, approverDisplayName: "" }).success).toBe(
      false,
    );
    expect(ApprovalSnapshotSchema.safeParse({ ...library, partnerName: "Taylor" }).success).toBe(
      false,
    );
    expect(
      ApprovalSnapshotSchema.safeParse({ ...library, copyVersionRef: "copy_01Random" }).success,
    ).toBe(false);
  });
});
