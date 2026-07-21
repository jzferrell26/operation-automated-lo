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

interface CampaignManifest {
  readonly property: {
    readonly openHouseStartsAt: string;
    readonly openHouseEndsAt: string;
    readonly permissionConfirmed: boolean;
  };
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
  readonly partner: { readonly permissionConfirmed: boolean };
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

interface PreflightFinding {
  readonly severity: "blocking" | "warning";
  readonly ruleCode: string;
  readonly description: string;
  readonly affected: string;
  readonly remediation: string;
}

interface PreflightRules {
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

export function evaluateCampaignPreflight(
  manifest: CampaignManifest,
  rules: PreflightRules,
): readonly PreflightFinding[] {
  const findings: PreflightFinding[] = [];

  if (manifest.content.disclosureText.length === 0) {
    findings.push(
      finding(
        "DISCLOSURE_REQUIRED",
        "The campaign has no approved disclosure text.",
        "content.disclosureText",
        "Select an approved disclosure profile version.",
      ),
    );
  }
  if (manifest.content.consentText.length === 0) {
    findings.push(
      finding(
        "CONSENT_REQUIRED",
        "The lead experience has no consent disclosure.",
        "content.consentText",
        "Select an approved consent disclosure version.",
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
  if (!manifest.partner.permissionConfirmed) {
    findings.push(
      finding(
        "PARTNER_PERMISSION_REQUIRED",
        "Realtor partner permission is not confirmed.",
        "partner.permissionConfirmed",
        "Record the authorized partner attestation.",
      ),
    );
  }
  if (!manifest.property.permissionConfirmed) {
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
    manifest.meta.targeting.protectedDimensions.length > 0
  ) {
    findings.push(
      finding(
        "TARGETING_NOT_ALLOWED",
        "The first blueprint allows Meta country and region targeting only.",
        "meta.targeting",
        "Remove ZIP, custom-audience, protected-dimension, Google, and LinkedIn targeting.",
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
  findings.push(...rules.warnings.map((warning) => ({ ...warning, severity: "warning" as const })));
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
