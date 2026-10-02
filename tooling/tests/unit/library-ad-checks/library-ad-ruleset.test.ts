import { describe, expect, it } from "vitest";

import {
  CampaignPolicyError,
  LIBRARY_AD_RULESET_REF,
  PREFLIGHT_RULESET_REGISTRY,
  evaluateCampaignPreflight,
  rulesetRuleCodes,
} from "@oalo/domain";

/**
 * PRD-009d D5, 009D-AC-010 and 009D-AC-014. The library-ad ruleset as a whole.
 *
 * The step 3 count of rules run is the length of the registry entry for the stored ruleset, never a
 * number typed by hand, so these tests pin that entry to what the evaluator actually runs: a
 * version built to break every rule at once trips exactly the registry's codes, and a clean one
 * trips none.
 */

const EVALUATED_AT = "2026-10-02T12:00:00.000Z";

function rules(
  overrides: Partial<{
    retiredOn: string | null;
    partnerNames: readonly string[];
  }> = {},
) {
  return {
    rulesetVersionRef: "ruleset_libraryAd001",
    evaluatedAt: EVALUATED_AT,
    minimumImageWidth: 1_080,
    minimumImageHeight: 842,
    earliestStartAt: EVALUATED_AT,
    allowedMergeTokens: [],
    bannedPhrases: ["guaranteed approval", "no credit check"],
    allowedClaims: [],
    allowsFinancingTerms: false,
    minimumDailyBudgetMinor: 500,
    maximumDailyBudgetMinor: 100_000,
    maximumTotalBudgetMinor: 500_000,
    warnings: [],
    libraryAd: {
      headlineMaxLength: 60,
      primaryTextMaxLength: 300,
      partnerNames: overrides.partnerNames ?? ["Priya Nadeem"],
      retiredOn: overrides.retiredOn ?? null,
    },
  };
}

function cleanManifest() {
  return {
    blueprintId: "library-ad" as const,
    content: {
      headline: "Thinking about your first home? Start here.",
      body: "I walk first-time buyers through each step. Send me a message and let's talk.",
      disclosureText: "Equal Housing Opportunity.",
      consentText:
        "By submitting, you agree to be contacted about home financing and related mortgage services.",
      mergeTokens: [] as string[],
      claims: [] as string[],
      financingTerms: [] as string[],
    },
    images: [
      { approvalStatus: "approved" as const, width: 1_080, height: 1_080 },
      { approvalStatus: "approved" as const, width: 1_080, height: 842 },
    ],
    advertiser: {
      name: "Alex Morgan",
      title: "Loan officer",
      company: "Prairie Home Lending",
      nmls: "0000000",
      companyNmls: "",
    },
    schedule: { startsAt: null, endsAt: "2026-10-16T23:59:59.000Z" },
    meta: {
      enabled: true,
      specialAdCategory: "HOUSING" as "HOUSING" | "NONE",
      platform: "meta" as const,
      targeting: {
        regions: ["TX"],
        cities: ["Austin, TX"],
        zipCodes: [] as string[],
        customAudienceRefs: [] as string[],
        protectedDimensions: [] as string[],
      },
      dailyBudgetMinor: 2_500,
      totalBudgetMinor: 35_000,
    },
    routing: { validationStatus: "valid" as "valid" | "missing" | "stale" },
  };
}

function everythingWrong() {
  const manifest = cleanManifest();
  return {
    ...manifest,
    content: {
      ...manifest.content,
      headline: `Guaranteed approval with low rates, call 5 ​now, ask my Realtor for your SSN ${"x".repeat(40)}`,
      disclosureText: "",
      consentText: "",
      mergeTokens: ["{{first_name}}"],
      claims: ["Best in town"],
      financingTerms: ["3.5% APR"],
    },
    images: [{ approvalStatus: "pending" as const, width: 400, height: 400 }],
    advertiser: { ...manifest.advertiser, nmls: "" },
    schedule: { startsAt: null, endsAt: "2026-10-02T23:59:59.000Z" },
    meta: {
      ...manifest.meta,
      specialAdCategory: "NONE" as const,
      targeting: { ...manifest.meta.targeting, zipCodes: ["78701"] },
      dailyBudgetMinor: 100,
    },
    routing: { validationStatus: "missing" as const },
  };
}

describe("the ruleset registry (009D-AC-014)", () => {
  it("lists the library-ad ruleset's rules, and the evaluator runs exactly those", () => {
    const registered = rulesetRuleCodes("ruleset_libraryAd001");
    expect(registered).toBeDefined();
    const tripped = new Set(
      evaluateCampaignPreflight(everythingWrong(), rules({ retiredOn: "2026-10-01" })).map(
        (finding) => finding.ruleCode,
      ),
    );
    expect([...tripped].sort()).toEqual([...(registered ?? [])].sort());
    expect(registered).toHaveLength(22);
    expect(new Set(registered).size).toBe(registered?.length);
  });

  it("includes the private-details rule", () => {
    expect(PREFLIGHT_RULESET_REGISTRY.ruleset_libraryAd001).toContain("WORDS_PRIVATE_INFO_REQUEST");
  });

  it("lists the open house ruleset, which runs no library-ad rule", () => {
    const openHouse = rulesetRuleCodes("ruleset_openHouseFounding001");
    expect(openHouse).toHaveLength(15);
    expect(openHouse).not.toContain("WORDS_NUMBER");
    expect(openHouse).toContain("OPEN_HOUSE_DATES_INVALID");
  });

  it("knows no other ruleset", () => {
    expect(rulesetRuleCodes("ruleset_unknown001")).toBeUndefined();
  });
});

describe("the library-ad ruleset (009D-AC-010)", () => {
  it("passes a clean version", () => {
    expect(evaluateCampaignPreflight(cleanManifest(), rules())).toEqual([]);
  });

  it("refuses to check a library ad without its ruleset's context", () => {
    const { libraryAd: _context, ...openHouseShaped } = rules();
    expect(() => evaluateCampaignPreflight(cleanManifest(), openHouseShaped)).toThrow(
      CampaignPolicyError,
    );
  });

  it("refuses words longer than the ad allows, with the limit in the fix", () => {
    const manifest = cleanManifest();
    const findings = evaluateCampaignPreflight(
      {
        ...manifest,
        content: { ...manifest.content, headline: "a".repeat(61), body: "b".repeat(301) },
      },
      rules(),
    );
    expect(findings.filter((finding) => finding.ruleCode === "WORDS_TOO_LONG")).toEqual([
      expect.objectContaining({
        affected: "content.headline",
        remediation: "Shorten the headline to 60 characters or fewer.",
      }),
      expect.objectContaining({
        affected: "content.body",
        remediation: "Shorten the ad text to 300 characters or fewer.",
      }),
    ]);
  });

  it("requires an NMLS number and an Equal Housing line, naming Brand", () => {
    const manifest = cleanManifest();
    const findings = evaluateCampaignPreflight(
      {
        ...manifest,
        content: { ...manifest.content, disclosureText: "Lender disclosures apply." },
        advertiser: { ...manifest.advertiser, nmls: "" },
      },
      rules(),
    );
    expect(findings.map((finding) => [finding.ruleCode, finding.remediation])).toEqual([
      ["NMLS_NUMBER_REQUIRED", "Add your NMLS number in Brand."],
      ["EQUAL_HOUSING_REQUIRED", "Add the Equal Housing line to your disclosure in Brand."],
    ]);
  });

  it("refuses an NMLS number that is not 4 to 12 digits, for the person and the company (verifier, 2026-10-02)", () => {
    const manifest = cleanManifest();
    const short = evaluateCampaignPreflight(
      { ...manifest, advertiser: { ...manifest.advertiser, nmls: "123" } },
      rules(),
    );
    expect(short).toContainEqual(
      expect.objectContaining({
        ruleCode: "NMLS_NUMBER_REQUIRED",
        affected: "advertiser.nmls",
        remediation: "Correct your NMLS number in Brand. It has 4 to 12 digits.",
      }),
    );
    const company = evaluateCampaignPreflight(
      { ...manifest, advertiser: { ...manifest.advertiser, companyNmls: "12" } },
      rules(),
    );
    expect(company).toContainEqual(
      expect.objectContaining({
        ruleCode: "NMLS_NUMBER_REQUIRED",
        affected: "advertiser.companyNmls",
        remediation: "Correct your company's NMLS number in Brand. It has 4 to 12 digits.",
      }),
    );
    for (const nmls of ["1234", "123456789012"]) {
      expect(
        evaluateCampaignPreflight(
          { ...manifest, advertiser: { ...manifest.advertiser, nmls, companyNmls: "" } },
          rules(),
        ).map((finding) => finding.ruleCode),
        nmls,
      ).not.toContain("NMLS_NUMBER_REQUIRED");
    }
  });

  it("refuses an end date that is not after today", () => {
    const manifest = cleanManifest();
    for (const endsAt of ["2026-10-02T23:59:59.000Z", "2026-09-30T23:59:59.000Z"]) {
      const findings = evaluateCampaignPreflight(
        { ...manifest, schedule: { startsAt: null, endsAt } },
        rules(),
      );
      expect(
        findings.map((finding) => [finding.ruleCode, finding.remediation]),
        endsAt,
      ).toEqual([["RUN_DATES_INVALID", "Choose an end date after today."]]);
    }
    expect(
      evaluateCampaignPreflight(
        { ...manifest, schedule: { startsAt: null, endsAt: "2026-10-03T23:59:59.000Z" } },
        rules(),
      ),
    ).toEqual([]);
  });

  it("refuses an ad retired before the check ran", () => {
    const findings = evaluateCampaignPreflight(cleanManifest(), rules({ retiredOn: "2026-10-01" }));
    expect(findings.map((finding) => [finding.ruleCode, finding.remediation])).toEqual([
      ["LIBRARY_AD_RETIRED", "Choose another ad. Your budget, dates and area are kept."],
    ]);
  });

  it("extends TARGETING_NOT_ALLOWED to any stored state or city outside the place rules", () => {
    const manifest = cleanManifest();
    for (const targeting of [
      { regions: ["ZZ"], cities: [] },
      { regions: [], cities: ["Austin, ZZ"] },
      { regions: [], cities: ["Women, TX"] },
      { regions: [], cities: ["Within, TX"] },
      { regions: ["TX", "OK", "NM", "LA", "AR", "KS"], cities: [] },
      { regions: [], cities: [] },
    ]) {
      const codes = evaluateCampaignPreflight(
        {
          ...manifest,
          meta: { ...manifest.meta, targeting: { ...manifest.meta.targeting, ...targeting } },
        },
        rules(),
      ).map((finding) => finding.ruleCode);
      expect(codes, JSON.stringify(targeting)).toEqual(["TARGETING_NOT_ALLOWED"]);
    }
  });

  it("checks every Brand text the ad prints or carries, naming the Brand field", () => {
    const manifest = cleanManifest();
    const findings = evaluateCampaignPreflight(
      {
        ...manifest,
        advertiser: {
          ...manifest.advertiser,
          name: "Alex Morgan, your Realtor",
          title: "Rates expert",
          company: "Acme #5000 Grant Lending",
        },
        content: {
          ...manifest.content,
          disclosureText: "Equal Housing Opportunity. 5% down.",
          consentText: "Enter your date of birth",
        },
      },
      rules(),
    );
    expect(findings.map((finding) => [finding.ruleCode, finding.affected])).toEqual(
      expect.arrayContaining([
        ["WORDS_CO_BRAND", "advertiser.name"],
        ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "advertiser.title"],
        ["WORDS_NUMBER", "advertiser.company"],
        ["WORDS_NUMBER", "content.disclosureText"],
        ["WORDS_PRIVATE_INFO_REQUEST", "content.consentText"],
      ]),
    );
    for (const finding of findings) {
      expect(finding.remediation, finding.ruleCode).toMatch(/in Brand\./u);
    }
  });

  it("leaves the open house ruleset as it was", () => {
    const openHouse = {
      ...cleanManifest(),
      blueprintId: "open-house-boost" as const,
      property: {
        openHouseStartsAt: "2030-06-12T15:00:00.000Z",
        openHouseEndsAt: "2030-06-12T17:00:00.000Z",
        permissionConfirmed: true,
      },
      partner: { permissionConfirmed: true },
      content: { ...cleanManifest().content, headline: "Low rates at 3%" },
    };
    const { libraryAd: _context, ...openHouseRules } = rules();
    expect(evaluateCampaignPreflight(openHouse, openHouseRules)).toEqual([]);
  });
});

describe("the web application's ruleset reference", () => {
  it("is the registry's library-ad key, so a saved version's count reads the right entry", async () => {
    const { LIBRARY_AD_RULESET_VERSION_REF } =
      await import("../../../../apps/web/src/features/ads-library/server/library-ad-ruleset.js");
    expect(LIBRARY_AD_RULESET_VERSION_REF).toBe(LIBRARY_AD_RULESET_REF);
    expect(rulesetRuleCodes(LIBRARY_AD_RULESET_VERSION_REF)).toBeDefined();
  });
});
