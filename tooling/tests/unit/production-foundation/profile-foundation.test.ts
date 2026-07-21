import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  appendProfileVersion,
  compileBrandRules,
  confirmBrandSuggestion,
  evaluateValidatedProfileReadiness,
  ingestProfileAsset,
  previewProfileVersion,
  rollBackProfileVersion,
  validateExternalProfileUrl,
  type ProfileRepository,
  type ProfileTransaction,
} from "@oalo/application";
import {
  BrandSuggestionSchema,
  ProfileVersionSchema,
  type ProfileField,
  type ProfileType,
  type ProfileVersion,
  type ProfileVersionInput,
  type ProviderMapping,
} from "@oalo/contracts";
import {
  assertBrandSampleClassification,
  assertProfileCanBecomeCurrent,
  assertProfileFieldOwnership,
} from "@oalo/domain";

const now = new Date("2026-07-21T15:00:00.000Z");
const actorRef = "user_01Administrator";
const locationRef = "location_01TenantA";
const sha = (character: string) => character.repeat(64);

const confirmed = (value: string | string[]) => ({
  value: Array.isArray(value) ? [...value] : value,
  confirmation: "user-confirmed" as const,
  confirmedBy: actorRef,
  confirmedAt: now.toISOString(),
});

const attestation = {
  actorRef,
  attestedAt: now.toISOString(),
  valuesAuthorizedAndCurrent: true as const,
  understandsNotLegalApproval: true as const,
};

const mapping = (
  mappingType: ProviderMapping["mappingType"],
  validationStatus: ProviderMapping["validationStatus"] = "valid",
): ProviderMapping => ({
  mappingType,
  providerRef: `${mappingType}_01Provider`,
  displayLabel: `${mappingType} fixture`,
  validationStatus,
  validatedAt: now.toISOString(),
});

function input(
  profileType: ProfileType,
  profileVersionRef: string,
  values: Partial<Record<ProfileField, ReturnType<typeof confirmed>>> = {},
  providerMappings: readonly ProviderMapping[] = [],
): ProfileVersionInput {
  return {
    schemaVersion: 1,
    profileVersionRef,
    locationRef,
    profileType,
    values,
    providerMappings: [...providerMappings],
    assets: [],
    attestation,
    createdBy: actorRef,
  };
}

function repositoryHarness() {
  const state = {
    versions: new Map<string, ProfileVersion>(),
    current: new Map<string, string>(),
  };
  const repository: ProfileRepository = {
    async run<T>(work: (transaction: ProfileTransaction) => Promise<T>): Promise<T> {
      const snapshot = structuredClone({
        versions: [...state.versions],
        current: [...state.current],
      });
      const transaction: ProfileTransaction = {
        async getCurrent(location, profileType) {
          const ref = state.current.get(`${location}:${profileType}`);
          return ref === undefined ? undefined : state.versions.get(ref);
        },
        async getVersion(location, profileVersionRef) {
          const version = state.versions.get(profileVersionRef);
          return version?.locationRef === location ? version : undefined;
        },
        async getLatestVersionNo(location, profileType) {
          return Math.max(
            0,
            ...[...state.versions.values()]
              .filter(
                (version) =>
                  version.locationRef === location && version.profileType === profileType,
              )
              .map((version) => version.versionNo),
          );
        },
        async append(version) {
          if (state.versions.has(version.profileVersionRef)) throw new Error("duplicate version");
          state.versions.set(version.profileVersionRef, version);
        },
        async promote(update) {
          const key = `${update.locationRef}:${update.profileType}`;
          const current = state.current.get(key);
          if (current !== update.expectedCurrentRef) throw new Error("current profile changed");
          state.current.set(key, update.profileVersionRef);
        },
      };
      try {
        return await work(transaction);
      } catch (error: unknown) {
        state.versions = new Map(snapshot.versions);
        state.current = new Map(snapshot.current);
        throw error;
      }
    },
  };
  return { state, repository };
}

const brandValues = {
  brand_name: confirmed("Operation Automated LO"),
  brand_voice: confirmed("Direct and calm"),
  banned_language: confirmed(["guaranteed approval"]),
  logo_asset_ref: confirmed("asset_01LogoApproved"),
};

const complianceValues = {
  license_number: confirmed("LICENSE-001"),
  nmls_id: confirmed("NMLS-001"),
  lender_name: confirmed("Fixture Lending"),
  disclosure_text: confirmed("Equal Housing Opportunity."),
  consent_text: confirmed("By submitting, you consent to contact."),
};

const partnerValues = {
  realtor_name: confirmed("Taylor Reed"),
  realtor_permission: confirmed("attested"),
  property_permission: confirmed("attested"),
};

describe("versioned tenant profiles", () => {
  it("strictly validates profile boundaries and field ownership", () => {
    expect(() =>
      ProfileVersionSchema.parse({
        ...input("brand", "profile_01Brand"),
        versionNo: 1,
        createdAt: now.toISOString(),
        unexpected: true,
      }),
    ).toThrow();
    expect(() =>
      assertProfileFieldOwnership(
        ProfileVersionSchema.parse({
          ...input("brand", "profile_01Brand", { license_number: confirmed("bad") }),
          versionNo: 1,
          createdAt: now.toISOString(),
        }),
      ),
    ).toThrow("owned by another profile");
  });

  it("appends immutable history while keeping one current pointer", async () => {
    const harness = repositoryHarness();
    const first = await appendProfileVersion(
      { version: input("brand", "profile_01Brand", brandValues), promote: true, createdAt: now },
      harness.repository,
    );
    const draft = await appendProfileVersion(
      {
        version: input("brand", "profile_02Brand", {
          ...brandValues,
          brand_voice: confirmed("A new draft voice"),
        }),
        promote: false,
        createdAt: new Date("2026-07-21T15:01:00.000Z"),
      },
      harness.repository,
    );
    expect(first.versionNo).toBe(1);
    expect(draft.versionNo).toBe(2);
    expect(harness.state.current.get(`${locationRef}:brand`)).toBe(first.profileVersionRef);
    expect(harness.state.versions).toHaveLength(2);
    expect(() => {
      (first.values.brand_name as { value: string }).value = "mutated";
    }).toThrow();
  });

  it("rolls back by appending a new version and preserves every prior snapshot", async () => {
    const harness = repositoryHarness();
    const first = await appendProfileVersion(
      {
        version: input("partner", "profile_01Partner", partnerValues),
        promote: true,
        createdAt: now,
      },
      harness.repository,
    );
    await appendProfileVersion(
      {
        version: input("partner", "profile_02Partner", {
          ...partnerValues,
          realtor_name: confirmed("A different realtor"),
        }),
        promote: true,
        createdAt: new Date("2026-07-21T15:01:00.000Z"),
      },
      harness.repository,
    );
    const rollback = await rollBackProfileVersion(
      {
        locationRef,
        historicalVersionRef: first.profileVersionRef,
        newProfileVersionRef: "profile_03Partner",
        actorRef,
        createdAt: new Date("2026-07-21T15:02:00.000Z"),
      },
      harness.repository,
    );
    expect(rollback.versionNo).toBe(3);
    expect(rollback.sourceVersionRef).toBe(first.profileVersionRef);
    expect(rollback.values).toEqual(first.values);
    expect(harness.state.versions).toHaveLength(3);
    await expect(
      previewProfileVersion("location_02TenantB", first.profileVersionRef, harness.repository),
    ).rejects.toThrow("active location");
  });

  it("cannot roll an unattested draft into the current profile", async () => {
    const harness = repositoryHarness();
    const draft = input("brand", "profile_01Unattested", brandValues);
    delete draft.attestation;
    await appendProfileVersion(
      { version: draft, promote: false, createdAt: now },
      harness.repository,
    );
    await expect(
      rollBackProfileVersion(
        {
          locationRef,
          historicalVersionRef: draft.profileVersionRef,
          newProfileVersionRef: "profile_02UnattestedRollback",
          actorRef,
          createdAt: now,
        },
        harness.repository,
      ),
    ).rejects.toThrow("explicit user attestation");
  });

  it("refuses to promote inferred values or profiles without attestation", () => {
    const proposed = ProfileVersionSchema.parse({
      ...input("brand", "profile_01Suggested"),
      values: {
        brand_voice: {
          value: "Model output",
          confirmation: "model-suggested",
        },
      },
      versionNo: 1,
      createdAt: now.toISOString(),
    });
    expect(() => assertProfileCanBecomeCurrent(proposed)).toThrow("inferred or unconfirmed");
    expect(() =>
      assertProfileCanBecomeCurrent({ ...proposed, values: brandValues, attestation: undefined }),
    ).toThrow("explicit user attestation");
  });
});

describe("profile readiness, assets, and brand compilation", () => {
  it("derives readiness from blueprint, channel, lender policy, mappings, and asset state", () => {
    const asset = {
      assetRef: "asset_01LogoApproved",
      storageKey: `locations/${locationRef}/profiles/assets/logo/${sha("a")}.png`,
      mimeType: "image/png" as const,
      sha256: sha("a"),
      byteSize: 1_024,
      width: 800,
      height: 800,
      metadataStripped: true as const,
      visibility: "private" as const,
      approvalStatus: "approved" as const,
    };
    const versions = [
      ProfileVersionSchema.parse({
        ...input("brand", "profile_01Brand", brandValues),
        assets: [asset],
        versionNo: 1,
        createdAt: now.toISOString(),
      }),
      ProfileVersionSchema.parse({
        ...input("compliance", "profile_01Compliance", complianceValues),
        versionNo: 1,
        createdAt: now.toISOString(),
      }),
      ProfileVersionSchema.parse({
        ...input("partner", "profile_01Partner", partnerValues),
        versionNo: 1,
        createdAt: now.toISOString(),
      }),
      ProfileVersionSchema.parse({
        ...input(
          "routing",
          "profile_01Routing",
          {},
          ["pipeline", "user", "workflow", "field", "tag"].map((type) =>
            mapping(type as ProviderMapping["mappingType"]),
          ),
        ),
        versionNo: 1,
        createdAt: now.toISOString(),
      }),
    ];
    const context = {
      blueprint: "open-house-boost",
      stateCode: "TX",
      channels: ["public-page", "pdf", "meta", "ghl-routing"],
      lenderRequiredFields: [],
      policyRequiredFields: [],
    };
    expect(evaluateValidatedProfileReadiness(versions, context)).toEqual({
      ready: true,
      missingFields: [],
      invalidMappings: [],
      invalidAssetRefs: [],
      blockingReasons: [],
      legalApprovalClaimed: false,
    });
    const changedPolicy = evaluateValidatedProfileReadiness(versions, {
      ...context,
      policyRequiredFields: ["claim_policy"],
    });
    expect(changedPolicy.ready).toBe(false);
    expect(changedPolicy.missingFields).toContain("claim_policy");
  });

  it("validates URLs and blocks private-network address literals", () => {
    expect(validateExternalProfileUrl("https://example.com/brand").hostname).toBe("example.com");
    expect(validateExternalProfileUrl("https://8.8.8.8/brand").hostname).toBe("8.8.8.8");
    expect(validateExternalProfileUrl("https://[2001:4860:4860::8888]/brand").hostname).toContain(
      "2001:4860",
    );
    for (const url of [
      "http://example.com",
      "https://localhost/secret",
      "https://tenant.localhost/secret",
      "https://0.0.0.0/secret",
      "https://127.0.0.1/secret",
      "https://169.254.1.1/secret",
      "https://10.1.2.3/secret",
      "https://172.16.1.1/secret",
      "https://192.168.1.1/secret",
      "https://[::1]/secret",
      "https://[::]/secret",
      "https://[fc00::1]/secret",
      "https://[fd00::1]/secret",
      "https://[fe80::1]/secret",
      "https://user:pass@example.com/secret",
    ]) {
      expect(() => validateExternalProfileUrl(url)).toThrow();
    }
  });

  it("decodes, re-encodes, strips metadata, and stores assets privately", async () => {
    const sanitizedBytes = new TextEncoder().encode("sanitized-png");
    const decoder = {
      decodeAndReencode: vi.fn(async () => ({
        bytes: sanitizedBytes,
        mimeType: "image/png" as const,
        width: 1_200,
        height: 800,
        metadataStripped: true as const,
      })),
    };
    const storage = {
      store: vi.fn(
        async ({ locationRef: location, sha256 }: { locationRef: string; sha256: string }) =>
          `locations/${location}/profiles/assets/${sha256}.png`,
      ),
    };
    const result = await ingestProfileAsset(
      {
        locationRef,
        assetRef: "asset_01NewLogo",
        bytes: new TextEncoder().encode("untrusted-image"),
        claimedMimeType: "image/png",
      },
      { decoder, storage },
    );
    expect(result).toMatchObject({
      visibility: "private",
      approvalStatus: "pending",
      metadataStripped: true,
      mimeType: "image/png",
    });
    expect(result.sha256).toBe(createHash("sha256").update(sanitizedBytes).digest("hex"));
    expect(storage.store).toHaveBeenCalledWith(
      expect.objectContaining({ bytes: sanitizedBytes, sha256: result.sha256 }),
    );
  });

  it("rejects empty and oversized asset input or sanitized output", async () => {
    const storage = { store: vi.fn(async () => "locations/location_01TenantA/unused.png") };
    const decoder = {
      decodeAndReencode: vi.fn(async () => ({
        bytes: new Uint8Array(),
        mimeType: "image/png" as const,
        width: 800,
        height: 800,
        metadataStripped: true as const,
      })),
    };
    const base = {
      locationRef,
      assetRef: "asset_02Invalid",
      claimedMimeType: "image/png" as const,
    };
    await expect(
      ingestProfileAsset({ ...base, bytes: new Uint8Array() }, { decoder, storage }),
    ).rejects.toThrow("input exceeds");
    await expect(
      ingestProfileAsset(
        { ...base, bytes: new Uint8Array(25 * 1024 * 1024 + 1) },
        { decoder, storage },
      ),
    ).rejects.toThrow("input exceeds");
    await expect(
      ingestProfileAsset({ ...base, bytes: new Uint8Array([1]) }, { decoder, storage }),
    ).rejects.toThrow("Sanitized profile asset");

    decoder.decodeAndReencode.mockResolvedValueOnce({
      bytes: new Uint8Array(25 * 1024 * 1024 + 1),
      mimeType: "image/png",
      width: 800,
      height: 800,
      metadataStripped: true,
    });
    await expect(
      ingestProfileAsset({ ...base, bytes: new Uint8Array([1]) }, { decoder, storage }),
    ).rejects.toThrow("Sanitized profile asset");
    expect(storage.store).not.toHaveBeenCalled();
  });

  it("quarantines sensitive samples and requires explicit confirmation of allowed suggestions", () => {
    expect(
      assertBrandSampleClassification({
        containsBorrowerData: false,
        containsApplicationData: false,
        containsCreditData: false,
        containsIncomeData: false,
        containsBankData: true,
        containsSocialSecurityData: false,
        containsPrivateCrmData: false,
      }),
    ).toBe("quarantined");
    const suggestion = BrandSuggestionSchema.parse({
      suggestionRef: "suggestion_01Voice",
      locationRef,
      sourceProfileVersionRef: "profile_01Brand",
      field: "brand_voice",
      suggestedValue: "Warm and direct",
      status: "proposed",
      modelPolicyRef: "policy_01BrandModel",
      createdAt: now.toISOString(),
    });
    expect(confirmBrandSuggestion(suggestion, actorRef, now)).toEqual({
      field: "brand_voice",
      value: confirmed("Warm and direct"),
    });
    expect(() => BrandSuggestionSchema.parse({ ...suggestion, field: "nmls_id" })).toThrow();
  });

  it("compiles the prompt snapshot and deterministic rules from one confirmed version", () => {
    const version = ProfileVersionSchema.parse({
      ...input("brand", "profile_01Brand", brandValues),
      versionNo: 1,
      createdAt: now.toISOString(),
    });
    const first = compileBrandRules(version);
    const second = compileBrandRules(structuredClone(version));
    expect(second).toEqual(first);
    const changed = compileBrandRules({
      ...version,
      values: { ...version.values, brand_voice: confirmed("Changed") },
    });
    expect(changed.contentHash).not.toBe(first.contentHash);
    expect(first.promptSnapshot).toContain("brand_voice");
    expect(first.deterministicRules).toContain('brand_voice="Direct and calm"');
    expect(first.promptSnapshot).toContain("guaranteed approval");
    expect(() =>
      compileBrandRules(
        ProfileVersionSchema.parse({
          ...input("partner", "profile_02Partner", partnerValues),
          versionNo: 2,
          createdAt: now.toISOString(),
        }),
      ),
    ).toThrow("Only a brand profile");
  });
});
