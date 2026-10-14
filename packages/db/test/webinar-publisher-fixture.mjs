import { randomUUID } from "node:crypto";
import {
  canonicalCampaignHash,
  webinarPublisherConfirmationHash,
  createApprovalDecision,
  createSessionApprovalAuthority,
} from "@oalo/application";
import {
  WebinarPublisherSummarySchema,
  formatActorRef,
  formatLocationRef,
  formatInstallationRef,
  CampaignVersionSchema,
  WebinarAdCampaignManifestSchema,
  PreflightResultSchema,
} from "@oalo/contracts";

// Synthetic normalized values only. No live discovery, lender release or App Test is claimed.
export function publisherFixture() {
  const principal = {
    actorId: randomUUID(),
    locationId: randomUUID(),
    installationRef: formatInstallationRef(randomUUID()),
    role: "location_admin",
    roleVersion: 1,
    sessionId: "session_signedFixture001",
    authenticationMode: "embedded",
  };
  principal.actorRef = formatActorRef(principal.actorId);
  principal.locationRef = formatLocationRef(principal.locationId);
  const createdAt = new Date(Date.now() - 10000).toISOString();
  const endsAt = new Date(Date.now() + 3600000).toISOString();
  const projection = {
    schemaVersion: 1,
    kind: "webinar-provider-launch",
    contractId: "CTR-003",
    contractRevision: 1,
    projectionRef: `projection_${randomUUID().replaceAll("-", "")}`,
    locationRef: principal.locationRef,
    campaignRef: `campaign_${randomUUID().replaceAll("-", "")}`,
    campaignVersionRef: "version_publisher001",
    manifestHash: "a".repeat(64),
    preflightHash: "b".repeat(64),
    approvalRef: "approval_publisher001",
    destination: {
      publicationId: randomUUID(),
      sourceRevision: randomUUID(),
      snapshotHash: "c".repeat(64),
      destinationHash: "d".repeat(64),
    },
    templateSourceHash: "e".repeat(64),
    brandHash: "f".repeat(64),
    copyHash: "1".repeat(64),
    advertiserIdentity: { kind: "loan_officer", displayName: "Synthetic lender" },
    copy: {
      primaryText: "Learn how to prepare.",
      headline: "Homebuying webinar",
      description: "Equal Housing Lender.",
    },
    creative: {
      shape: "square",
      assetRef: "webinarimage_square001",
      digest: "2".repeat(64),
      width: 1080,
      height: 1080,
      byteLength: 9000,
      rendererVersion: "1.0.0",
    },
    assets: {
      locationId: `native_${randomUUID().replaceAll("-", "")}`,
      adAccountId: "act_123456",
      pageId: "123456",
      discoveryHash: "3".repeat(64),
      currency: "USD",
      timezone: "America/Chicago",
    },
    objective: "OUTCOME_TRAFFIC",
    cta: "LEARN_MORE",
    placements: ["facebook_feed"],
    specialAdCategories: ["HOUSING"],
    geographies: [
      {
        key: "12345",
        name: "Illinois",
        type: "region",
        countryCode: "US",
        selectionType: "include",
        discoveryHash: "4".repeat(64),
      },
    ],
    schedule: { startPolicy: "immediate", endsAt, timezone: "America/Chicago" },
    budget: {
      currency: "USD",
      dailyBudgetMinor: 1000,
      totalBudgetMinor: 50000,
      nativeMode: "DAILY",
      totalSemantics: "estimated_ceiling",
      boundsHash: "5".repeat(64),
    },
    providerContract: { evidenceRevision: 1, apiVersion: "v3", wireMappingHash: "6".repeat(64) },
    createdBy: principal.actorRef,
    createdAt,
  };
  projection.destination.publicUrl = `https://example.test/f/${projection.destination.publicationId}`;
  projection.projectionHash = canonicalCampaignHash(projection);
  const selection = {
    adAccountRef: "account_selected001",
    pageRef: "page_selected001",
    creativeAssetRef: projection.creative.assetRef,
    geographyRefs: ["geography_illinois001"],
  };
  const body = {
    schemaVersion: 1,
    contractId: "CTR-003",
    contractRevision: 1,
    projection,
    selection,
    accountLabel: "Synthetic account",
    pageLabel: "Synthetic lender",
    readiness: [],
  };
  const summary = WebinarPublisherSummarySchema.parse({
    ...body,
    summaryHash: canonicalCampaignHash(body),
  });
  const launch = {
    summary,
    rowVersion: 1,
    state: "reserved",
    nativeIds: { campaignId: null, adsetId: null, adId: null },
  };
  const resolved = {
    adAccountRef: selection.adAccountRef,
    pageRef: selection.pageRef,
    assets: projection.assets,
    accountLabel: body.accountLabel,
    pageLabel: body.pageLabel,
    geographies: [
      {
        ...projection.geographies[0],
        selectionRef: selection.geographyRefs[0],
        approvedPlace: "IL",
      },
    ],
    providerContract: projection.providerContract,
    totalSemantics: "estimated_ceiling",
  };
  const operation = {
    schemaVersion: 1,
    contractId: "CTR-003",
    contractRevision: 1,
    operationRef: `operation_${randomUUID().replaceAll("-", "")}`,
    projectionRef: projection.projectionRef,
    projectionHash: projection.projectionHash,
    locationRef: principal.locationRef,
    actorRef: principal.actorRef,
    actorRoleVersion: principal.roleVersion,
    requestId: randomUUID(),
    expectedRowVersion: 1,
    requestHash: "7".repeat(64),
    confirmationHash: "8".repeat(64),
    summaryHash: summary.summaryHash,
    nativeIdsAtConfirmation: launch.nativeIds,
    action: "draft",
    state: "reserved",
    stage: "queued",
    correlationRef: "correlation_publisher001",
    createdAt,
    leaseGeneration: 0,
    providerObservedAt: null,
    lastSafeFailure: null,
  };
  const task = {
    schemaVersion: 1,
    contractId: "CTR-003",
    contractRevision: 1,
    kind: "webinar-publisher-command",
    operationRef: operation.operationRef,
    locationRef: principal.locationRef,
    projectionHash: projection.projectionHash,
    action: operation.action,
    correlationRef: operation.correlationRef,
  };
  operation.confirmationHash = webinarPublisherConfirmationHash({
    action: operation.action,
    summary,
    nativeIds: launch.nativeIds,
  });
  operation.requestHash = canonicalCampaignHash({
    requestId: operation.requestId,
    projectionRef: operation.projectionRef,
    expectedProjectionHash: operation.projectionHash,
    expectedRowVersion: operation.expectedRowVersion,
    action: operation.action,
    confirmationHash: operation.confirmationHash,
  });
  const proof = {
    schemaVersion: 1,
    contractId: "CTR-003",
    contractRevision: 1,
    kind: "app_test",
    evidenceRef: "evidence_synthetic001",
    artifactHash: "9".repeat(64),
    projectionHash: projection.projectionHash,
    wireMappingHash: projection.providerContract.wireMappingHash,
    evidenceRevision: 1,
    locationId: projection.assets.locationId,
    adAccountId: projection.assets.adAccountId,
    pageId: projection.assets.pageId,
    currency: "USD",
    timezone: projection.assets.timezone,
    observedAt: createdAt,
    expiresAt: endsAt,
    schedule: {
      format: "offset_datetime",
      requestEnd: endsAt,
      observedStop: endsAt,
      requestHash: "a".repeat(64),
      readBackHash: "b".repeat(64),
    },
    budget: {
      mode: "DAILY",
      amountMajor: 10,
      totalSemantics: "estimated_ceiling",
      requestHash: "c".repeat(64),
      readBackHash: "d".repeat(64),
    },
  };
  const receipt = {
    schemaVersion: 1,
    contractId: "CTR-003",
    contractRevision: 1,
    admissionRef: `admission_${randomUUID().replaceAll("-", "")}`,
    artifactHash: "9".repeat(64),
    verifierRef: "verifier_testOnly001",
    origin: "verified_provider",
    observedAt: createdAt,
    expiresAt: endsAt,
    kind: "selection",
    normalized: {
      selection,
      resolved,
      releaseEvidenceRef: "release_synthetic001",
      releaseArtifactHash: "a".repeat(64),
    },
  };
  return { principal, summary, launch, resolved, operation, task, proof, receipt };
}

/** Full strict source for real database decoding; all authority remains synthetic test evidence. */
export async function publisherEvidenceFixture(f) {
  const p = f.summary.projection;
  const destination = {
    ...p.destination,
    kind: "live-webinar",
    publisherActorRef: f.principal.actorRef,
    publishedAt: p.createdAt,
    expiresAt: p.schedule.endsAt,
    eventStartsAt: p.schedule.endsAt,
  };
  delete destination.destinationHash;
  const manifest = WebinarAdCampaignManifestSchema.parse({
    schemaVersion: 1,
    blueprintId: "webinar-ad",
    requestHash: "a".repeat(64),
    template: {
      id: "webinar-plan-first",
      version: 1,
      goal: "planning",
      sourceHash: p.templateSourceHash,
      tallSha256: "b".repeat(64),
      squareSha256: p.creative.digest,
      rightsBasis: "platform-original",
    },
    destination,
    destinationHash: canonicalCampaignHash(destination),
    content: {
      headline: p.copy.headline,
      body: p.copy.primaryText,
      callToAction: "Learn more",
      disclosureText: p.copy.description,
      consentText: "I agree to contact.",
      claims: [],
      mergeTokens: [],
      financingTerms: [],
    },
    images: [
      {
        shape: "tall",
        assetRef: "webinarimage_tall001",
        rendererVersion: "1.0.0",
        contentSha256: "b".repeat(64),
        width: 1080,
        height: 1350,
        byteLength: 9000,
        altText: "Synthetic educational ad",
      },
      {
        shape: "square",
        assetRef: p.creative.assetRef,
        rendererVersion: p.creative.rendererVersion,
        contentSha256: p.creative.digest,
        width: 1080,
        height: 1080,
        byteLength: p.creative.byteLength,
        altText: "Synthetic educational ad",
      },
    ],
    advertiser: {
      name: p.advertiserIdentity.displayName,
      title: "Loan officer",
      company: "Synthetic lender",
      nmls: "0000000",
      companyNmls: "0000000",
      colorPresetId: "navy",
    },
    schedule: { startsAt: null, endsAt: p.schedule.endsAt },
    meta: {
      enabled: false,
      specialAdCategory: "HOUSING",
      platform: "meta",
      placements: ["facebook_feed"],
      targeting: {
        country: "US",
        regions: ["IL"],
        cities: [],
        zipCodes: [],
        customAudienceRefs: [],
        protectedDimensions: [],
      },
      dailyBudgetMinor: p.budget.dailyBudgetMinor,
      totalBudgetMinor: p.budget.totalBudgetMinor,
    },
  });
  const inputVersions = {
    blueprintVersionRef: "blueprint_publisher001",
    brandProfileVersionRef: "profile_brand001",
    complianceProfileVersionRef: "profile_compliance001",
    partnerProfileVersionRef: "profile_partner001",
    routingProfileVersionRef: "profile_routing001",
    rulesetVersionRef: "ruleset_webinarAd001",
  };
  const version = CampaignVersionSchema.parse({
    schemaVersion: 1,
    locationRef: p.locationRef,
    campaignRef: p.campaignRef,
    campaignVersionRef: p.campaignVersionRef,
    versionNo: 1,
    inputVersions,
    manifest,
    manifestHash: canonicalCampaignHash(manifest),
    createdBy: p.createdBy,
    createdAt: p.createdAt,
  });
  const preflightBody = {
    schemaVersion: 1,
    campaignRef: p.campaignRef,
    campaignVersionRef: p.campaignVersionRef,
    manifestHash: version.manifestHash,
    inputVersions,
    rulesetVersionRef: inputVersions.rulesetVersionRef,
    findings: [],
    blocking: false,
    evaluatedAt: p.createdAt,
  };
  const preflight = PreflightResultSchema.parse({
    ...preflightBody,
    resultHash: canonicalCampaignHash(preflightBody),
  });
  const approval = await createApprovalDecision(
    {
      approvalRef: p.approvalRef,
      campaignVersion: version,
      preflight,
      actorRef: p.createdBy,
      actorKind: "human",
      actorRole: "location_admin",
      decidedAt: new Date(p.createdAt),
      ipAuditHash: "a".repeat(64),
      decision: "approved",
      approverDisplayName: undefined,
    },
    createSessionApprovalAuthority(f.principal),
    { assertCurrent: async () => {} },
  );
  // Keep projection source hashes and exact immutable identities aligned with the seeded source.
  p.manifestHash = version.manifestHash;
  p.preflightHash = preflight.resultHash;
  p.destination.destinationHash = manifest.destinationHash;
  p.brandHash = canonicalCampaignHash(manifest.advertiser);
  p.copyHash = canonicalCampaignHash({
    headline: manifest.content.headline,
    primaryText: manifest.content.body,
    callToAction: manifest.content.callToAction,
  });
  const { projectionHash: _projectionHash, ...projectionBody } = p;
  p.projectionHash = canonicalCampaignHash(projectionBody);
  const { summaryHash: _summaryHash, ...summaryBody } = f.summary;
  f.summary.summaryHash = canonicalCampaignHash(summaryBody);
  f.operation.projectionHash = p.projectionHash;
  f.operation.summaryHash = f.summary.summaryHash;
  f.task.projectionHash = p.projectionHash;
  f.proof.projectionHash = p.projectionHash;
  f.operation.confirmationHash = webinarPublisherConfirmationHash({
    action: "draft",
    summary: f.summary,
    nativeIds: f.launch.nativeIds,
  });
  f.operation.requestHash = canonicalCampaignHash({
    requestId: f.operation.requestId,
    projectionRef: p.projectionRef,
    expectedProjectionHash: p.projectionHash,
    expectedRowVersion: 1,
    action: "draft",
    confirmationHash: f.operation.confirmationHash,
  });
  return { version, preflight, approval, state: "approved" };
}
