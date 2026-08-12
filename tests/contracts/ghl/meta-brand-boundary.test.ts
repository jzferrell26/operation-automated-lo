import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  META_ROUTE_ALLOWLIST,
  MetaDraftInputSchema,
  MetaPaidAdBoundaryError,
  calculatePaidAdProjectionHash,
  compileFrozenMetaDraft,
  type MetaPaidAdBrandAuthority,
} from "../../../packages/ghl/src/meta-adapter.js";

type DraftInput = Parameters<typeof compileFrozenMetaDraft>[0];
type JsonPath = readonly (string | number)[];

interface ForbiddenIdentityVector {
  readonly caseId: string;
  readonly path: JsonPath;
  readonly value: string;
}

function loadFixture(fileName: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/${fileName}`, import.meta.url), "utf8"));
}

function safeDraft(): DraftInput {
  return loadFixture("meta-paid-ad-lo-only.json") as DraftInput;
}

function setFixturePath(root: unknown, path: JsonPath, value: string): void {
  let cursor = root;
  for (const segment of path.slice(0, -1)) {
    if (typeof segment === "number") {
      if (!Array.isArray(cursor)) throw new Error("Fixture path expected an array.");
      cursor = cursor[segment];
      continue;
    }
    if (cursor === null || typeof cursor !== "object" || Array.isArray(cursor)) {
      throw new Error("Fixture path expected an object.");
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  const finalSegment = path.at(-1);
  if (finalSegment === undefined) throw new Error("Fixture path cannot be empty.");
  if (typeof finalSegment === "number") {
    if (!Array.isArray(cursor)) throw new Error("Fixture path expected an array.");
    cursor[finalSegment] = value;
    return;
  }
  if (cursor === null || typeof cursor !== "object" || Array.isArray(cursor)) {
    throw new Error("Fixture path expected an object.");
  }
  (cursor as Record<string, unknown>)[finalSegment] = value;
}

function pinnedAuthority(draft: DraftInput): MetaPaidAdBrandAuthority {
  const expected = structuredClone(draft.brandPreflightEvidence);
  return {
    assertAuthorized(actual) {
      if (
        actual.campaignVersionRef !== expected.campaignVersionRef ||
        actual.paidAdProjectionHash !== expected.paidAdProjectionHash ||
        actual.collateralProjectionHash !== expected.collateralProjectionHash ||
        actual.rulesetVersionRef !== expected.rulesetVersionRef ||
        actual.brandBoundaryRulesHash !== expected.brandBoundaryRulesHash ||
        actual.preflightResultHash !== expected.resultHash
      ) {
        throw new MetaPaidAdBoundaryError("$storedPaidAdBrandAuthority");
      }
    },
  };
}

function rebindCallerControlledEvidence(draft: DraftInput): void {
  const projection = draft.paidAdProjection;
  const { projectionHash: _projectionHash, approvalSummary, ...projectionBody } = projection;
  const { projectionHash: _summaryHash, ...approvalSummaryBody } = approvalSummary;
  const reboundHash = calculatePaidAdProjectionHash({
    ...projectionBody,
    approvalSummary: approvalSummaryBody,
  });
  projection.projectionHash = reboundHash;
  projection.approvalSummary.projectionHash = reboundHash;
  draft.brandPreflightEvidence.paidAdProjectionHash = reboundHash;
  draft.brandPreflightEvidence.brandBoundaryRulesHash = "d".repeat(64);
  draft.brandPreflightEvidence.resultHash = "e".repeat(64);
}

describe("PRD-001e Realtor-free HighLevel Meta adapter boundary", () => {
  it("compiles only the allowlisted paid-ad projection under stored authority", async () => {
    const input = safeDraft();
    const authority = pinnedAuthority(input);
    const first = await compileFrozenMetaDraft(input, authority);
    const second = await compileFrozenMetaDraft(input, authority);
    const adDraft = first.operations[2]?.fixturePayload;

    expect(first.compiledHash).toBe(second.compiledHash);
    expect(adDraft).toMatchObject({
      paidAd: {
        projectionRef: "paid_projection_Meta001",
        advertiserIdentity: { kind: "loan_officer", displayName: "Morgan Lee Home Lending" },
        creative: { callToActionLabel: "Learn about financing" },
        leadForm: { callToActionLabel: "Request information" },
      },
    });
    expect(input).not.toHaveProperty("collateralProjection");
    expect(input).not.toHaveProperty("brandBoundaryRules");
    expect(
      MetaDraftInputSchema.safeParse({
        ...input,
        collateralProjection: { realtorDisplayName: "Taylor Reed" },
      }).success,
    ).toBe(false);
    expect(MetaDraftInputSchema.safeParse({ ...input, brandBoundaryRules: {} }).success).toBe(
      false,
    );
    expect(adDraft).not.toHaveProperty("paidAd.template");
    expect(adDraft).not.toHaveProperty("paidAd.approvalSummary");
    expect(JSON.stringify(first.operations)).not.toMatch(/realtor|realty|broker|co.?brand/i);
  });

  it.each(loadFixture("meta-paid-ad-forbidden-identity-vectors.json") as ForbiddenIdentityVector[])(
    "fails closed for $caseId",
    async ({ path, value }) => {
      const honest = safeDraft();
      const authority = pinnedAuthority(honest);
      const contaminated = structuredClone(honest);
      setFixturePath(contaminated, path, value);
      if (path.length > 2) rebindCallerControlledEvidence(contaminated);
      await expect(compileFrozenMetaDraft(contaminated, authority)).rejects.toThrow();
    },
  );

  it("rejects the fully rebound Taylor Reed lender spoof against stored authority", async () => {
    const honest = safeDraft();
    const authority = pinnedAuthority(honest);
    const contaminated = structuredClone(honest);
    for (const [path, value] of [
      [["paidAdProjection", "advertiserIdentity", "displayName"], "Taylor Reed"],
      [["paidAdProjection", "advertiserIdentity", "logoAssetRef"], "asset_PartnerLogo001"],
      [["paidAdProjection", "advertiserIdentity", "imageAssetRef"], "asset_PartnerPhoto001"],
      [
        ["paidAdProjection", "advertiserIdentity", "contactInformation", "email"],
        "taylor@partner.example",
      ],
      [["paidAdProjection", "copy", "primaryText"], "Taylor Reed welcomes you to 123 Main"],
      [["paidAdProjection", "creative", "body"], "Visit Taylor Reed at the open house"],
      [["paidAdProjection", "leadForm", "description"], "Taylor Reed will follow up"],
    ] as const) {
      setFixturePath(contaminated, path, value);
    }
    rebindCallerControlledEvidence(contaminated);

    await expect(compileFrozenMetaDraft(contaminated, authority)).rejects.toThrow(
      MetaPaidAdBoundaryError,
    );
  });

  it.each(["Summit Realty presents this home", "A dual-brand open house experience"])(
    "rejects fully rebound brokerage or co-brand copy: %s",
    async (primaryText) => {
      const honest = safeDraft();
      const authority = pinnedAuthority(honest);
      const contaminated = structuredClone(honest);
      contaminated.paidAdProjection.copy.primaryText = primaryText;
      rebindCallerControlledEvidence(contaminated);

      await expect(compileFrozenMetaDraft(contaminated, authority)).rejects.toThrow(
        MetaPaidAdBoundaryError,
      );
    },
  );

  it("fails closed without a trusted authority or with mismatched evidence", async () => {
    const input = safeDraft();
    await expect(compileFrozenMetaDraft(input, undefined as never)).rejects.toThrow(
      MetaPaidAdBoundaryError,
    );
    const authority = pinnedAuthority(input);
    input.brandPreflightEvidence.resultHash = "f".repeat(64);
    await expect(compileFrozenMetaDraft(input, authority)).rejects.toThrow(MetaPaidAdBoundaryError);
  });

  it("awaits a database-backed stored authority and fails closed on rejection", async () => {
    const input = safeDraft();

    await expect(
      compileFrozenMetaDraft(input, {
        async assertAuthorized() {
          await Promise.resolve();
          throw new MetaPaidAdBoundaryError("$storedPaidAdBrandAuthority");
        },
      }),
    ).rejects.toThrow(MetaPaidAdBoundaryError);
  });

  it("preserves the exact route and method allowlist without making a provider call", () => {
    expect(META_ROUTE_ALLOWLIST["upsert-campaign-draft"]).toEqual({
      method: "PUT",
      route: "/ad-publishing/facebook/campaigns",
    });
    expect(META_ROUTE_ALLOWLIST["upsert-adset-draft"]).toEqual({
      method: "PUT",
      route: "/ad-publishing/facebook/adsets",
    });
    expect(META_ROUTE_ALLOWLIST["upsert-ad-draft"]).toEqual({
      method: "PUT",
      route: "/ad-publishing/facebook/ads-v2",
    });
    expect(Object.values(META_ROUTE_ALLOWLIST)).not.toContainEqual(
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
