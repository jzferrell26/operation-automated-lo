import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  assertFinancingReleaseEligible,
  captureFinancingInquiry,
  prepareFinancingRelease,
  readPublicFinancingRelease,
  transitionFinancingRelease,
  canonicalCampaignHash as hash,
  calculateFinancingComparison,
  FinancingReleaseError,
  type FinancingReleasePorts,
  type FinancingReleaseTransaction,
} from "@oalo/application";
import {
  FinancingCampaignManifestSchema,
  FinancingReleaseResolvedSourceSchema,
  type FinancingReleaseRecord,
} from "@oalo/contracts";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const principal = { actorRef: "actor_owner001", locationRef: "location_owner001" };
const now = "2030-01-01T12:00:00.000Z",
  expiry = "2030-02-01T12:00:00.000Z";
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const mediaBytes = Uint8Array.from([1, 2, 3]);
function sourceFixture(photo = false, scenarios = 1) {
  const proof = (name: string, contentHash = hash(name)) => ({
    recordRef: `evidence_${name}001`,
    revisionRef: `revision_${name}001`,
    locationRef: principal.locationRef,
    contentHash,
    verificationRef: `verification_${name}001`,
    verifiedBy: principal.actorRef,
    verifiedAt: "2029-12-01T00:00:00.000Z",
    issuedAt: "2029-11-01T00:00:00.000Z",
    expiresAt: expiry,
    revokedAt: null,
    channels: ["site", "pdf"],
  });
  const financing = {
    purchasePriceMinor: 40_000_000,
    housing: {
      propertyTaxMinor: 40000,
      homeownersInsuranceMinor: 12000,
      hoaMinor: 0,
      otherMinor: 0,
    },
    scenarios: Array.from({ length: scenarios }, (_, index) => ({
      id: uuid(index + 100),
      label: `Synthetic scenario ${index + 1}`,
      program: "conventional",
      structure: "fixed-purchase",
      termMonths: 360,
      downPaymentBps: 2000,
      quote: {
        noteRateMilliPercent: 6000,
        aprMilliPercent: 6250,
        source: "Private synthetic authority",
        quotedAt: "2029-11-01T00:00:00.000Z",
        expiresAt: expiry,
        confirmed: true,
      },
      upfrontFee: { amountMinor: 0, treatment: "none" as const },
      monthlyMortgageInsuranceMinor: 0,
      costs: [],
      costsComplete: true,
      sellerCreditMinor: 0,
      lenderCreditMinor: 0,
      depositMinor: 0,
      assumptions: "Synthetic fixed purchase assumptions.",
    })),
  };
  const identities = {
    lender: {
      name: "Synthetic LO",
      company: "Synthetic lender",
      phone: "",
      email: "lo@example.invalid",
      license: "12345",
    },
    realtor: {
      name: "Synthetic partner",
      company: "Synthetic realty",
      phone: "",
      email: "partner@example.invalid",
      license: "",
    },
  };
  const media = {
    mediaRef: `media_${"b".repeat(32)}`,
    sha256: sha(mediaBytes),
    byteSize: 3,
    mimeType: "image/png",
    width: 400,
    height: 400,
    normalizationVersion: "1.0.0",
    metadataRetained: false,
    rights: {
      schemaVersion: 1,
      basis: "permission",
      confirmed: true,
      attestedBy: principal.actorRef,
      attestedAt: "2029-11-01T00:00:00.000Z",
      scope: "tenant-private-financing",
    },
    altText: "Synthetic property",
  };
  const manifest = FinancingCampaignManifestSchema.parse({
    schemaVersion: photo ? 2 : 1,
    blueprintId: "financing-comparison",
    templateVersion: photo ? "2.0.0" : "1.0.0",
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
      partnerRecordId: uuid(50),
      partnerCompany: "Synthetic realty",
    },
    property: {
      address: "1 Synthetic Lane",
      description: "Synthetic property description.",
      stateCode: "TX",
      permissionConfirmed: false,
      ...(photo
        ? {
            facts: {
              listPriceMinor: null,
              bedrooms: 3,
              bathroomsHundredths: null,
              floorAreaSqFt: null,
              confirmed: true,
            },
            media: [media],
          }
        : {}),
    },
    partner: { realtorDisplayName: "Synthetic partner", permissionConfirmed: false },
    identities,
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
  const disclosureText = "Synthetic authorized disclosure. Valid only to the stated expiration.",
    consentText =
      "I agree to this LO contacting me about this inquiry. Temporary plugin data expires after 30 days.";
  return FinancingReleaseResolvedSourceSchema.parse({
    sourceVersion: {
      schemaVersion: 1,
      locationRef: principal.locationRef,
      campaignRef: "campaign_sample001",
      campaignVersionRef: "campaignversion_sample001",
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
      createdAt: "2029-12-01T00:00:00.000Z",
    },
    authority: {
      propertyVersionRef: "property_sample001",
      propertyAuthority: proof("property", hash(manifest.property)),
      partnerVersionRef: "partner_sample001",
      lenderIdentityVersionRef: "lender_sample001",
      partnerIdentity: {
        versionRef: "partner_sample001",
        identityHash: hash(identities.realtor),
        textOnly: true,
        assetRefs: [],
        authority: proof("partner", hash(identities.realtor)),
      },
      lenderIdentity: {
        versionRef: "lender_sample001",
        identityHash: hash(identities.lender),
        textOnly: true,
        assetRefs: [],
        authority: proof("lender", hash(identities.lender)),
      },
      presetVersionRef: "preset_sample001",
      presetHash: hash("preset"),
      presetInputHash: hash(manifest.financing),
      preset: proof("preset"),
      quoteEvidence: manifest.financing.scenarios.map((scenario) => {
        const scenarioInputHash = hash({
          purchasePriceMinor: financing.purchasePriceMinor,
          housing: financing.housing,
          scenario,
        });
        return {
          scenarioId: scenario.id,
          scenarioInputHash,
          permittedAssumptionsHash: hash(scenario.assumptions),
          authority: proof(`quote${scenario.id.slice(-2)}`, scenarioInputHash),
        };
      }),
      disclosureVersionRef: "disclosure_sample001",
      disclosureHash: hash(disclosureText),
      disclosureText,
      disclosure: proof("disclosure", hash(disclosureText)),
      mediaAuthorizations: photo
        ? [
            {
              assetRef: media.mediaRef,
              sha256: media.sha256,
              byteSize: media.byteSize,
              mimeType: media.mimeType,
              normalizationVersion: media.normalizationVersion,
              purpose: "property",
              basis: "permission",
              attestedBy: principal.actorRef,
              attestedAt: media.rights.attestedAt,
              scope: "public-financing",
              authority: proof("media", media.sha256),
            },
          ]
        : [],
      templateVersionRef: "template_sample001",
      templateHash: hash("template"),
      templateEntitlementRef: "entitlement_sample001",
      template: proof("template"),
      routingProfileVersionRef: "routing_sample001",
      highlevelLocationRef: "ghllocation_sample001",
      routing: proof(
        "routing",
        hash({
          routingProfileVersionRef: "routing_sample001",
          highlevelLocationRef: "ghllocation_sample001",
          consentVersionRef: "consent_sample001",
          inquiryPolicyVersion: "native-inquiry-30-days-v1",
        }),
      ),
      consentVersionRef: "consent_sample001",
      consentHash: hash(consentText),
      consentText,
      consent: proof("consent", hash(consentText)),
      privacyUrl: "https://property.example.org/privacy",
      inquiryPolicyVersion: "native-inquiry-30-days-v1",
      origin: {
        canonicalOrigin: "https://property.example.org",
        bindingRef: "hostbinding_sample001",
        authority: proof(
          "origin",
          hash({
            canonicalOrigin: "https://property.example.org",
            bindingRef: "hostbinding_sample001",
          }),
        ),
      },
    },
  });
}
function harness(photo = false, scenarios = 1) {
  const source = sourceFixture(photo, scenarios);
  let clock = new Date(now),
    nextId = 1;
  const records = new Map<string, FinancingReleaseRecord>(),
    operations = new Map<string, { hash: string; releaseRef: string }>(),
    artifacts = new Map<string, Uint8Array>(),
    inquiries = new Map<string, { hash: string; receipt: unknown }>();
  let reservationOverride: unknown = null,
    serial = Promise.resolve();
  const tx: FinancingReleaseTransaction = {
    reserve: vi.fn(async (command, requestId, contentHash) => {
      if (reservationOverride !== null) return reservationOverride;
      const previous = operations.get(`${command}:${requestId}`);
      if (!previous) return { state: "new" };
      if (previous.hash !== contentHash) throw new FinancingReleaseError("CONFLICT", 409);
      return { state: "completed", releaseRef: previous.releaseRef };
    }),
    load: vi.fn(async (ref) => structuredClone(records.get(ref))),
    save: vi.fn(async (record, revision) => {
      if ((records.get(record.snapshot.releaseRef)?.revision ?? null) !== revision)
        throw new FinancingReleaseError("CONFLICT", 409);
      records.set(record.snapshot.releaseRef, structuredClone(record));
    }),
    assertEvidenceCurrent: vi.fn(async () => undefined),
    complete: vi.fn(async (command, requestId, contentHash, releaseRef) => {
      operations.set(`${command}:${requestId}`, { hash: contentHash, releaseRef });
    }),
    capture: vi.fn(async (input) => {
      const key = `${input.snapshot.publicationId}:${input.request.requestId}`,
        previous = inquiries.get(key);
      if (previous) {
        if (previous.hash !== input.contentHash) throw new FinancingReleaseError("CONFLICT", 409);
        return previous.receipt;
      }
      const receipt = {
        inquiryId: uuid(999),
        publicationId: input.snapshot.publicationId,
        requestId: input.request.requestId,
        acceptedAt: input.acceptedAt,
        expiresAt: input.expiresAt,
        deliveryState: "pending",
      };
      inquiries.set(key, { hash: input.contentHash, receipt });
      return receipt;
    }),
  };
  const render = async (plan: Parameters<FinancingReleasePorts["render"]>[0]) => [
    {
      kind: "site",
      mimeType: "text/html",
      artifactRef: `artifact_site${plan.publicationId.slice(-12)}`,
      rendererVersion: "public-v1",
      bindingHash: hash(plan),
      bytes: new TextEncoder().encode(`<html>${plan.canonicalUrl}</html>`),
    },
    {
      kind: "pdf",
      mimeType: "application/pdf",
      artifactRef: `artifact_pdf${plan.publicationId.slice(-12)}`,
      rendererVersion: "public-v1",
      bindingHash: hash(plan),
      bytes: new TextEncoder().encode(`%PDF synthetic ${plan.canonicalUrl}`),
    },
  ];
  const ports: FinancingReleasePorts = {
    now: () => clock,
    newReleaseRef: () => `release_sample${nextId++}`,
    newPublicationId: () => uuid(nextId++),
    authorize: vi.fn(async () => undefined),
    resolve: vi.fn(async () => structuredClone(source)),
    readMedia: vi.fn(async () => mediaBytes),
    assertNormalizedMedia: vi.fn(async () => undefined),
    render: vi.fn(render),
    assertOutputParity: vi.fn(async () => undefined),
    putOutput: vi.fn(async (seal, bytes) => {
      artifacts.set(seal.artifactRef, bytes);
    }),
    readOutput: vi.fn(async (seal) => {
      const bytes = artifacts.get(seal.artifactRef);
      if (!bytes) throw new Error("Missing synthetic artifact");
      return bytes;
    }),
    transaction: async (_location, work) => {
      const previous = serial;
      let release: () => void = () => undefined;
      serial = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      const before = structuredClone(records),
        oldOps = structuredClone(operations),
        oldInquiries = structuredClone(inquiries);
      try {
        return await work(tx);
      } catch (error) {
        records.clear();
        operations.clear();
        inquiries.clear();
        for (const [key, value] of before) records.set(key, value);
        for (const [key, value] of oldOps) operations.set(key, value);
        for (const [key, value] of oldInquiries) inquiries.set(key, value);
        throw error;
      } finally {
        release();
      }
    },
    findPublication: vi.fn(async (id, origin) =>
      [...records.values()].find(
        (record) =>
          record.snapshot.publicationId === id &&
          record.snapshot.authority.origin.canonicalOrigin === origin,
      ),
    ),
  };
  const request = () => ({
    requestId: uuid(1),
    campaignRef: source.sourceVersion.campaignRef,
    campaignVersionRef: source.sourceVersion.campaignVersionRef,
    propertyVersionRef: source.authority.propertyVersionRef,
    partnerVersionRef: source.authority.partnerVersionRef,
    lenderIdentityVersionRef: source.authority.lenderIdentityVersionRef,
    presetVersionRef: source.authority.presetVersionRef,
    disclosureVersionRef: source.authority.disclosureVersionRef,
    templateVersionRef: source.authority.templateVersionRef,
    routingProfileVersionRef: source.authority.routingProfileVersionRef,
    consentVersionRef: source.authority.consentVersionRef,
    expectedEvidenceHash: hash(source.authority),
  });
  const transition = (record: FinancingReleaseRecord, requestId = uuid(2)) => ({
    requestId,
    releaseRef: record.snapshot.releaseRef,
    expectedRevision: record.revision,
    expectedBundleHash: record.snapshot.bundleHash,
    expectedEvidenceHash: record.snapshot.evidenceHash,
  });
  const prepare = () => prepareFinancingRelease(request(), principal, ports);
  const publish = async () => {
    const ready = await prepare();
    const approved = await transitionFinancingRelease(
      "approve",
      transition(ready),
      principal,
      ports,
    );
    return transitionFinancingRelease("publish", transition(approved, uuid(3)), principal, ports);
  };
  return {
    ports,
    tx,
    records,
    operations,
    artifacts,
    inquiries,
    source,
    render,
    request,
    transition,
    prepare,
    publish,
    setClock: (value: string) => {
      clock = new Date(value);
    },
    reserveAs: (value: unknown) => {
      reservationOverride = value;
    },
  };
}
const reseal = (record: FinancingReleaseRecord) => {
  const { bundleHash: _bundleHash, ...body } = record.snapshot;
  record.snapshot.bundleHash = hash(body);
  return record;
};
const inquiry = {
  requestId: uuid(5),
  firstName: "Synthetic",
  email: "person@example.invalid",
  honeypot: "",
  consent: true,
  intent: "financing-review",
};
describe("public financing preparation", () => {
  it.each([false, true])("preserves private source %s and seals actual bytes", async (photo) => {
    const h = harness(photo),
      original = structuredClone(h.source.sourceVersion),
      record = await h.prepare();
    expect(record.state).toBe("prepared");
    expect(record.approval).toBeNull();
    expect(h.source.sourceVersion).toEqual(original);
    expect(record.snapshot.manifestHash).toBe(hash(original.manifest));
    expect(record.snapshot.outputSeals.map((seal) => seal.sha256)).toEqual(
      [...h.artifacts.values()].map(sha),
    );
    expect(record.snapshot.presentation.financing.scenarios[0]?.quote).not.toHaveProperty("source");
    expect(record.snapshot.presentation.financing.scenarios[0]?.quote).not.toHaveProperty(
      "confirmed",
    );
    expect(record.snapshot.presentation.facts?.listPriceMinor ?? null).toBeNull();
    expect(h.tx.assertEvidenceCurrent).toHaveBeenCalledExactlyOnceWith(record.snapshot, now);
    expect(await h.prepare()).toEqual(record);
    expect(h.ports.render).toHaveBeenCalledTimes(1);
  });
  it.each([4, 5])("retains %s exact financial rows in the shared renderer plan", async (count) => {
    const h = harness(false, count),
      record = await h.prepare();
    expect(record.snapshot.presentation.calculated.scenarios).toHaveLength(count);
    expect(h.ports.assertOutputParity).toHaveBeenCalledTimes(4);
  });
  it("serializes duplicates and conflicts changed selections", async () => {
    const h = harness();
    const [a, b] = await Promise.all([h.prepare(), h.prepare()]);
    expect(a).toEqual(b);
    expect(h.records.size).toBe(1);
    expect(h.ports.render).toHaveBeenCalledTimes(1);
    await expect(
      prepareFinancingRelease(
        { ...h.request(), partnerVersionRef: "partner_changed001" },
        principal,
        h.ports,
      ),
    ).rejects.toMatchObject({ status: 409 });
    for (const change of [
      { campaignRef: "campaign_foreign001" },
      { campaignVersionRef: "campaignversion_foreign001" },
      { partnerVersionRef: "partner_foreign001" },
    ])
      await expect(
        prepareFinancingRelease(
          { ...h.request(), requestId: uuid(5), ...change },
          principal,
          h.ports,
        ),
      ).rejects.toMatchObject({ status: 422 });
    await expect(
      prepareFinancingRelease(
        { ...h.request(), requestId: uuid(6), expectedEvidenceHash: "a".repeat(64) },
        principal,
        h.ports,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it.each(["pending", "invalid"])(
    "does not fabricate success for %s reservation",
    async (state) => {
      const h = harness();
      h.reserveAs({ state });
      await expect(h.prepare()).rejects.toThrow();
      expect(h.records.size).toBe(0);
      expect(h.ports.render).not.toHaveBeenCalled();
    },
  );
  it("requires separate public-use rights for privately valid photographs", async () => {
    const h = harness(true);
    h.source.authority.mediaAuthorizations = [];
    await expect(h.prepare()).rejects.toMatchObject({ status: 422 });
  });
  it.each(["revoked", "expired", "futureIssue", "futureVerification", "foreign", "missingChannel"])(
    "refuses %s lender evidence despite private confirmation",
    async (problem) => {
      const h = harness(),
        proof = h.source.authority.quoteEvidence[0]!.authority;
      if (problem === "revoked") proof.revokedAt = now;
      if (problem === "expired") proof.expiresAt = now;
      if (problem === "futureIssue") proof.issuedAt = "2030-01-02T00:00:00.000Z";
      if (problem === "futureVerification") proof.verifiedAt = "2030-01-02T00:00:00.000Z";
      if (problem === "foreign") proof.locationRef = "location_foreign001";
      if (problem === "missingChannel") proof.channels = ["site"];
      await expect(h.prepare()).rejects.toMatchObject({ status: 422 });
    },
  );
  it.each([
    "preset",
    "disclosure",
    "consent",
    "template",
    "partnerVersion",
    "lenderVersion",
    "partnerHash",
    "lenderHash",
    "presetInput",
    "quoteCount",
    "quoteId",
    "quoteInput",
    "assumptions",
    "quoteContent",
  ])("refuses %s evidence drift", async (problem) => {
    const h = harness(),
      a = h.source.authority;
    if (problem === "preset") a.presetHash = "a".repeat(64);
    if (problem === "disclosure") a.disclosureHash = "a".repeat(64);
    if (problem === "consent") a.consentHash = "a".repeat(64);
    if (problem === "template") a.templateHash = "a".repeat(64);
    if (problem === "partnerVersion") a.partnerVersionRef = "partner_changed001";
    if (problem === "lenderVersion") a.lenderIdentityVersionRef = "lender_changed001";
    if (problem === "partnerHash") a.partnerIdentity.identityHash = "a".repeat(64);
    if (problem === "lenderHash") a.lenderIdentity.identityHash = "a".repeat(64);
    if (problem === "presetInput") a.presetInputHash = "a".repeat(64);
    if (problem === "quoteCount") a.quoteEvidence.push(structuredClone(a.quoteEvidence[0]!));
    if (problem === "quoteId") a.quoteEvidence[0]!.scenarioId = uuid(800);
    if (problem === "quoteInput") a.quoteEvidence[0]!.scenarioInputHash = "a".repeat(64);
    if (problem === "assumptions") a.quoteEvidence[0]!.permittedAssumptionsHash = "a".repeat(64);
    if (problem === "quoteContent") a.quoteEvidence[0]!.authority.contentHash = "a".repeat(64);
    await expect(h.prepare()).rejects.toMatchObject({ status: 422 });
  });
  it.each([
    "hash",
    "calculation",
    "location",
    "nullApr",
    "unknownCosts",
    "expiredQuote",
    "futureQuote",
  ])("refuses source %s without preparing outputs", async (problem) => {
    const h = harness(),
      v = h.source.sourceVersion;
    if (problem === "hash") v.manifestHash = "a".repeat(64);
    if (problem === "location") v.locationRef = "location_foreign001";
    if (problem !== "hash" && problem !== "location") {
      const m = FinancingCampaignManifestSchema.parse(v.manifest);
      if (problem === "calculation") m.calculated.scenarios[0]!.cashToCloseMinor = 10;
      if (problem === "nullApr") m.financing.scenarios[0]!.quote.aprMilliPercent = null;
      if (problem === "unknownCosts") m.financing.scenarios[0]!.costsComplete = false;
      if (problem === "expiredQuote") m.financing.scenarios[0]!.quote.expiresAt = now;
      if (problem === "futureQuote")
        m.financing.scenarios[0]!.quote.quotedAt = "2030-01-02T00:00:00.000Z";
      if (problem !== "calculation") m.calculated = calculateFinancingComparison(m.financing);
      v.manifest = m;
      v.manifestHash = hash(m);
      h.source.authority.presetInputHash = hash(m.financing);
      h.source.authority.quoteEvidence[0]!.scenarioInputHash = hash({
        purchasePriceMinor: m.financing.purchasePriceMinor,
        housing: m.financing.housing,
        scenario: m.financing.scenarios[0],
      });
      h.source.authority.quoteEvidence[0]!.authority.contentHash =
        h.source.authority.quoteEvidence[0]!.scenarioInputHash;
    }
    await expect(h.prepare()).rejects.toMatchObject({ status: 422 });
    expect(h.ports.render).not.toHaveBeenCalled();
  });
  it.each(["purpose", "hash", "future", "normalization", "bytes", "length"])(
    "refuses photograph %s mismatch",
    async (problem) => {
      const h = harness(true),
        a = h.source.authority.mediaAuthorizations[0]!;
      if (problem === "purpose") a.purpose = "partner-logo";
      if (problem === "hash") a.authority.contentHash = "a".repeat(64);
      if (problem === "future") a.attestedAt = "2030-01-02T00:00:00.000Z";
      if (problem === "normalization") a.normalizationVersion = "different";
      if (problem === "bytes")
        vi.mocked(h.ports.readMedia).mockResolvedValue(Uint8Array.from([4, 5, 6]));
      if (problem === "length")
        vi.mocked(h.ports.readMedia).mockResolvedValue(Uint8Array.from([1, 2]));
      await expect(h.prepare()).rejects.toMatchObject({ status: 422 });
      expect(h.records.size).toBe(0);
    },
  );
  it.each(["binding", "partial", "parity", "storedBytes", "commitRace", "normalizer"])(
    "never readies incomplete or invalid %s preparation",
    async (problem) => {
      const h = harness(true);
      if (problem === "binding" || problem === "partial")
        vi.mocked(h.ports.render).mockImplementation(async (plan) => {
          const results = await h.render(plan);
          if (problem === "partial") return results.slice(0, 1);
          return results.map((item) => ({ ...item, bindingHash: "a".repeat(64) }));
        });
      if (problem === "parity")
        vi.mocked(h.ports.assertOutputParity).mockRejectedValue(new Error("Parity mismatch"));
      if (problem === "storedBytes")
        vi.mocked(h.ports.readOutput).mockResolvedValue(new Uint8Array([4]));
      if (problem === "commitRace")
        vi.mocked(h.tx.assertEvidenceCurrent).mockRejectedValue(
          new FinancingReleaseError("INELIGIBLE", 422),
        );
      if (problem === "normalizer")
        vi.mocked(h.ports.assertNormalizedMedia).mockRejectedValue(new Error("Not normalized"));
      await expect(h.prepare()).rejects.toThrow();
      expect(h.records.size).toBe(0);
      expect(h.operations.size).toBe(0);
    },
  );
});

describe("sole-LO approval and explicit publication", () => {
  it("keeps review separate and allows the same authorized owner to approve and publish", async () => {
    const h = harness(),
      prepared = await h.prepare(),
      command = h.transition(prepared);
    await expect(
      readPublicFinancingRelease(
        prepared.snapshot.publicationId,
        "https://property.example.org",
        h.ports,
      ),
    ).rejects.toMatchObject({ status: 404 });
    const approved = await transitionFinancingRelease("approve", command, principal, h.ports);
    expect(approved.approval?.approvedBy).toBe(principal.actorRef);
    expect(await transitionFinancingRelease("approve", command, principal, h.ports)).toEqual(
      approved,
    );
    const publishCommand = h.transition(approved, uuid(3)),
      published = await transitionFinancingRelease("publish", publishCommand, principal, h.ports);
    const view = await readPublicFinancingRelease(
      published.snapshot.publicationId,
      "https://property.example.org",
      h.ports,
    );
    expect(Object.keys(view)).toEqual(["publicationId", "canonicalUrl", "presentation"]);
    expect(JSON.stringify(view)).not.toContain("evidence_");
    expect(JSON.stringify(view)).not.toContain("artifact_");
    expect(await transitionFinancingRelease("publish", publishCommand, principal, h.ports)).toEqual(
      published,
    );
  });
  it("checks current evidence before returning any successful retry", async () => {
    const h = harness(),
      prepared = await h.prepare(),
      command = h.transition(prepared);
    await transitionFinancingRelease("approve", command, principal, h.ports);
    h.source.authority.disclosure.revokedAt = now;
    await expect(
      transitionFinancingRelease("approve", command, principal, h.ports),
    ).rejects.toMatchObject({ status: 422 });
    await expect(h.prepare()).rejects.toThrow();
  });
  it("refuses pending, revision/hash conflicts and foreign command authority", async () => {
    const h = harness(),
      prepared = await h.prepare();
    h.reserveAs({ state: "pending" });
    await expect(
      transitionFinancingRelease("approve", h.transition(prepared), principal, h.ports),
    ).rejects.toMatchObject({ status: 503 });
    h.reserveAs(null);
    for (const patch of [
      { expectedRevision: 2 },
      { expectedBundleHash: "b".repeat(64) },
      { expectedEvidenceHash: "c".repeat(64) },
    ])
      await expect(
        transitionFinancingRelease(
          "approve",
          { ...h.transition(prepared), ...patch },
          principal,
          h.ports,
        ),
      ).rejects.toMatchObject({ status: 409 });
    await expect(
      transitionFinancingRelease("publish", h.transition(prepared), principal, h.ports),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      transitionFinancingRelease(
        "approve",
        h.transition(prepared),
        { ...principal, locationRef: "location_foreign001" },
        h.ports,
      ),
    ).rejects.toMatchObject({ status: 404 });
    h.reserveAs({ state: "completed", releaseRef: "release_foreign001" });
    await expect(
      transitionFinancingRelease("approve", h.transition(prepared), principal, h.ports),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("retains rejection and append-only revoke during provider outage", async () => {
    const h = harness(),
      prepared = await h.prepare(),
      rejected = await transitionFinancingRelease(
        "reject",
        h.transition(prepared),
        principal,
        h.ports,
      );
    expect(rejected.state).toBe("rejected");
    await expect(
      transitionFinancingRelease("reject", h.transition(rejected, uuid(3)), principal, h.ports),
    ).rejects.toMatchObject({ status: 409 });
    vi.mocked(h.ports.resolve).mockRejectedValue(new Error("Provider unavailable"));
    const command = h.transition(rejected, uuid(4)),
      revoked = await transitionFinancingRelease("revoke", command, principal, h.ports);
    expect(revoked.revokedBy).toBe(principal.actorRef);
    expect(await transitionFinancingRelease("revoke", command, principal, h.ports)).toEqual(
      revoked,
    );
    h.setClock("2030-01-02T12:00:00.000Z");
    expect(
      await transitionFinancingRelease(
        "revoke",
        h.transition(revoked, uuid(5)),
        principal,
        h.ports,
      ),
    ).toEqual(revoked);
  });
  it("refuses repeated approve/reject after publishing", async () => {
    const h = harness(),
      record = await h.publish();
    await expect(
      transitionFinancingRelease("approve", h.transition(record, uuid(30)), principal, h.ports),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      transitionFinancingRelease("reject", h.transition(record, uuid(31)), principal, h.ports),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("checks authorization before reserving", async () => {
    const h = harness();
    vi.mocked(h.ports.authorize).mockRejectedValue(new Error("Unauthorized"));
    await expect(h.prepare()).rejects.toThrow("Unauthorized");
    expect(h.tx.reserve).not.toHaveBeenCalled();
  });
});
describe("current public reads, delivery eligibility and inquiry", () => {
  it.each(["read", "capture", "delivery-claim", "delivery-dispatch"] as const)(
    "requires published state for %s",
    async (stage) => {
      const h = harness(),
        record = await h.prepare();
      await expect(
        assertFinancingReleaseEligible(record, principal, h.ports, stage),
      ).rejects.toMatchObject({ status: 422 });
    },
  );
  it.each([
    "malformed",
    "unknown",
    "foreignHost",
    "expired",
    "revoked",
    "unavailable",
    "bytes",
    "hash",
    "approval",
  ])("returns identical anonymous denial for %s", async (problem) => {
    const h = harness(),
      record = await h.publish();
    let id = record.snapshot.publicationId,
      origin = "https://property.example.org";
    if (problem === "malformed") id = "bad";
    if (problem === "unknown") id = uuid(800);
    if (problem === "foreignHost") origin = "https://foreign.example.org";
    if (problem === "expired") h.setClock(expiry);
    if (problem === "revoked")
      await transitionFinancingRelease("revoke", h.transition(record, uuid(4)), principal, h.ports);
    if (problem === "unavailable")
      vi.mocked(h.ports.resolve).mockRejectedValue(new Error("Private evidence error"));
    if (problem === "bytes")
      h.artifacts.set(record.snapshot.outputSeals[1].artifactRef, new Uint8Array([8]));
    if (problem === "hash") {
      record.snapshot.bundleHash = "a".repeat(64);
      h.records.set(record.snapshot.releaseRef, record);
    }
    if (problem === "approval") {
      record.approval!.outputSealsHash = "a".repeat(64);
      h.records.set(record.snapshot.releaseRef, record);
    }
    await expect(readPublicFinancingRelease(id, origin, h.ports)).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });
  it.each([
    "evidence",
    "campaign",
    "version",
    "manifest",
    "calculated",
    "presentation",
    "origin",
    "bundle",
    "approvalEvidence",
    "approvalBundle",
    "approvalRelease",
    "foreignPrincipal",
  ])("refuses exact delivery retry after %s drift", async (problem) => {
    const h = harness(),
      record = await h.publish();
    if (problem === "evidence")
      h.source.authority.propertyAuthority.revisionRef = "revision_changed001";
    if (problem === "campaign") h.source.sourceVersion.campaignRef = "campaign_changed001";
    if (problem === "version")
      h.source.sourceVersion.campaignVersionRef = "campaignversion_changed001";
    if (problem === "manifest") {
      const m = FinancingCampaignManifestSchema.parse(h.source.sourceVersion.manifest);
      m.property.address = "Changed address";
      h.source.sourceVersion.manifest = m;
      h.source.sourceVersion.manifestHash = hash(m);
    }
    if (problem === "calculated") {
      record.snapshot.calculatedHash = "a".repeat(64);
      reseal(record);
    }
    if (problem === "presentation") {
      record.snapshot.presentation.address = "Changed display";
      reseal(record);
    }
    if (problem === "origin")
      h.source.authority.origin.canonicalOrigin = "https://changed.example.org";
    if (problem === "bundle") record.snapshot.bundleHash = "a".repeat(64);
    if (problem === "approvalEvidence") record.approval!.evidenceHash = "a".repeat(64);
    if (problem === "approvalBundle") record.approval!.bundleHash = "a".repeat(64);
    if (problem === "approvalRelease") record.approval!.releaseRef = "release_changed001";
    await expect(
      assertFinancingReleaseEligible(
        record,
        problem === "foreignPrincipal"
          ? { ...principal, locationRef: "location_foreign001" }
          : principal,
        h.ports,
        "delivery-dispatch",
      ),
    ).rejects.toMatchObject({ status: 422 });
  });
  it("deduplicates normalized inquiry and preserves immutable attribution and transient policy", async () => {
    const h = harness(),
      record = await h.publish();
    const first = await captureFinancingInquiry(
      record.snapshot.publicationId,
      "https://property.example.org",
      inquiry,
      h.ports,
    );
    expect(
      await captureFinancingInquiry(
        record.snapshot.publicationId,
        "https://property.example.org",
        { ...inquiry, firstName: " Synthetic ", email: " PERSON@EXAMPLE.INVALID " },
        h.ports,
      ),
    ).toEqual(first);
    expect(first.deliveryState).toBe("pending");
    expect(h.inquiries.size).toBe(1);
    expect(Date.parse(first.expiresAt) - Date.parse(first.acceptedAt)).toBe(30 * 86_400_000);
    await expect(
      captureFinancingInquiry(
        record.snapshot.publicationId,
        "https://property.example.org",
        { ...inquiry, email: "changed@example.invalid" },
        h.ports,
      ),
    ).rejects.toMatchObject({ status: 409 });
    const saved = vi.mocked(h.tx.capture).mock.calls[0]![0];
    expect(saved.snapshot.partnerVersionRef).toBe(record.snapshot.partnerVersionRef);
    expect(saved.snapshot.authority.highlevelLocationRef).toBe("ghllocation_sample001");
  });
  it("refuses commit-boundary revocation before storing inquiry", async () => {
    const h = harness(),
      record = await h.publish();
    vi.mocked(h.tx.assertEvidenceCurrent).mockRejectedValue(
      new FinancingReleaseError("INELIGIBLE", 422),
    );
    await expect(
      captureFinancingInquiry(
        record.snapshot.publicationId,
        "https://property.example.org",
        inquiry,
        h.ports,
      ),
    ).rejects.toMatchObject({ status: 422 });
    expect(h.tx.capture).not.toHaveBeenCalled();
  });
  it.each(["publication", "request", "retention", "expired", "future"])(
    "refuses %s capture receipt mismatch",
    async (problem) => {
      const h = harness(),
        record = await h.publish();
      const accepted =
        problem === "expired"
          ? "2020-01-01T00:00:00.000Z"
          : problem === "future"
            ? "2030-01-02T12:00:00.000Z"
            : now;
      vi.mocked(h.tx.capture).mockResolvedValue({
        inquiryId: uuid(999),
        publicationId: problem === "publication" ? uuid(98) : record.snapshot.publicationId,
        requestId: problem === "request" ? uuid(97) : inquiry.requestId,
        acceptedAt: accepted,
        expiresAt:
          problem === "retention"
            ? expiry
            : new Date(Date.parse(accepted) + 30 * 86_400_000).toISOString(),
        deliveryState: "pending",
      });
      await expect(
        captureFinancingInquiry(
          record.snapshot.publicationId,
          "https://property.example.org",
          inquiry,
          h.ports,
        ),
      ).rejects.toMatchObject({ status: 503 });
    },
  );
  it.each(["property", "lender", "partner"])(
    "requires exact saved %s authority, not a detached permission record",
    async (kind) => {
      const h = harness();
      if (kind === "property") h.source.authority.propertyAuthority.contentHash = "a".repeat(64);
      if (kind === "lender")
        h.source.authority.lenderIdentity.authority.contentHash = "a".repeat(64);
      if (kind === "partner")
        h.source.authority.partnerIdentity.authority.contentHash = "a".repeat(64);
      await expect(h.prepare()).rejects.toMatchObject({ status: 422 });
    },
  );
});
describe("saved identity media", () => {
  it("validates both authorized identity images in their exact saved order", async () => {
    const h = harness(),
      sample = sourceFixture(true).authority.mediaAuthorizations[0]!;
    h.source.authority.lenderIdentity.textOnly = false;
    h.source.authority.lenderIdentity.assetRefs = ["asset_lenderLogo001"];
    h.source.authority.partnerIdentity.textOnly = false;
    h.source.authority.partnerIdentity.assetRefs = ["asset_partnerLogo001"];
    h.source.authority.mediaAuthorizations = [
      { ...sample, assetRef: "asset_lenderLogo001", purpose: "lender-logo" },
      { ...sample, assetRef: "asset_partnerLogo001", purpose: "partner-logo" },
    ];
    const record = await h.prepare();
    expect(record.snapshot.mediaAuthorizations.map((item) => item.purpose)).toEqual([
      "lender-logo",
      "partner-logo",
    ]);
    expect(h.ports.assertNormalizedMedia).toHaveBeenCalledTimes(4);
  });
  it("refuses one image reused as two saved identity assets", async () => {
    const h = harness(),
      sample = sourceFixture(true).authority.mediaAuthorizations[0]!;
    h.source.authority.lenderIdentity.textOnly = false;
    h.source.authority.lenderIdentity.assetRefs = [sample.assetRef];
    h.source.authority.partnerIdentity.textOnly = false;
    h.source.authority.partnerIdentity.assetRefs = [sample.assetRef];
    h.source.authority.mediaAuthorizations = [
      { ...sample, purpose: "lender-logo" },
      { ...sample, purpose: "partner-logo" },
    ];
    await expect(h.prepare()).rejects.toMatchObject({ status: 422 });
  });
});
describe("public routing and current-content binding", () => {
  it.each(["routing", "origin"])("requires exact %s authority content", async (kind) => {
    const h = harness();
    if (kind === "routing") h.source.authority.routing.contentHash = "a".repeat(64);
    else h.source.authority.origin.authority.contentHash = "a".repeat(64);
    await expect(h.prepare()).rejects.toMatchObject({ status: 422 });
  });
  it("refuses a publication swap between read and capture lookup", async () => {
    const h = harness(),
      record = await h.publish();
    const switched = structuredClone(record);
    switched.snapshot.publicationId = uuid(404);
    switched.snapshot.canonicalUrl = `https://property.example.org/p/${uuid(404)}`;
    reseal(switched);
    switched.approval!.bundleHash = switched.snapshot.bundleHash;
    vi.mocked(h.ports.findPublication)
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce(switched);
    h.records.set(switched.snapshot.releaseRef, switched);
    await expect(
      captureFinancingInquiry(
        record.snapshot.publicationId,
        "https://property.example.org",
        inquiry,
        h.ports,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(h.tx.capture).not.toHaveBeenCalled();
  });
});
describe("capture snapshot race", () => {
  it("refuses a publication swap inside the atomic capture load", async () => {
    const h = harness(),
      record = await h.publish(),
      switched = structuredClone(record);
    switched.snapshot.publicationId = uuid(405);
    switched.snapshot.canonicalUrl = `https://property.example.org/p/${uuid(405)}`;
    reseal(switched);
    switched.approval!.bundleHash = switched.snapshot.bundleHash;
    vi.mocked(h.tx.load).mockResolvedValueOnce(switched);
    await expect(
      captureFinancingInquiry(
        record.snapshot.publicationId,
        "https://property.example.org",
        inquiry,
        h.ports,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(h.tx.capture).not.toHaveBeenCalled();
  });
});
describe("immutable snapshot field parity", () => {
  it.each(["quote", "media", "publicLink", "privacy", "approval"])(
    "refuses mismatched %s envelope metadata",
    async (part) => {
      const h = harness(true),
        record = await h.prepare();
      if (part === "quote") record.snapshot.quoteEvidence[0]!.scenarioInputHash = "a".repeat(64);
      if (part === "media") record.snapshot.mediaAuthorizations[0]!.sha256 = "a".repeat(64);
      if (part === "publicLink")
        record.snapshot.canonicalUrl =
          "https://foreign.example.org/p/00000000-0000-4000-8000-000000000100";
      if (part === "privacy")
        record.snapshot.presentation.privacyUrl = "https://foreign.example.org/privacy";
      if (part === "approval")
        record.approval = {
          releaseRef: record.snapshot.releaseRef,
          bundleHash: record.snapshot.bundleHash,
          evidenceHash: record.snapshot.evidenceHash,
          outputSealsHash: hash(record.snapshot.outputSeals),
          approvedBy: principal.actorRef,
          approvedAt: now,
        };
      await expect(
        assertFinancingReleaseEligible(reseal(record), principal, h.ports, "prepare"),
      ).rejects.toThrow();
    },
  );
});
