import { financingSourceFixture } from "../../../../packages/db/test/financing-release-fixture.mjs";
import { canonicalCampaignHash as hash, calculateFinancingComparison } from "@oalo/application";

export function outputFixture(count = 1, images = []) {
  const source = financingSourceFixture({
    locationRef: "location_output001",
    actorRef: "actor_output001",
  });
  const manifest = source.sourceVersion.manifest;
  const authority = source.authority;
  manifest.financing.scenarios = Array.from({ length: count }, (_, index) => ({
    ...structuredClone(manifest.financing.scenarios[0]),
    id: `00000000-0000-4000-8000-${String(index + 800).padStart(12, "0")}`,
    label: `Synthetic option ${index + 1}`,
    downPaymentBps: 2000 + index * 250,
  }));
  manifest.calculated = calculateFinancingComparison(manifest.financing);
  authority.quoteEvidence = manifest.financing.scenarios.map((scenario) => {
    const scenarioInputHash = hash({
      purchasePriceMinor: manifest.financing.purchasePriceMinor,
      housing: manifest.financing.housing,
      scenario,
    });
    return {
      ...structuredClone(authority.quoteEvidence[0]),
      scenarioId: scenario.id,
      scenarioInputHash,
      permittedAssumptionsHash: hash(scenario.assumptions),
      authority: {
        ...structuredClone(authority.quoteEvidence[0].authority),
        contentHash: scenarioInputHash,
      },
    };
  });
  const media = images.slice(0, 6).map((image, index) => ({
    mediaRef: `media_${String(index + 1).padStart(32, "0")}`,
    sha256: image.sha256,
    byteSize: image.bytes.length,
    mimeType: image.mimeType,
    width: 400,
    height: 400,
    normalizationVersion: "1.0.0",
    metadataRetained: false,
    rights: {
      schemaVersion: 1,
      basis: "owned",
      confirmed: true,
      attestedBy: source.sourceVersion.createdBy,
      attestedAt: source.sourceVersion.createdAt,
      scope: "tenant-private-financing",
    },
    altText: `Synthetic property photograph ${index + 1}`,
  }));
  if (images.length) {
    manifest.schemaVersion = 2;
    manifest.templateVersion = "2.0.0";
    manifest.property.media = media;
    manifest.property.facts = {
      listPriceMinor: 41000000,
      bedrooms: 3,
      bathroomsHundredths: 250,
      floorAreaSqFt: 2000,
      confirmed: true,
    };
  }
  authority.mediaAuthorizations = media.map((m) => ({
    assetRef: m.mediaRef,
    sha256: m.sha256,
    byteSize: m.byteSize,
    mimeType: m.mimeType,
    normalizationVersion: m.normalizationVersion,
    purpose: "property",
    basis: "owned",
    attestedBy: m.rights.attestedBy,
    attestedAt: m.rights.attestedAt,
    scope: "public-financing",
    authority: { ...structuredClone(authority.propertyAuthority), contentHash: m.sha256 },
  }));
  for (const [index, image] of images.slice(6, 10).entries()) {
    const assetRef = `asset_identity${index + 10}`,
      role = index < 2 ? "lenderIdentity" : "partnerIdentity";
    authority[role].textOnly = false;
    authority[role].assetRefs.push(assetRef);
    authority.mediaAuthorizations.push({
      assetRef,
      sha256: image.sha256,
      byteSize: image.bytes.length,
      mimeType: image.mimeType,
      normalizationVersion: "1.0.0",
      purpose: `${index < 2 ? "lender" : "partner"}-${index % 2 === 0 ? "logo" : "headshot"}`,
      basis: "owned",
      attestedBy: source.sourceVersion.createdBy,
      attestedAt: source.sourceVersion.createdAt,
      scope: "public-financing",
      authority: { ...structuredClone(authority.propertyAuthority), contentHash: image.sha256 },
    });
  }
  authority.propertyAuthority.contentHash = hash(manifest.property);
  authority.presetInputHash = hash(manifest.financing);
  source.sourceVersion.manifestHash = hash(manifest);
  const publicationId = "00000000-0000-4000-8000-000000000501";
  return {
    source,
    publicationId,
    canonicalUrl: `${authority.origin.canonicalOrigin}/p/${publicationId}`,
    manifestHash: source.sourceVersion.manifestHash,
    evidenceHash: hash(authority),
    presentation: {
      address: manifest.property.address,
      description: manifest.property.description,
      stateCode: manifest.property.stateCode,
      facts:
        manifest.schemaVersion === 2
          ? (({ confirmed: _confirmed, ...facts }) => facts)(manifest.property.facts)
          : null,
      identities: manifest.identities,
      financing: {
        ...manifest.financing,
        scenarios: manifest.financing.scenarios.map(({ quote, ...scenario }) => ({
          ...scenario,
          quote: {
            noteRateMilliPercent: quote.noteRateMilliPercent,
            aprMilliPercent: quote.aprMilliPercent,
            quotedAt: quote.quotedAt,
            expiresAt: quote.expiresAt,
          },
        })),
      },
      calculated: manifest.calculated,
      disclosureText: authority.disclosureText,
      consentText: authority.consentText,
      privacyUrl: authority.privacyUrl,
      issuedAt: new Date().toISOString(),
      validUntil: authority.disclosure.expiresAt,
      estimateNotice:
        "Estimates based on the supplied assumptions. Not a loan commitment or eligibility determination.",
    },
  };
}

export function longOutputFixture() {
  const input = outputFixture(5),
    manifest = input.source.sourceVersion.manifest,
    authority = input.source.authority;
  manifest.property.description = "Long synthetic property copy. ".repeat(300).trim();
  authority.propertyAuthority.contentHash = hash(manifest.property);
  authority.disclosureText =
    "Long supplied synthetic disclosure; never actual lender authorization. ".repeat(250).trim();
  authority.disclosureHash = hash(authority.disclosureText);
  authority.disclosure.contentHash = authority.disclosureHash;
  authority.consentText =
    "Long synthetic contact consent and temporary plugin retention explanation. "
      .repeat(200)
      .trim();
  authority.consentHash = hash(authority.consentText);
  authority.consent.contentHash = authority.consentHash;
  manifest.identities.lender.name =
    "Synthetic LO name with a long professionally approved identification ".repeat(2).trim();
  authority.lenderIdentity.identityHash = hash(manifest.identities.lender);
  authority.lenderIdentity.authority.contentHash = authority.lenderIdentity.identityHash;
  input.presentation.description = manifest.property.description;
  input.presentation.disclosureText = authority.disclosureText;
  input.presentation.consentText = authority.consentText;
  sourceRefresh(input);
  return input;
}
function sourceRefresh(input) {
  input.source.sourceVersion.manifestHash = hash(input.source.sourceVersion.manifest);
  input.manifestHash = input.source.sourceVersion.manifestHash;
  input.evidenceHash = hash(input.source.authority);
}
