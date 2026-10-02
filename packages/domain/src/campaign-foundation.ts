import { libraryAdPlacesProblem } from "./library-ad-places.js";
import {
  evaluateLibraryAdRules,
  type LibraryAdRuleContext,
  type LibraryAdRuleInput,
} from "./library-ad-ruleset.js";

type CampaignState =
  | "draft"
  | "generated"
  | "preflight_failed"
  | "awaiting_approval"
  | "approved"
  | "publishing"
  | "live"
  | "paused"
  | "completed"
  | "archived";

/**
 * The fields every blueprint shares. PRD-009c D5 makes the manifest a union on `blueprintId`; the
 * rules that read only these fields run for both blueprints, and the rules that read a property or
 * a partner run only for `open-house-boost`.
 */
interface CampaignManifestCommon {
  readonly content: {
    readonly headline: string;
    readonly body: string;
    readonly disclosureText: string;
    readonly consentText: string;
    readonly mergeTokens: readonly string[];
    readonly claims: readonly string[];
    readonly financingTerms: readonly string[];
  };
  readonly images: readonly {
    readonly approvalStatus: "approved" | "pending" | "rejected" | "quarantined";
    readonly width: number;
    readonly height: number;
  }[];
  readonly meta: {
    readonly enabled: boolean;
    readonly specialAdCategory: "HOUSING" | "NONE";
    readonly platform: "meta" | "google" | "linkedin";
    readonly targeting: {
      readonly zipCodes: readonly string[];
      readonly customAudienceRefs: readonly string[];
      readonly protectedDimensions: readonly string[];
    };
    readonly dailyBudgetMinor: number;
    readonly totalBudgetMinor: number;
  };
  readonly routing: { readonly validationStatus: "valid" | "missing" | "stale" };
}

interface OpenHouseCampaignManifest extends CampaignManifestCommon {
  readonly blueprintId: "open-house-boost";
  readonly property: {
    readonly openHouseStartsAt: string;
    readonly openHouseEndsAt: string;
    readonly permissionConfirmed: boolean;
  };
  readonly partner: { readonly permissionConfirmed: boolean };
}

interface LibraryAdCampaignManifest extends CampaignManifestCommon {
  readonly blueprintId: "library-ad";
  readonly advertiser: LibraryAdRuleInput["advertiser"];
  readonly schedule: LibraryAdRuleInput["schedule"];
  readonly meta: CampaignManifestCommon["meta"] & {
    readonly targeting: CampaignManifestCommon["meta"]["targeting"] & {
      readonly regions: readonly string[];
      readonly cities: readonly string[];
    };
  };
}

type CampaignManifest = OpenHouseCampaignManifest | LibraryAdCampaignManifest;

interface PreflightFinding {
  readonly severity: "blocking" | "warning";
  readonly ruleCode: string;
  readonly description: string;
  readonly affected: string;
  readonly remediation: string;
}

interface PreflightRules {
  readonly evaluatedAt: string;
  readonly minimumImageWidth: number;
  readonly minimumImageHeight: number;
  readonly earliestStartAt: string;
  readonly allowedMergeTokens: readonly string[];
  readonly bannedPhrases: readonly string[];
  readonly allowedClaims: readonly string[];
  readonly allowsFinancingTerms: boolean;
  readonly minimumDailyBudgetMinor: number;
  readonly maximumDailyBudgetMinor: number;
  readonly maximumTotalBudgetMinor: number;
  readonly warnings: readonly Omit<PreflightFinding, "severity">[];
  /** PRD-009d D5. Present exactly when the rules are the library-ad ruleset's. */
  readonly libraryAd?: LibraryAdRuleContext | undefined;
}

interface CampaignVersion {
  readonly locationRef: string;
  readonly campaignVersionRef: string;
  readonly manifestHash: string;
}

interface PreflightResult {
  readonly blocking: boolean;
  readonly campaignVersionRef: string;
  readonly manifestHash: string;
  readonly resultHash: string;
  readonly rulesetVersionRef: string;
  readonly inputVersions: { readonly rulesetVersionRef: string };
}

interface ApprovalDecision {
  readonly actorRole: "location_admin" | "approver" | "realtor_approver" | "lender_approver";
  readonly decision: "approved" | "rejected";
  readonly campaignVersionRef: string;
  readonly manifestHash: string;
  readonly preflightResultHash: string;
}

interface ApprovalLinkClaims {
  readonly locationRef: string;
  readonly campaignVersionRef: string;
  readonly expiresAt: string;
  readonly redeemedAt?: string | undefined;
}

interface PaidAdBrandBoundaryInput {
  readonly collateral: {
    readonly content: {
      readonly realtorIdentity: {
        readonly displayName: string;
        readonly logoAssetRef?: string | undefined;
        readonly imageAssetRef?: string | undefined;
        readonly contactInformation?:
          | Readonly<{
              phone?: string | undefined;
              email?: string | undefined;
              websiteUrl?: string | undefined;
            }>
          | undefined;
      };
    };
  };
  readonly paidAd: {
    readonly advertiserIdentity: {
      readonly displayName: string;
      readonly logoAssetRef?: string | undefined;
      readonly imageAssetRef?: string | undefined;
      readonly contactInformation?:
        | Readonly<{
            phone?: string | undefined;
            email?: string | undefined;
            websiteUrl?: string | undefined;
          }>
        | undefined;
    };
    readonly copy: {
      readonly primaryText: string;
      readonly headline: string;
      readonly description: string;
    };
    readonly creative: {
      readonly headline: string;
      readonly body: string;
      readonly callToActionLabel: string;
      readonly propertyImageAssetRefs: readonly string[];
      readonly identityAssetRefs: readonly string[];
      readonly disclosureBlocks: readonly string[];
    };
    readonly leadForm: {
      readonly headline: string;
      readonly description: string;
      readonly callToActionLabel: string;
      readonly privacyPolicyUrl: string;
    };
  };
  readonly rules: {
    readonly realtorIdentityValues: readonly string[];
    readonly brokerageMarks: readonly string[];
    readonly coBrandPhrases: readonly string[];
    readonly prohibitedContactValues: readonly string[];
    readonly realtorAssetRefs: readonly string[];
    readonly allowedPaidAdIdentityAssetRefs: readonly string[];
    readonly allowedPropertyImageAssetRefs: readonly string[];
  };
}

const transitions: Readonly<Record<CampaignState, ReadonlySet<CampaignState>>> = {
  draft: new Set(["generated", "archived"]),
  generated: new Set(["preflight_failed", "awaiting_approval", "archived"]),
  preflight_failed: new Set(["generated", "archived"]),
  awaiting_approval: new Set(["approved", "generated", "archived"]),
  approved: new Set(["publishing", "generated", "archived"]),
  publishing: new Set(["live", "approved", "archived"]),
  live: new Set(["paused", "completed", "archived"]),
  paused: new Set(["live", "completed", "archived"]),
  completed: new Set(["archived"]),
  archived: new Set(),
};

export class CampaignPolicyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CampaignPolicyError";
  }
}

function finding(
  ruleCode: string,
  description: string,
  affected: string,
  remediation: string,
): PreflightFinding {
  return { severity: "blocking", ruleCode, description, affected, remediation };
}

/**
 * PRD-009d D5. A library ad's disclosure and lead form wording come from the person's own Brand, so
 * the shared rules' fixes say where to make the change. An open house version keeps its sentences.
 */
const LIBRARY_AD_SHARED_FIXES = Object.freeze({
  DISCLOSURE_REQUIRED: "Add your disclosure line in Brand.",
  CONSENT_REQUIRED: "Add your lead form wording in Brand.",
  TARGETING_NOT_ALLOWED: "Choose one or more cities or states, and nothing else.",
});

function libraryAdContext(manifest: CampaignManifest, rules: PreflightRules) {
  if (manifest.blueprintId !== "library-ad") return undefined;
  if (rules.libraryAd === undefined) {
    throw new CampaignPolicyError("A library ad is checked only with the library-ad ruleset");
  }
  return rules.libraryAd;
}

export function evaluateCampaignPreflight(
  manifest: CampaignManifest,
  rules: PreflightRules,
): readonly PreflightFinding[] {
  const libraryAd = libraryAdContext(manifest, rules);
  const findings: PreflightFinding[] = [];

  if (manifest.content.disclosureText.length === 0) {
    findings.push(
      finding(
        "DISCLOSURE_REQUIRED",
        "The campaign has no approved disclosure text.",
        "content.disclosureText",
        libraryAd === undefined
          ? "Select an approved disclosure profile version."
          : LIBRARY_AD_SHARED_FIXES.DISCLOSURE_REQUIRED,
      ),
    );
  }
  if (manifest.content.consentText.length === 0) {
    findings.push(
      finding(
        "CONSENT_REQUIRED",
        "The lead experience has no consent disclosure.",
        "content.consentText",
        libraryAd === undefined
          ? "Select an approved consent disclosure version."
          : LIBRARY_AD_SHARED_FIXES.CONSENT_REQUIRED,
      ),
    );
  }
  if (manifest.images.some((image) => image.approvalStatus !== "approved")) {
    findings.push(
      finding(
        "IMAGE_NOT_APPROVED",
        "Every source image must be approved before campaign approval.",
        "images",
        "Remove or approve pending, rejected, and quarantined images.",
      ),
    );
  }
  if (
    manifest.images.some(
      (image) => image.width < rules.minimumImageWidth || image.height < rules.minimumImageHeight,
    )
  ) {
    findings.push(
      finding(
        "IMAGE_QUALITY_LOW",
        "A source image is below the minimum pixel dimensions.",
        "images",
        "Upload an image that meets the active ruleset dimensions.",
      ),
    );
  }
  if (manifest.blueprintId === "open-house-boost") {
    const startsAt = new Date(manifest.property.openHouseStartsAt).getTime();
    const endsAt = new Date(manifest.property.openHouseEndsAt).getTime();
    if (endsAt <= startsAt || startsAt < new Date(rules.earliestStartAt).getTime()) {
      findings.push(
        finding(
          "OPEN_HOUSE_DATES_INVALID",
          "The open-house dates are expired or out of order.",
          "property.openHouseStartsAt",
          "Choose a future start time and an end time after the start.",
        ),
      );
    }
  }
  const campaignText = `${manifest.content.headline}\n${manifest.content.body}`.toLocaleLowerCase(
    "en",
  );
  const bannedPhrase = rules.bannedPhrases.find((phrase) =>
    campaignText.includes(phrase.toLocaleLowerCase("en")),
  );
  if (bannedPhrase !== undefined) {
    findings.push(
      finding(
        "BRAND_BANNED_PHRASE",
        "Campaign copy contains language prohibited by the confirmed brand rules.",
        "content",
        `Remove the prohibited phrase: ${bannedPhrase}`,
      ),
    );
  }
  const disallowedToken = manifest.content.mergeTokens.find(
    (token) => !rules.allowedMergeTokens.includes(token),
  );
  if (disallowedToken !== undefined) {
    findings.push(
      finding(
        "MERGE_TOKEN_NOT_ALLOWED",
        "Campaign copy contains a merge token outside the allowlist.",
        "content.mergeTokens",
        `Remove or approve the merge token: ${disallowedToken}`,
      ),
    );
  }
  const unapprovedClaim = manifest.content.claims.find(
    (claim) => !rules.allowedClaims.includes(claim),
  );
  if (unapprovedClaim !== undefined) {
    findings.push(
      finding(
        "CLAIM_POLICY_BLOCKED",
        "Campaign copy contains a claim outside the approved claim policy.",
        "content.claims",
        "Remove the claim or obtain an explicit tenant policy approval.",
      ),
    );
  }
  if (manifest.content.financingTerms.length > 0 && !rules.allowsFinancingTerms) {
    findings.push(
      finding(
        "FINANCING_TERMS_BLOCKED",
        "The initial blueprint does not permit rate, APR, payment, or program terms.",
        "content.financingTerms",
        "Remove financing terms or activate an explicitly approved tenant rule.",
      ),
    );
  }
  if (manifest.blueprintId === "open-house-boost" && !manifest.partner.permissionConfirmed) {
    findings.push(
      finding(
        "PARTNER_PERMISSION_REQUIRED",
        "Realtor partner permission is not confirmed.",
        "partner.permissionConfirmed",
        "Record the authorized partner attestation.",
      ),
    );
  }
  if (manifest.blueprintId === "open-house-boost" && !manifest.property.permissionConfirmed) {
    findings.push(
      finding(
        "PROPERTY_PERMISSION_REQUIRED",
        "Property-use permission is not confirmed.",
        "property.permissionConfirmed",
        "Record the authorized property attestation.",
      ),
    );
  }
  if (manifest.meta.enabled && manifest.meta.specialAdCategory !== "HOUSING") {
    findings.push(
      finding(
        "META_HOUSING_CATEGORY_REQUIRED",
        "Housing promotion must use the Meta Housing Special Ad Category.",
        "meta.specialAdCategory",
        "Set the approved Housing category before launch.",
      ),
    );
  }
  if (
    manifest.meta.platform !== "meta" ||
    manifest.meta.targeting.zipCodes.length > 0 ||
    manifest.meta.targeting.customAudienceRefs.length > 0 ||
    manifest.meta.targeting.protectedDimensions.length > 0 ||
    // PRD-009d D4: a library ad's stored states and cities must be ones the request schema would
    // have produced, so a ZIP code, a radius, or a demographic never reaches a saved version.
    (manifest.blueprintId === "library-ad" &&
      libraryAdPlacesProblem({
        states: manifest.meta.targeting.regions,
        cities: manifest.meta.targeting.cities,
      }) !== undefined)
  ) {
    findings.push(
      finding(
        "TARGETING_NOT_ALLOWED",
        "The first blueprint allows Meta country and region targeting only.",
        "meta.targeting",
        libraryAd === undefined
          ? "Remove ZIP, custom-audience, protected-dimension, Google, and LinkedIn targeting."
          : LIBRARY_AD_SHARED_FIXES.TARGETING_NOT_ALLOWED,
      ),
    );
  }
  if (
    manifest.meta.dailyBudgetMinor < rules.minimumDailyBudgetMinor ||
    manifest.meta.dailyBudgetMinor > rules.maximumDailyBudgetMinor ||
    manifest.meta.totalBudgetMinor > rules.maximumTotalBudgetMinor
  ) {
    findings.push(
      finding(
        "BUDGET_OUT_OF_BOUNDS",
        "Campaign budget is outside the approved tenant bounds.",
        "meta.dailyBudgetMinor",
        "Choose a daily and total budget within the active ruleset.",
      ),
    );
  }
  if (manifest.routing.validationStatus !== "valid") {
    findings.push(
      finding(
        "GHL_ROUTING_INCOMPLETE",
        "HighLevel routing mappings are missing or stale.",
        "routing.mappingVersionRef",
        "Reconnect and revalidate the selected routing objects.",
      ),
    );
  }
  if (manifest.blueprintId === "library-ad" && libraryAd !== undefined) {
    findings.push(...evaluateLibraryAdRules(manifest, libraryAd, rules.evaluatedAt));
  }
  findings.push(...rules.warnings.map((warning) => ({ ...warning, severity: "warning" as const })));
  return Object.freeze(findings);
}

function normalizedText(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function contactValues(
  contact:
    | Readonly<{
        phone?: string | undefined;
        email?: string | undefined;
        websiteUrl?: string | undefined;
      }>
    | undefined,
): readonly string[] {
  if (contact === undefined) return [];
  return [contact.phone, contact.email, contact.websiteUrl].filter(
    (value): value is string => value !== undefined,
  );
}

export function evaluatePaidAdBrandBoundary(
  input: PaidAdBrandBoundaryInput,
): readonly PreflightFinding[] {
  const realtor = input.collateral.content.realtorIdentity;
  const prohibitedText = [
    realtor.displayName,
    ...contactValues(realtor.contactInformation),
    ...input.rules.realtorIdentityValues,
    ...input.rules.brokerageMarks,
    ...input.rules.coBrandPhrases,
    ...input.rules.prohibitedContactValues,
  ]
    .map(normalizedText)
    .filter((value) => value.length > 0);
  const textSurfaces = [
    ["paidAd.advertiserIdentity.displayName", input.paidAd.advertiserIdentity.displayName],
    [
      "paidAd.advertiserIdentity.contactInformation",
      contactValues(input.paidAd.advertiserIdentity.contactInformation).join(" "),
    ],
    ["paidAd.copy.primaryText", input.paidAd.copy.primaryText],
    ["paidAd.copy.headline", input.paidAd.copy.headline],
    ["paidAd.copy.description", input.paidAd.copy.description],
    ["paidAd.creative.headline", input.paidAd.creative.headline],
    ["paidAd.creative.body", input.paidAd.creative.body],
    ["paidAd.creative.callToActionLabel", input.paidAd.creative.callToActionLabel],
    ["paidAd.creative.disclosureBlocks", input.paidAd.creative.disclosureBlocks.join(" ")],
    ["paidAd.leadForm.headline", input.paidAd.leadForm.headline],
    ["paidAd.leadForm.description", input.paidAd.leadForm.description],
    ["paidAd.leadForm.callToActionLabel", input.paidAd.leadForm.callToActionLabel],
    ["paidAd.leadForm.privacyPolicyUrl", input.paidAd.leadForm.privacyPolicyUrl],
  ] as const;
  const findings: PreflightFinding[] = [];
  for (const [affected, value] of textSurfaces) {
    const normalizedValue = normalizedText(value);
    if (prohibitedText.some((prohibited) => normalizedValue.includes(prohibited))) {
      findings.push(
        finding(
          "PAID_AD_REALTOR_IDENTITY",
          "Paid-ad presentation contains Realtor, brokerage, contact, or co-brand language.",
          affected,
          "Remove Realtor and brokerage identity from the lender-branded paid-ad projection.",
        ),
      );
    }
  }

  const prohibitedAssets = new Set(
    [realtor.logoAssetRef, realtor.imageAssetRef, ...input.rules.realtorAssetRefs].filter(
      (value): value is string => value !== undefined,
    ),
  );
  const assetSurfaces = [
    ["paidAd.advertiserIdentity.logoAssetRef", input.paidAd.advertiserIdentity.logoAssetRef],
    ["paidAd.advertiserIdentity.imageAssetRef", input.paidAd.advertiserIdentity.imageAssetRef],
    ...input.paidAd.creative.identityAssetRefs.map(
      (assetRef) => ["paidAd.creative.identityAssetRefs", assetRef] as const,
    ),
    ...input.paidAd.creative.propertyImageAssetRefs.map(
      (assetRef) => ["paidAd.creative.propertyImageAssetRefs", assetRef] as const,
    ),
  ] as const;
  for (const [affected, assetRef] of assetSurfaces) {
    if (assetRef !== undefined && prohibitedAssets.has(assetRef)) {
      findings.push(
        finding(
          "PAID_AD_REALTOR_ASSET",
          "Paid-ad creative contains a Realtor image, logo, brokerage mark, or dual-brand asset.",
          affected,
          "Use only approved loan-officer or lender identity assets in paid advertising.",
        ),
      );
    }
  }

  const allowedIdentityAssets = new Set(input.rules.allowedPaidAdIdentityAssetRefs);
  for (const [affected, assetRef] of [
    ["paidAd.advertiserIdentity.logoAssetRef", input.paidAd.advertiserIdentity.logoAssetRef],
    ["paidAd.advertiserIdentity.imageAssetRef", input.paidAd.advertiserIdentity.imageAssetRef],
    ...input.paidAd.creative.identityAssetRefs.map(
      (assetRef) => ["paidAd.creative.identityAssetRefs", assetRef] as const,
    ),
  ] as const) {
    if (assetRef !== undefined && !allowedIdentityAssets.has(assetRef)) {
      findings.push(
        finding(
          "PAID_AD_IDENTITY_ASSET_NOT_APPROVED",
          "Paid-ad creative contains an identity asset that is not approved for the lender-branded ad.",
          affected,
          "Use only identity assets approved for the loan officer or lender paid-ad projection.",
        ),
      );
    }
  }

  const allowedPropertyAssets = new Set(input.rules.allowedPropertyImageAssetRefs);
  if (input.paidAd.creative.propertyImageAssetRefs.some((ref) => !allowedPropertyAssets.has(ref))) {
    findings.push(
      finding(
        "PAID_AD_PROPERTY_ASSET_NOT_APPROVED",
        "Paid-ad creative contains a property image that is not approved for this campaign.",
        "paidAd.creative.propertyImageAssetRefs",
        "Use only approved property images from the immutable campaign version.",
      ),
    );
  }

  const paidContact = contactValues(input.paidAd.advertiserIdentity.contactInformation);
  const realtorContact = new Set(
    [...contactValues(realtor.contactInformation), ...input.rules.prohibitedContactValues].map(
      normalizedText,
    ),
  );
  if (paidContact.some((value) => realtorContact.has(normalizedText(value)))) {
    findings.push(
      finding(
        "PAID_AD_REALTOR_CONTACT",
        "Paid-ad advertiser identity contains Realtor or brokerage contact information.",
        "paidAd.advertiserIdentity.contactInformation",
        "Use only the loan officer or lender contact channels approved for paid advertising.",
      ),
    );
  }
  return Object.freeze(findings);
}

export function assertCampaignTransition(from: CampaignState, to: CampaignState): void {
  if (!(transitions[from] ?? new Set<CampaignState>()).has(to)) {
    throw new CampaignPolicyError(`Invalid campaign transition: ${from} -> ${to}`);
  }
}

export function validateApprovalLink(
  claims: ApprovalLinkClaims,
  expected: Readonly<{ locationRef: string; campaignVersionRef: string; now: Date }>,
): void {
  if (
    claims.locationRef !== expected.locationRef ||
    claims.campaignVersionRef !== expected.campaignVersionRef ||
    new Date(claims.expiresAt).getTime() <= expected.now.getTime() ||
    claims.redeemedAt !== undefined
  ) {
    throw new CampaignPolicyError("Approval link is expired, redeemed, or outside its purpose");
  }
}

export function assertPublishFreshness(
  input: Readonly<{
    campaignVersion: CampaignVersion;
    preflight: PreflightResult;
    approvals: readonly ApprovalDecision[];
    requiredApprovalRoles: readonly ApprovalDecision["actorRole"][];
  }>,
): void {
  const { campaignVersion, preflight, approvals } = input;
  if (
    preflight.blocking ||
    preflight.campaignVersionRef !== campaignVersion.campaignVersionRef ||
    preflight.manifestHash !== campaignVersion.manifestHash ||
    preflight.inputVersions.rulesetVersionRef !== preflight.rulesetVersionRef
  ) {
    throw new CampaignPolicyError("Publish preflight is blocked or stale");
  }
  for (const role of input.requiredApprovalRoles) {
    if (
      !approvals.some(
        (approval) =>
          approval.actorRole === role &&
          approval.decision === "approved" &&
          approval.campaignVersionRef === campaignVersion.campaignVersionRef &&
          approval.manifestHash === campaignVersion.manifestHash &&
          approval.preflightResultHash === preflight.resultHash,
      )
    ) {
      throw new CampaignPolicyError(`Required ${role} approval is missing or stale`);
    }
  }
}

export function assertCampaignVersionTenant(
  version: CampaignVersion,
  locationRef: string,
): CampaignVersion {
  if (version.locationRef !== locationRef) {
    throw new CampaignPolicyError("Campaign version is outside the active location");
  }
  return version;
}

export function preflightHasOnlyDeterministicInputs(
  _manifest: CampaignManifest,
  _rules: PreflightRules,
): boolean {
  return true;
}
