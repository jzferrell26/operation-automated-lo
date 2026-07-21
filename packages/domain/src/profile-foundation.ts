type ProfileType = "brand" | "compliance" | "partner" | "routing";
type ProfileField =
  | "brand_name"
  | "brand_voice"
  | "brand_tone"
  | "brand_pattern"
  | "brand_framework"
  | "signature_language"
  | "banned_language"
  | "logo_asset_ref"
  | "license_number"
  | "nmls_id"
  | "lender_name"
  | "disclosure_text"
  | "consent_text"
  | "claim_policy"
  | "realtor_name"
  | "realtor_contact"
  | "realtor_permission"
  | "property_permission";

interface ProfileVersion {
  readonly locationRef: string;
  readonly profileType: ProfileType;
  readonly values: Partial<
    Record<
      ProfileField,
      { readonly confirmation: "user-confirmed" | "imported-unconfirmed" | "model-suggested" }
    >
  >;
  readonly providerMappings: readonly {
    readonly mappingType: "pipeline" | "calendar" | "user" | "workflow" | "field" | "tag";
    readonly validationStatus: "valid" | "missing" | "stale";
  }[];
  readonly assets: readonly {
    readonly assetRef: string;
    readonly approvalStatus: "pending" | "approved" | "rejected" | "quarantined";
    readonly visibility: "private";
    readonly metadataStripped: true;
  }[];
  readonly attestation?: unknown;
}

interface ProfileReadinessContext {
  readonly channels: readonly ("public-page" | "pdf" | "meta" | "email-sms" | "ghl-routing")[];
  readonly lenderRequiredFields: readonly ProfileField[];
  readonly policyRequiredFields: readonly ProfileField[];
}

interface ProfileReadinessResult {
  readonly ready: boolean;
  readonly missingFields: ProfileField[];
  readonly invalidMappings: ("pipeline" | "calendar" | "user" | "workflow" | "field" | "tag")[];
  readonly invalidAssetRefs: string[];
  readonly blockingReasons: (
    "profile-type-missing" | "attestation-missing" | "approved-asset-missing"
  )[];
  readonly legalApprovalClaimed: false;
}

const profileFieldOwnership: Readonly<Record<ProfileType, ReadonlySet<ProfileField>>> = {
  brand: new Set([
    "brand_name",
    "brand_voice",
    "brand_tone",
    "brand_pattern",
    "brand_framework",
    "signature_language",
    "banned_language",
    "logo_asset_ref",
  ]),
  compliance: new Set([
    "license_number",
    "nmls_id",
    "lender_name",
    "disclosure_text",
    "consent_text",
    "claim_policy",
  ]),
  partner: new Set([
    "realtor_name",
    "realtor_contact",
    "realtor_permission",
    "property_permission",
  ]),
  routing: new Set(),
};

const baseRequirements: readonly ProfileField[] = [
  "brand_name",
  "license_number",
  "nmls_id",
  "lender_name",
  "disclosure_text",
  "realtor_name",
  "realtor_permission",
  "property_permission",
];

export class ProfilePolicyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ProfilePolicyError";
  }
}

export function assertProfileFieldOwnership(version: ProfileVersion): void {
  const allowedFields = profileFieldOwnership[version.profileType] ?? new Set<ProfileField>();
  const unexpected = Object.keys(version.values).filter(
    (field) => !allowedFields.has(field as ProfileField),
  );
  if (unexpected.length > 0) {
    throw new ProfilePolicyError(
      `${version.profileType} profile contains fields owned by another profile: ${unexpected.join(", ")}`,
    );
  }
  if (version.profileType === "routing" && version.providerMappings.length === 0) {
    throw new ProfilePolicyError("Routing profiles require provider mappings");
  }
}

export function assertProfileCanBecomeCurrent(version: ProfileVersion): void {
  assertProfileFieldOwnership(version);
  if (version.attestation === undefined) {
    throw new ProfilePolicyError("A current profile requires an explicit user attestation");
  }
  const unconfirmedFields = (Object.keys(version.values) as ProfileField[]).filter(
    (field) => version.values[field]?.confirmation !== "user-confirmed",
  );
  if (unconfirmedFields.length > 0) {
    throw new ProfilePolicyError(
      `Current profiles cannot contain inferred or unconfirmed fields: ${unconfirmedFields.join(", ")}`,
    );
  }
}

function requirementsFor(context: ProfileReadinessContext): ReadonlySet<ProfileField> {
  const required = new Set<ProfileField>([
    ...baseRequirements,
    ...context.lenderRequiredFields,
    ...context.policyRequiredFields,
  ]);
  if (context.channels.some((channel) => ["public-page", "email-sms"].includes(channel))) {
    required.add("consent_text");
  }
  if (context.channels.some((channel) => ["public-page", "pdf", "meta"].includes(channel))) {
    required.add("logo_asset_ref");
  }
  return required;
}

export function evaluateProfileReadiness(
  versions: readonly ProfileVersion[],
  context: ProfileReadinessContext,
): ProfileReadinessResult {
  const locationRefs = new Set(versions.map((version) => version.locationRef));
  if (locationRefs.size > 1) {
    throw new ProfilePolicyError("Readiness cannot combine profiles from multiple locations");
  }

  const requiredProfileTypes = new Set<ProfileType>(["brand", "compliance", "partner"]);
  if (context.channels.includes("ghl-routing")) requiredProfileTypes.add("routing");
  const presentProfileTypes = new Set(versions.map((version) => version.profileType));
  const blockingReasons: ProfileReadinessResult["blockingReasons"] = [];
  if ([...requiredProfileTypes].some((type) => !presentProfileTypes.has(type))) {
    blockingReasons.push("profile-type-missing");
  }
  if (versions.some((version) => version.attestation === undefined)) {
    blockingReasons.push("attestation-missing");
  }

  const confirmed = new Set<ProfileField>();
  for (const version of versions) {
    assertProfileFieldOwnership(version);
    for (const field of Object.keys(version.values) as ProfileField[]) {
      if (version.values[field]?.confirmation === "user-confirmed") confirmed.add(field);
    }
  }
  const missingFields = [...requirementsFor(context)].filter((field) => !confirmed.has(field));

  const mappings = versions.flatMap((version) => version.providerMappings);
  const requiredMappingTypes = context.channels.includes("ghl-routing")
    ? (["pipeline", "user", "workflow", "field", "tag"] as const)
    : ([] as const);
  const invalidMappings = requiredMappingTypes.filter(
    (mappingType) =>
      !mappings.some(
        (mapping) => mapping.mappingType === mappingType && mapping.validationStatus === "valid",
      ),
  );

  const assets = versions.flatMap((version) => version.assets);
  const approvedAssets = assets.filter((asset) => asset.approvalStatus === "approved");
  const requiresAsset = requirementsFor(context).has("logo_asset_ref");
  if (requiresAsset && approvedAssets.length === 0) {
    blockingReasons.push("approved-asset-missing");
  }
  const invalidAssetRefs = assets
    .filter(
      (asset) =>
        asset.approvalStatus !== "approved" ||
        asset.visibility !== "private" ||
        !asset.metadataStripped,
    )
    .map((asset) => asset.assetRef);

  return Object.freeze({
    ready:
      missingFields.length === 0 &&
      invalidMappings.length === 0 &&
      invalidAssetRefs.length === 0 &&
      blockingReasons.length === 0,
    missingFields,
    invalidMappings,
    invalidAssetRefs,
    blockingReasons,
    legalApprovalClaimed: false,
  });
}

export function assertBrandSampleClassification(
  input: Readonly<{
    containsBorrowerData: boolean;
    containsApplicationData: boolean;
    containsCreditData: boolean;
    containsIncomeData: boolean;
    containsBankData: boolean;
    containsSocialSecurityData: boolean;
    containsPrivateCrmData: boolean;
  }>,
): "accepted" | "quarantined" {
  return Object.values(input).some(Boolean) ? "quarantined" : "accepted";
}
