import { randomUUID, createHash } from "node:crypto";
import {
  canonicalCampaignHash as hash,
  calculateFinancingComparison,
} from "../../application/dist/index.js";
import {
  FinancingCampaignManifestSchema,
  FinancingReleaseResolvedSourceSchema,
} from "../../contracts/dist/index.js";

// Synthetic financial/permission evidence only. Never a lender or public output qualification.
export function financingSourceFixture(principal, lifetime = 86400000) {
  const suffix = randomUUID().replaceAll("-", "");
  const issued = new Date(Date.now() - 3600000).toISOString();
  const expires = new Date(Date.now() + lifetime).toISOString();
  const proof = (name, contentHash = hash(name)) => ({
    recordRef: `evidence_${name}${suffix}`,
    revisionRef: `revision_${suffix}`,
    locationRef: principal.locationRef,
    contentHash,
    verificationRef: `verification_${name}${suffix}`,
    verifiedBy: principal.actorRef,
    verifiedAt: issued,
    issuedAt: issued,
    expiresAt: expires,
    revokedAt: null,
    channels: ["site", "pdf"],
  });
  const financing = {
    purchasePriceMinor: 40000000,
    housing: {
      propertyTaxMinor: 40000,
      homeownersInsuranceMinor: 12000,
      hoaMinor: 0,
      otherMinor: 0,
    },
    scenarios: [
      {
        id: randomUUID(),
        label: "Synthetic fixed purchase",
        program: "conventional",
        structure: "fixed-purchase",
        termMonths: 360,
        downPaymentBps: 2000,
        quote: {
          noteRateMilliPercent: 6000,
          aprMilliPercent: 6250,
          source: "Synthetic qualification",
          quotedAt: issued,
          expiresAt: expires,
          confirmed: true,
        },
        upfrontFee: { amountMinor: 0, treatment: "none" },
        monthlyMortgageInsuranceMinor: 0,
        costs: [],
        costsComplete: true,
        sellerCreditMinor: 0,
        lenderCreditMinor: 0,
        depositMinor: 0,
        assumptions: "Synthetic supplied assumptions.",
      },
    ],
  };
  const identity = {
    name: "Synthetic LO",
    company: "Synthetic lender",
    phone: "",
    email: "lo@example.invalid",
    license: "12345",
  };
  const partner = {
    ...identity,
    name: "Synthetic partner",
    company: "Synthetic realty",
    email: "partner@example.invalid",
  };
  const manifest = FinancingCampaignManifestSchema.parse({
    schemaVersion: 1,
    blueprintId: "financing-comparison",
    templateVersion: "1.0.0",
    preparation: {
      schemaVersion: 1,
      status: "draft",
      requestHash: hash("private"),
      brand: {
        name: "Synthetic LO",
        title: "",
        company: "Synthetic lender",
        nmls: "12345",
        companyNmls: "12345",
        colorPresetId: "brand-blue",
      },
      partnerRecordId: randomUUID(),
      partnerCompany: "Synthetic realty",
    },
    property: {
      address: "1 Synthetic Lane",
      description: "Synthetic property.",
      stateCode: "TX",
      permissionConfirmed: false,
    },
    partner: { realtorDisplayName: partner.name, permissionConfirmed: false },
    identities: { lender: identity, realtor: partner },
    financing,
    calculated: calculateFinancingComparison(financing),
    reviewOnly: true,
    content: {
      headline: "Private illustration",
      callToAction: "Private review",
      disclosureText: "Private disclosure",
      consentText: "No collection",
      body: "Private draft",
      claims: [],
      mergeTokens: [],
      financingTerms: [],
    },
    images: [],
    meta: {
      enabled: false,
      specialAdCategory: "HOUSING",
      platform: "meta",
      targeting: {
        country: "US",
        regions: [],
        zipCodes: [],
        customAudienceRefs: [],
        protectedDimensions: [],
      },
      dailyBudgetMinor: 0,
      totalBudgetMinor: 0,
    },
    routing: { mappingVersionRef: "routing_private001", validationStatus: "missing" },
  });
  const disclosureText = "Synthetic verified disclosure, not an actual lender approval.";
  const consentText =
    "I agree to contact about this inquiry. Temporary plugin data expires after 30 days.";
  const scenario = financing.scenarios[0];
  const scenarioHash = hash({
    purchasePriceMinor: financing.purchasePriceMinor,
    housing: financing.housing,
    scenario,
  });
  const routingProfileVersionRef = `routing_${suffix}`,
    highlevelLocationRef = `ghllocation_${suffix}`,
    consentVersionRef = `consent_${suffix}`;
  const canonicalOrigin = "https://property.example.invalid",
    bindingRef = `hostbinding_${suffix}`;
  return FinancingReleaseResolvedSourceSchema.parse({
    sourceVersion: {
      schemaVersion: 1,
      locationRef: principal.locationRef,
      campaignRef: `campaign_${suffix}`,
      campaignVersionRef: `version_${suffix}`,
      versionNo: 1,
      inputVersions: {
        blueprintVersionRef: "blueprint_sample001",
        brandProfileVersionRef: "brand_sample001",
        complianceProfileVersionRef: "compliance_sample001",
        partnerProfileVersionRef: "partner_sample001",
        routingProfileVersionRef: "routing_private001",
        rulesetVersionRef: "ruleset_sample001",
      },
      manifest,
      manifestHash: hash(manifest),
      createdBy: principal.actorRef,
      createdAt: issued,
    },
    authority: {
      propertyVersionRef: `property_${suffix}`,
      propertyAuthority: proof("property", hash(manifest.property)),
      partnerVersionRef: `partner_${suffix}`,
      lenderIdentityVersionRef: `lender_${suffix}`,
      partnerIdentity: {
        versionRef: `partner_${suffix}`,
        identityHash: hash(partner),
        textOnly: true,
        assetRefs: [],
        authority: proof("partner", hash(partner)),
      },
      lenderIdentity: {
        versionRef: `lender_${suffix}`,
        identityHash: hash(identity),
        textOnly: true,
        assetRefs: [],
        authority: proof("lender", hash(identity)),
      },
      presetVersionRef: `preset_${suffix}`,
      presetHash: hash("preset"),
      presetInputHash: hash(financing),
      preset: proof("preset"),
      quoteEvidence: [
        {
          scenarioId: scenario.id,
          scenarioInputHash: scenarioHash,
          permittedAssumptionsHash: hash(scenario.assumptions),
          authority: proof("quote", scenarioHash),
        },
      ],
      disclosureVersionRef: `disclosure_${suffix}`,
      disclosureHash: hash(disclosureText),
      disclosureText,
      disclosure: proof("disclosure", hash(disclosureText)),
      mediaAuthorizations: [],
      templateVersionRef: `template_${suffix}`,
      templateHash: hash("template"),
      templateEntitlementRef: `entitlement_${suffix}`,
      template: proof("template"),
      routingProfileVersionRef,
      highlevelLocationRef,
      routing: proof(
        "routing",
        hash({
          routingProfileVersionRef,
          highlevelLocationRef,
          consentVersionRef,
          inquiryPolicyVersion: "native-inquiry-30-days-v1",
        }),
      ),
      consentVersionRef,
      consentHash: hash(consentText),
      consentText,
      consent: proof("consent", hash(consentText)),
      privacyUrl: `${canonicalOrigin}/privacy`,
      inquiryPolicyVersion: "native-inquiry-30-days-v1",
      origin: {
        canonicalOrigin,
        bindingRef,
        authority: proof("origin", hash({ canonicalOrigin, bindingRef })),
      },
    },
  });
}
export function admissionFixture(locationId, kind, evidence) {
  return {
    locationId,
    kind,
    evidence,
    provenance: {
      qualificationRef: evidence.verificationRef,
      receiptHash: hash({ syntheticQualification: evidence.verificationRef }),
      verifierRef: "verifier_synthetic001",
      method: ["preset", "quote", "disclosure", "lender-identity"].includes(kind)
        ? "lender-record"
        : ["property", "partner-identity", "public-media"].includes(kind)
          ? "public-permission-record"
          : "platform-record",
    },
  };
}
export function sourceEvidence(source) {
  const a = source.authority;
  return [
    ["property", a.propertyAuthority],
    ["partner-identity", a.partnerIdentity.authority],
    ["lender-identity", a.lenderIdentity.authority],
    ["preset", a.preset],
    ...a.quoteEvidence.map((q) => ["quote", q.authority]),
    ["disclosure", a.disclosure],
    ...a.mediaAuthorizations.map((m) => ["public-media", m.authority]),
    ["template", a.template],
    ["routing", a.routing],
    ["consent", a.consent],
    ["origin", a.origin.authority],
  ];
}
export function prepareRequest(source) {
  const request = {
    requestId: randomUUID(),
    campaignRef: source.sourceVersion.campaignRef,
    campaignVersionRef: source.sourceVersion.campaignVersionRef,
    expectedEvidenceHash: hash(source.authority),
  };
  for (const key of [
    "propertyVersionRef",
    "partnerVersionRef",
    "lenderIdentityVersionRef",
    "presetVersionRef",
    "disclosureVersionRef",
    "templateVersionRef",
    "routingProfileVersionRef",
    "consentVersionRef",
  ])
    request[key] = source.authority[key];
  return request;
}
export function releasePorts(repository, source, artifacts = new Map()) {
  return {
    now: () => new Date(),
    newReleaseRef: () => `release_${randomUUID().replaceAll("-", "")}`,
    newPublicationId: randomUUID,
    authorize: async (principal) => {
      if (principal.locationRef !== source.sourceVersion.locationRef)
        throw new Error("Wrong fixture tenant");
    },
    resolve: async (_principal, selection) =>
      repository.resolveSource(
        selection.campaignRef,
        selection.campaignVersionRef,
        selection.expectedEvidenceHash ?? selection.evidenceHash,
      ),
    transaction: (location, work) => repository.transaction(location, work),
    findPublication: async (id, origin) =>
      (await import("../dist/index.js")).findPublicFinancingRelease(repository.pool, id, origin),
    readMedia: async () => {
      throw new Error("No fixture media");
    },
    assertNormalizedMedia: async () => {
      throw new Error("No fixture media");
    },
    render: async (plan) =>
      ["site", "pdf"].map((kind) => ({
        kind,
        mimeType: kind === "site" ? "text/html" : "application/pdf",
        rendererVersion: "synthetic-1",
        artifactRef: `artifact_${kind}${plan.publicationId.replaceAll("-", "")}`,
        bindingHash: hash(plan),
        bytes: Buffer.from(`synthetic-${kind}:${plan.manifestHash}`),
      })),
    // Synthetic parity seams: these database tests do not qualify native output extraction.
    assertOutputParity: async () => {},
    putOutput: async (seal, bytes) => {
      artifacts.set(seal.artifactRef, bytes);
    },
    readOutput: async (seal) => artifacts.get(seal.artifactRef),
  };
}
export function inquiryFixture() {
  return {
    requestId: randomUUID(),
    firstName: "Synthetic",
    email: "synthetic@example.invalid",
    honeypot: "",
    consent: true,
    intent: "property-information",
  };
}
export const cryptoFixture = () => ({
  currentKeyId: "key1",
  keys: { key1: Buffer.alloc(32, 17) },
  requestHashKey: Buffer.alloc(32, 23),
});
export const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
