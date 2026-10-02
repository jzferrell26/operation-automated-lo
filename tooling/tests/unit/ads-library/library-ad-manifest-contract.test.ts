import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { canonicalCampaignHash } from "@oalo/application";
import {
  CampaignManifestSchema,
  CampaignVersionSchema,
  LibraryAdCampaignManifestSchema,
  OpenHouseCampaignManifestSchema,
} from "@oalo/contracts";

import { campaignManifestFixture } from "../../../../packages/db/test/campaign-manifest-fixture.mjs";
import { compileOpenHouseDraft } from "../../../../apps/web/src/server/open-house-draft.test-support.js";
import { createLocalSyntheticPrincipal } from "../../../../apps/web/src/server/local-synthetic-principal.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
} from "../../../../apps/web/src/server/campaign-command-test-support.js";

import { libraryAdManifestInput } from "./library-ad-fixtures.js";

/**
 * PRD-009c D5, 009C-AC-006 (the contract half). The manifest is a union on `blueprintId`:
 * `open-house-boost` exactly as it was, so every stored version still parses to the same bytes and
 * the same hash, and `library-ad`, which has no key that can hold a Realtor or brokerage identity.
 */

const FORBIDDEN_KEY_FRAGMENTS = ["partner", "realtor", "brokerage", "collateral", "cobrand"];

function forbiddenKey(key: string): boolean {
  const normalized = key.toLowerCase().replaceAll(/[^a-z]/gu, "");
  return FORBIDDEN_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

/** Every object key a zod schema can accept, at every depth, through every wrapper. */
function schemaKeys(schema: z.ZodType, seen = new Set<unknown>()): string[] {
  if (seen.has(schema)) return [];
  seen.add(schema);
  const definition = (schema as unknown as { _zod: { def: Record<string, unknown> } })._zod.def;
  const children: z.ZodType[] = [];
  const keys: string[] = [];
  switch (definition["type"]) {
    case "object": {
      const shape = definition["shape"] as Record<string, z.ZodType>;
      for (const [key, child] of Object.entries(shape)) {
        keys.push(key);
        children.push(child);
      }
      break;
    }
    case "array":
      children.push(definition["element"] as z.ZodType);
      break;
    case "tuple":
      children.push(...(definition["items"] as z.ZodType[]));
      if (definition["rest"] !== null && definition["rest"] !== undefined) {
        children.push(definition["rest"] as z.ZodType);
      }
      break;
    case "union":
      children.push(...(definition["options"] as z.ZodType[]));
      break;
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "readonly":
    case "nonoptional":
    case "catch":
      children.push(definition["innerType"] as z.ZodType);
      break;
    case "pipe":
      children.push(definition["in"] as z.ZodType, definition["out"] as z.ZodType);
      break;
    default:
      break;
  }
  return [...keys, ...children.flatMap((child) => schemaKeys(child, seen))];
}

/** Every key present in a parsed value, at every depth. */
function valueKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(valueKeys);
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [key, ...valueKeys(child)]);
  }
  return [];
}

describe("campaign manifest union (009C-AC-006)", () => {
  it("parses every stored open house manifest exactly as before, so its hash is unchanged", async () => {
    const stored = [
      campaignManifestFixture,
      (
        await compileOpenHouseDraft(
          OPEN_HOUSE_DRAFT_INPUT,
          createLocalSyntheticPrincipal(),
          LOCAL_SYNTHETIC_ENV,
        )
      ).version.manifest,
    ];
    for (const manifest of stored) {
      const throughUnion = CampaignManifestSchema.parse(JSON.parse(JSON.stringify(manifest)));
      const throughVariant = OpenHouseCampaignManifestSchema.parse(
        JSON.parse(JSON.stringify(manifest)),
      );
      expect(throughUnion).toEqual(throughVariant);
      expect(throughUnion.blueprintId).toBe("open-house-boost");
      expect(canonicalCampaignHash(throughUnion)).toBe(canonicalCampaignHash(manifest));
    }
  });

  it("parses a library-ad manifest and keeps it inside a campaign version", () => {
    const manifest = CampaignManifestSchema.parse(libraryAdManifestInput());
    expect(manifest.blueprintId).toBe("library-ad");
    expect(CampaignVersionSchema.shape.manifest.safeParse(libraryAdManifestInput()).success).toBe(
      true,
    );
  });

  it("refuses a library-ad manifest that carries any open house block", () => {
    expect(
      CampaignManifestSchema.safeParse({
        ...libraryAdManifestInput(),
        partner: { realtorDisplayName: "Taylor Reed", permissionConfirmed: true },
      }).success,
    ).toBe(false);
    expect(
      CampaignManifestSchema.safeParse({
        ...campaignManifestFixture,
        blueprintId: "library-ad",
      }).success,
    ).toBe(false);
    expect(
      CampaignManifestSchema.safeParse({ ...libraryAdManifestInput(), blueprintId: "other" })
        .success,
    ).toBe(false);
  });

  it("refuses a library-ad manifest whose fixed parts are anything but fixed", () => {
    const base = libraryAdManifestInput();
    const refused = [
      { ...base, meta: { ...base.meta, specialAdCategory: "NONE" } },
      { ...base, meta: { ...base.meta, placements: ["instagram_feed"] } },
      { ...base, meta: { ...base.meta, placements: [] } },
      {
        ...base,
        meta: { ...base.meta, targeting: { ...base.meta.targeting, zipCodes: ["78701"] } },
      },
      {
        ...base,
        meta: { ...base.meta, targeting: { ...base.meta.targeting, protectedDimensions: ["age"] } },
      },
      {
        ...base,
        meta: { ...base.meta, targeting: { ...base.meta.targeting, regions: ["Texas"] } },
      },
      { ...base, meta: { ...base.meta, targeting: { ...base.meta.targeting, cities: ["78701"] } } },
      { ...base, content: { ...base.content, claims: ["Lowest rates in town."] } },
      { ...base, content: { ...base.content, financingTerms: ["3.5% APR"] } },
      { ...base, images: [base.images[1], base.images[0]] },
      { ...base, images: [base.images[0]] },
      {
        ...base,
        images: [{ ...base.images[0], approvalStatus: "pending" }, base.images[1]],
      },
      { ...base, images: [{ ...base.images[0], assetRef: "asset_01Exterior" }, base.images[1]] },
      { ...base, images: [{ ...base.images[0], contentSha256: "A".repeat(64) }, base.images[1]] },
      { ...base, advertiser: { ...base.advertiser, email: "alex@example.invalid" } },
      { ...base, libraryAd: { id: "Sample First", version: 1 } },
      { ...base, libraryAd: { id: "sample-first-home", version: 0 } },
      { ...base, schedule: { startsAt: null } },
    ];
    for (const manifest of refused) {
      expect(CampaignManifestSchema.safeParse(manifest).success).toBe(false);
    }
  });

  it("has no key, at any depth, that can hold a partner, Realtor, brokerage, or co-brand identity", () => {
    const keys = schemaKeys(LibraryAdCampaignManifestSchema);
    // The walk is real: it reaches the leaves of every block.
    for (const expected of ["libraryAd", "advertiser", "contentSha256", "placements", "cities"]) {
      expect(keys).toContain(expected);
    }
    expect(keys.filter(forbiddenKey)).toEqual([]);
    expect(
      valueKeys(LibraryAdCampaignManifestSchema.parse(libraryAdManifestInput())).filter(
        forbiddenKey,
      ),
    ).toEqual([]);
    // The same walk does find the open house variant's partner block, so it can see one.
    expect(schemaKeys(OpenHouseCampaignManifestSchema).filter(forbiddenKey)).toContain("partner");
  });
});
