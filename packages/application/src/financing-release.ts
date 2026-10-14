import { createHash } from "node:crypto";
import { z } from "zod";
import {
  FinancingCampaignManifestSchema,
  FinancingPublicPresentationSchema,
  FinancingReleasePrepareRequestSchema,
  FinancingReleasePrincipalSchema,
  FinancingReleaseRecordSchema,
  FinancingReleaseResolvedSourceSchema,
  FinancingReleaseSnapshotSchema,
  FinancingReleaseTransitionRequestSchema,
  FinancingReleaseInquiryRequestSchema,
  FinancingInquiryReceiptSchema,
  OpaqueReferenceSchema,
  type FinancingReleaseAuthority,
  type FinancingReleaseEvidence,
  type FinancingReleaseOutputSeal,
  type FinancingReleasePrepareRequest,
  type FinancingReleasePrincipal,
  type FinancingReleaseRecord,
  type FinancingReleaseResolvedSource,
  type FinancingReleaseSnapshot,
  type FinancingReleaseInquiryRequest,
  type FinancingInquiryReceipt,
} from "@oalo/contracts";
import { calculateFinancingComparison } from "@oalo/domain";
import { canonicalCampaignHash as hash } from "./canonical-hash.js";

export class FinancingReleaseError extends Error {
  constructor(
    public readonly code: "INVALID" | "NOT_FOUND" | "CONFLICT" | "INELIGIBLE" | "UNAVAILABLE",
    public readonly status: 400 | 404 | 409 | 422 | 503,
  ) {
    super(`FINANCING_RELEASE_${code}`);
    this.name = "FinancingReleaseError";
  }
}
const fail = (
  code: FinancingReleaseError["code"],
  status: FinancingReleaseError["status"],
): never => {
  throw new FinancingReleaseError(code, status);
};
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export type FinancingReleaseStage =
  "prepare" | "approve" | "publish" | "read" | "capture" | "delivery-claim" | "delivery-dispatch";
export type FinancingReleaseCommand = "prepare" | "approve" | "publish" | "reject" | "revoke";
const ReservationSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("new") }).strict(),
  z.object({ state: z.literal("pending") }).strict(),
  z.object({ state: z.literal("completed"), releaseRef: OpaqueReferenceSchema }).strict(),
]);
const RenderedSchema = z
  .object({
    kind: z.enum(["site", "pdf"]),
    mimeType: z.enum(["text/html", "application/pdf"]),
    artifactRef: OpaqueReferenceSchema,
    rendererVersion: z.string().trim().min(1).max(80),
    bindingHash: z.string().regex(/^[a-f0-9]{64}$/u),
    bytes: z.instanceof(Uint8Array),
  })
  .strict();

/** Implementations must provide serializable transactions, durable key/content conflicts,
 * compare-and-swap revisions, and rollback of partial records/operations. No in-memory adapter
 * here is production persistence. Render/store side effects must be immutable and replay-safe. */
export interface FinancingReleaseTransaction {
  reserve(
    command: FinancingReleaseCommand,
    requestId: string,
    contentHash: string,
  ): Promise<unknown>;
  load(releaseRef: string): Promise<unknown>;
  save(record: FinancingReleaseRecord, expectedRevision: number | null): Promise<void>;
  /** Lock/revalidate authoritative rows at the transaction's commit boundary. Refuse revoked,
   * expired, changed, inaccessible or unknown evidence; do not accept a caller assertion. */
  assertEvidenceCurrent(snapshot: FinancingReleaseSnapshot, now: string): Promise<void>;
  complete(
    command: FinancingReleaseCommand,
    requestId: string,
    contentHash: string,
    releaseRef: string,
  ): Promise<void>;
  /** Encrypt normalized PII and atomically dedupe receipt, attribution and delivery outbox.
   * Same request/content returns the original receipt; changed content must throw CONFLICT. */
  capture(input: FinancingInquiryCapture): Promise<unknown>;
}
export interface FinancingInquiryCapture {
  readonly request: FinancingReleaseInquiryRequest;
  readonly contentHash: string;
  readonly snapshot: FinancingReleaseSnapshot;
  readonly acceptedAt: string;
  readonly expiresAt: string;
}
export interface FinancingReleasePorts {
  readonly now: () => Date;
  readonly newReleaseRef: () => string;
  readonly newPublicationId: () => string;
  /** Existing principal/session authority, checked for this exact location and each command.
   * Normal single-LO administrator may approve their own release. */
  authorize(principal: FinancingReleasePrincipal, command: FinancingReleaseCommand): Promise<void>;
  resolve(
    principal: FinancingReleasePrincipal,
    selection: FinancingReleasePrepareRequest | FinancingReleaseSnapshot,
    stage: FinancingReleaseStage,
  ): Promise<unknown>;
  readMedia(asset: FinancingReleaseAuthority["mediaAuthorizations"][number]): Promise<Uint8Array>;
  /** Decode actual bounded bytes and verify the exact recorded normalization/version. */
  assertNormalizedMedia(
    asset: FinancingReleaseAuthority["mediaAuthorizations"][number],
    bytes: Uint8Array,
  ): Promise<void>;
  render(input: FinancingReleaseRenderInput): Promise<readonly unknown[]>;
  /** Extract actual site/PDF financial rows, identity/disclosure/validity/canonical-link parity. */
  assertOutputParity(
    input: FinancingReleaseRenderInput,
    kind: "site" | "pdf",
    bytes: Uint8Array,
  ): Promise<void>;
  putOutput(seal: FinancingReleaseOutputSeal, bytes: Uint8Array): Promise<void>;
  readOutput(seal: FinancingReleaseOutputSeal): Promise<Uint8Array>;
  transaction<T>(
    locationRef: string,
    work: (transaction: FinancingReleaseTransaction) => Promise<T>,
  ): Promise<T>;
  /** Exact server-owned origin binding plus publication UUID, never client tenant selection. */
  findPublication(publicationId: string, canonicalOrigin: string): Promise<unknown>;
}
export interface FinancingReleaseRenderInput {
  readonly source: FinancingReleaseResolvedSource;
  readonly presentation: FinancingReleaseSnapshot["presentation"];
  readonly publicationId: string;
  readonly canonicalUrl: string;
  readonly manifestHash: string;
  readonly evidenceHash: string;
}

function evidence(authority: FinancingReleaseAuthority): FinancingReleaseEvidence[] {
  return [
    authority.propertyAuthority,
    authority.partnerIdentity.authority,
    authority.lenderIdentity.authority,
    authority.preset,
    ...authority.quoteEvidence.map((item) => item.authority),
    authority.disclosure,
    ...authority.mediaAuthorizations.map((item) => item.authority),
    authority.template,
    authority.routing,
    authority.consent,
    authority.origin.authority,
  ];
}
function verifySource(raw: unknown, principal: FinancingReleasePrincipal, now: Date) {
  const source = FinancingReleaseResolvedSourceSchema.parse(raw);
  const { sourceVersion: version, authority } = source;
  const manifest = FinancingCampaignManifestSchema.parse(version.manifest);
  const calculated = calculateFinancingComparison(manifest.financing);
  if (
    version.locationRef !== principal.locationRef ||
    hash(manifest) !== version.manifestHash ||
    hash(calculated) !== hash(manifest.calculated)
  )
    fail("INELIGIBLE", 422);
  if (
    authority.propertyAuthority.contentHash !== hash(manifest.property) ||
    authority.lenderIdentity.authority.contentHash !== authority.lenderIdentity.identityHash ||
    authority.partnerIdentity.authority.contentHash !== authority.partnerIdentity.identityHash
  )
    fail("INELIGIBLE", 422);
  if (
    authority.routing.contentHash !==
      hash({
        routingProfileVersionRef: authority.routingProfileVersionRef,
        highlevelLocationRef: authority.highlevelLocationRef,
        consentVersionRef: authority.consentVersionRef,
        inquiryPolicyVersion: authority.inquiryPolicyVersion,
      }) ||
    authority.origin.authority.contentHash !==
      hash({
        canonicalOrigin: authority.origin.canonicalOrigin,
        bindingRef: authority.origin.bindingRef,
      })
  )
    fail("INELIGIBLE", 422);
  for (const proof of evidence(authority)) {
    if (
      proof.locationRef !== principal.locationRef ||
      proof.revokedAt !== null ||
      Date.parse(proof.issuedAt) > now.getTime() ||
      Date.parse(proof.verifiedAt) > now.getTime() ||
      Date.parse(proof.expiresAt) <= now.getTime() ||
      !proof.channels.includes("site") ||
      !proof.channels.includes("pdf")
    )
      fail("INELIGIBLE", 422);
  }
  if (
    authority.presetInputHash !== hash(manifest.financing) ||
    authority.presetHash !== authority.preset.contentHash ||
    authority.disclosureHash !== hash(authority.disclosureText) ||
    authority.disclosureHash !== authority.disclosure.contentHash ||
    authority.consentHash !== hash(authority.consentText) ||
    authority.consentHash !== authority.consent.contentHash ||
    authority.templateHash !== authority.template.contentHash ||
    authority.partnerVersionRef !== authority.partnerIdentity.versionRef ||
    authority.lenderIdentityVersionRef !== authority.lenderIdentity.versionRef ||
    authority.partnerIdentity.identityHash !== hash(manifest.identities.realtor) ||
    authority.lenderIdentity.identityHash !== hash(manifest.identities.lender)
  )
    fail("INELIGIBLE", 422);
  if (authority.quoteEvidence.length !== manifest.financing.scenarios.length)
    fail("INELIGIBLE", 422);
  for (const [index, scenario] of manifest.financing.scenarios.entries()) {
    const proof = authority.quoteEvidence[index];
    if (
      !proof ||
      proof.scenarioId !== scenario.id ||
      proof.scenarioInputHash !==
        hash({
          purchasePriceMinor: manifest.financing.purchasePriceMinor,
          housing: manifest.financing.housing,
          scenario,
        }) ||
      proof.permittedAssumptionsHash !== hash(scenario.assumptions) ||
      proof.authority.contentHash !== proof.scenarioInputHash ||
      scenario.quote.aprMilliPercent === null ||
      Date.parse(scenario.quote.quotedAt) > now.getTime() ||
      Date.parse(scenario.quote.expiresAt) <= now.getTime() ||
      calculated.scenarios[index]?.missing.length !== 0
    )
      fail("INELIGIBLE", 422);
  }
  const propertyMedia = manifest.schemaVersion === 2 ? manifest.property.media : [];
  const expectedAssets = [
    ...propertyMedia.map((item) => item.mediaRef),
    ...authority.lenderIdentity.assetRefs,
    ...authority.partnerIdentity.assetRefs,
  ];
  const actualAssets = authority.mediaAuthorizations.map((item) => item.assetRef);
  if (
    new Set(expectedAssets).size !== expectedAssets.length ||
    hash(actualAssets) !== hash(expectedAssets)
  )
    fail("INELIGIBLE", 422);
  for (const [index, asset] of authority.mediaAuthorizations.entries()) {
    const property = propertyMedia[index];
    const expectedPurpose =
      index < propertyMedia.length
        ? "property"
        : index < propertyMedia.length + authority.lenderIdentity.assetRefs.length
          ? "lender-"
          : "partner-";
    if (
      !asset.purpose.startsWith(expectedPurpose) ||
      asset.authority.contentHash !== asset.sha256 ||
      Date.parse(asset.attestedAt) > now.getTime() ||
      (property &&
        (property.sha256 !== asset.sha256 ||
          property.byteSize !== asset.byteSize ||
          property.mimeType !== asset.mimeType ||
          property.normalizationVersion !== asset.normalizationVersion))
    )
      fail("INELIGIBLE", 422);
  }
  const validUntil = new Date(
    Math.min(
      ...evidence(authority).map((item) => Date.parse(item.expiresAt)),
      ...manifest.financing.scenarios.map((item) => Date.parse(item.quote.expiresAt)),
    ),
  ).toISOString();
  return { source, manifest, calculated, validUntil, evidenceHash: hash(authority) };
}

async function verifyMedia(source: FinancingReleaseResolvedSource, ports: FinancingReleasePorts) {
  for (const asset of source.authority.mediaAuthorizations) {
    const bytes = await ports.readMedia(asset);
    if (bytes.byteLength !== asset.byteSize || digest(bytes) !== asset.sha256)
      fail("INELIGIBLE", 422);
    await ports.assertNormalizedMedia(asset, bytes);
  }
}
function presentation(verified: ReturnType<typeof verifySource>, preparedAt: string) {
  const { manifest, authority } = {
    manifest: verified.manifest,
    authority: verified.source.authority,
  };
  return FinancingPublicPresentationSchema.parse({
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
    calculated: verified.calculated,
    disclosureText: authority.disclosureText,
    consentText: authority.consentText,
    privacyUrl: authority.privacyUrl,
    issuedAt: preparedAt,
    validUntil: verified.validUntil,
    estimateNotice:
      "Estimates based on the supplied assumptions. Not a loan commitment or eligibility determination.",
  });
}
function bundleHash(snapshot: FinancingReleaseSnapshot) {
  const { bundleHash: _bundleHash, ...body } = snapshot;
  return hash(body);
}
function renderInput(
  source: FinancingReleaseResolvedSource,
  snapshot: FinancingReleaseSnapshot,
): FinancingReleaseRenderInput {
  return {
    source,
    presentation: snapshot.presentation,
    publicationId: snapshot.publicationId,
    canonicalUrl: snapshot.canonicalUrl,
    manifestHash: snapshot.manifestHash,
    evidenceHash: snapshot.evidenceHash,
  };
}
/** Current evidence and actual stored outputs are rechecked even for previously successful retries. */
export async function assertFinancingReleaseEligible(
  raw: unknown,
  principalInput: unknown,
  ports: FinancingReleasePorts,
  stage: FinancingReleaseStage,
): Promise<FinancingReleaseRecord> {
  const principal = FinancingReleasePrincipalSchema.parse(principalInput);
  const record = FinancingReleaseRecordSchema.parse(raw),
    snapshot = record.snapshot;
  if (
    snapshot.locationRef !== principal.locationRef ||
    record.state === "revoked" ||
    record.state === "rejected" ||
    Date.parse(snapshot.validUntil) <= ports.now().getTime() ||
    record.revokedAt !== null ||
    bundleHash(snapshot) !== snapshot.bundleHash
  )
    fail("INELIGIBLE", 422);
  if (
    ["read", "capture", "delivery-claim", "delivery-dispatch"].includes(stage) &&
    record.state !== "published"
  )
    fail("INELIGIBLE", 422);
  const verified = verifySource(
    await ports.resolve(principal, snapshot, stage),
    principal,
    ports.now(),
  );
  if (
    hash(verified.source.authority) !== snapshot.evidenceHash ||
    verified.source.sourceVersion.campaignRef !== snapshot.campaignRef ||
    verified.source.sourceVersion.campaignVersionRef !== snapshot.campaignVersionRef ||
    verified.source.sourceVersion.manifestHash !== snapshot.manifestHash ||
    hash(verified.calculated) !== snapshot.calculatedHash ||
    verified.validUntil !== snapshot.validUntil ||
    hash(presentation(verified, snapshot.preparedAt)) !== hash(snapshot.presentation) ||
    snapshot.canonicalUrl !==
      `${verified.source.authority.origin.canonicalOrigin}/p/${snapshot.publicationId}`
  )
    fail("INELIGIBLE", 422);
  await verifyMedia(verified.source, ports);
  for (const seal of snapshot.outputSeals) {
    const bytes = await ports.readOutput(seal);
    if (bytes.byteLength !== seal.byteSize || digest(bytes) !== seal.sha256)
      fail("INELIGIBLE", 422);
    await ports.assertOutputParity(renderInput(verified.source, snapshot), seal.kind, bytes);
  }
  if (
    record.approval &&
    (record.approval.releaseRef !== snapshot.releaseRef ||
      record.approval.bundleHash !== snapshot.bundleHash ||
      record.approval.evidenceHash !== snapshot.evidenceHash ||
      record.approval.outputSealsHash !== hash(snapshot.outputSeals))
  )
    fail("INELIGIBLE", 422);
  return record;
}

export async function prepareFinancingRelease(
  input: unknown,
  principalInput: unknown,
  ports: FinancingReleasePorts,
): Promise<FinancingReleaseRecord> {
  const request = FinancingReleasePrepareRequestSchema.parse(input),
    principal = FinancingReleasePrincipalSchema.parse(principalInput);
  await ports.authorize(principal, "prepare");
  return ports.transaction(principal.locationRef, async (tx) => {
    const contentHash = hash(request),
      reservation = ReservationSchema.parse(
        await tx.reserve("prepare", request.requestId, contentHash),
      );
    if (reservation.state === "pending") fail("UNAVAILABLE", 503);
    if (reservation.state === "completed") {
      const previous = await assertFinancingReleaseEligible(
        await tx.load(reservation.releaseRef),
        principal,
        ports,
        "prepare",
      );
      await tx.assertEvidenceCurrent(previous.snapshot, ports.now().toISOString());
      return previous;
    }
    const now = ports.now(),
      verified = verifySource(await ports.resolve(principal, request, "prepare"), principal, now);
    const authority = verified.source.authority;
    for (const key of ["campaignRef", "campaignVersionRef"] as const)
      if (verified.source.sourceVersion[key] !== request[key]) fail("INELIGIBLE", 422);
    for (const key of [
      "propertyVersionRef",
      "partnerVersionRef",
      "lenderIdentityVersionRef",
      "presetVersionRef",
      "disclosureVersionRef",
      "templateVersionRef",
      "routingProfileVersionRef",
      "consentVersionRef",
    ] as const)
      if (authority[key] !== request[key]) fail("INELIGIBLE", 422);
    if (verified.evidenceHash !== request.expectedEvidenceHash) fail("CONFLICT", 409);
    await verifyMedia(verified.source, ports);
    const publicationId = z.uuid().parse(ports.newPublicationId()),
      canonicalUrl = `${authority.origin.canonicalOrigin}/p/${publicationId}`,
      preparedAt = now.toISOString();
    const view = presentation(verified, preparedAt);
    const plan: FinancingReleaseRenderInput = {
      source: verified.source,
      presentation: view,
      publicationId,
      canonicalUrl,
      manifestHash: verified.source.sourceVersion.manifestHash,
      evidenceHash: verified.evidenceHash,
    };
    const outputs = z
      .array(RenderedSchema)
      .length(2)
      .parse(await ports.render(plan));
    const seals: FinancingReleaseOutputSeal[] = [];
    for (const output of outputs) {
      if (output.bindingHash !== hash(plan)) fail("INELIGIBLE", 422);
      await ports.assertOutputParity(plan, output.kind, output.bytes);
      const { bytes, bindingHash: _bindingHash, ...descriptor } = output;
      const seal = { ...descriptor, byteSize: bytes.byteLength, sha256: digest(bytes) };
      seals.push(seal);
    }
    const unsealed = FinancingReleaseSnapshotSchema.parse({
      schemaVersion: 1,
      releaseRef: ports.newReleaseRef(),
      locationRef: principal.locationRef,
      actorRef: principal.actorRef,
      campaignRef: request.campaignRef,
      campaignVersionRef: request.campaignVersionRef,
      manifestHash: plan.manifestHash,
      propertyVersionRef: authority.propertyVersionRef,
      partnerVersionRef: authority.partnerVersionRef,
      lenderIdentityVersionRef: authority.lenderIdentityVersionRef,
      presetVersionRef: authority.presetVersionRef,
      presetHash: authority.presetHash,
      quoteEvidence: authority.quoteEvidence,
      disclosureVersionRef: authority.disclosureVersionRef,
      disclosureHash: authority.disclosureHash,
      mediaAuthorizations: authority.mediaAuthorizations,
      calculationVersion: verified.calculated.calculationVersion,
      calculatedHash: hash(verified.calculated),
      templateVersionRef: authority.templateVersionRef,
      templateHash: authority.templateHash,
      templateEntitlementRef: authority.templateEntitlementRef,
      routingProfileVersionRef: authority.routingProfileVersionRef,
      consentVersionRef: authority.consentVersionRef,
      privacyUrl: authority.privacyUrl,
      authority,
      evidenceHash: verified.evidenceHash,
      outputSeals: seals,
      presentation: view,
      publicationId,
      canonicalUrl,
      bundleHash: "0".repeat(64),
      preparedAt,
      validUntil: verified.validUntil,
    });
    const snapshot = { ...unsealed, bundleHash: bundleHash(unsealed) };
    for (const [index, output] of outputs.entries())
      await ports.putOutput(snapshot.outputSeals[index]!, output.bytes);
    const record = FinancingReleaseRecordSchema.parse({
      snapshot,
      revision: 1,
      state: "prepared",
      approval: null,
      publishedAt: null,
      revokedAt: null,
      revokedBy: null,
    });
    await assertFinancingReleaseEligible(record, principal, ports, "prepare");
    await tx.assertEvidenceCurrent(snapshot, ports.now().toISOString());
    await tx.save(record, null);
    await tx.complete("prepare", request.requestId, contentHash, snapshot.releaseRef);
    return record;
  });
}

export async function transitionFinancingRelease(
  command: Exclude<FinancingReleaseCommand, "prepare">,
  input: unknown,
  principalInput: unknown,
  ports: FinancingReleasePorts,
): Promise<FinancingReleaseRecord> {
  const request = FinancingReleaseTransitionRequestSchema.parse(input),
    principal = FinancingReleasePrincipalSchema.parse(principalInput);
  z.enum(["approve", "publish", "reject", "revoke"]).parse(command);
  await ports.authorize(principal, command);
  return ports.transaction(principal.locationRef, async (tx) => {
    const contentHash = hash({ command, ...request }),
      reservation = ReservationSchema.parse(
        await tx.reserve(command, request.requestId, contentHash),
      );
    if (reservation.state === "pending") fail("UNAVAILABLE", 503);
    let record = FinancingReleaseRecordSchema.parse(await tx.load(request.releaseRef));
    if (
      record.snapshot.locationRef !== principal.locationRef ||
      record.snapshot.releaseRef !== request.releaseRef
    )
      fail("NOT_FOUND", 404);
    if (
      record.snapshot.bundleHash !== request.expectedBundleHash ||
      record.snapshot.evidenceHash !== request.expectedEvidenceHash ||
      (reservation.state === "new" && record.revision !== request.expectedRevision) ||
      (reservation.state === "completed" && reservation.releaseRef !== request.releaseRef)
    )
      fail("CONFLICT", 409);
    if (command !== "revoke" && command !== "reject")
      record = await assertFinancingReleaseEligible(record, principal, ports, command);
    if (command !== "revoke" && command !== "reject")
      await tx.assertEvidenceCurrent(record.snapshot, ports.now().toISOString());
    if (reservation.state === "completed") return record;
    const now = ports.now().toISOString(),
      revision = record.revision;
    if (command === "approve") {
      if (record.state !== "prepared") fail("CONFLICT", 409);
      record = {
        ...record,
        state: "approved",
        approval: {
          releaseRef: record.snapshot.releaseRef,
          bundleHash: record.snapshot.bundleHash,
          evidenceHash: record.snapshot.evidenceHash,
          outputSealsHash: hash(record.snapshot.outputSeals),
          approvedBy: principal.actorRef,
          approvedAt: now,
        },
      };
    } else if (command === "publish") {
      if (record.state !== "approved" || record.approval === null) fail("CONFLICT", 409);
      record = { ...record, state: "published", publishedAt: now };
    } else if (command === "reject") {
      if (record.state !== "prepared") fail("CONFLICT", 409);
      record = { ...record, state: "rejected" };
    } else if (record.state === "revoked") {
      await tx.complete(command, request.requestId, contentHash, request.releaseRef);
      return record;
    } else record = { ...record, state: "revoked", revokedAt: now, revokedBy: principal.actorRef };
    record = FinancingReleaseRecordSchema.parse({ ...record, revision: revision + 1 });
    await tx.save(record, revision);
    await tx.complete(command, request.requestId, contentHash, request.releaseRef);
    return record;
  });
}

/** Caller must supply an origin already resolved by trusted host middleware, never raw Host. */
export async function readPublicFinancingRelease(
  publicationId: unknown,
  canonicalOrigin: string,
  ports: FinancingReleasePorts,
) {
  try {
    const id = z.uuid().parse(publicationId);
    const record = FinancingReleaseRecordSchema.parse(
      await ports.findPublication(id, canonicalOrigin),
    );
    if (
      record.state !== "published" ||
      record.approval === null ||
      record.publishedAt === null ||
      record.snapshot.publicationId !== id ||
      record.snapshot.authority.origin.canonicalOrigin !== canonicalOrigin
    )
      fail("NOT_FOUND", 404);
    await assertFinancingReleaseEligible(
      record,
      { locationRef: record.snapshot.locationRef, actorRef: record.snapshot.actorRef },
      ports,
      "read",
    );
    return {
      publicationId: id,
      canonicalUrl: record.snapshot.canonicalUrl,
      presentation: record.snapshot.presentation,
    };
  } catch {
    // Anonymous malformed, revoked, inaccessible and unavailable evidence share one safe result.
    return fail("NOT_FOUND", 404);
  }
}

export async function captureFinancingInquiry(
  publicationId: unknown,
  canonicalOrigin: string,
  input: unknown,
  ports: FinancingReleasePorts,
): Promise<FinancingInquiryReceipt> {
  const request = FinancingReleaseInquiryRequestSchema.parse(input);
  const publicView = await readPublicFinancingRelease(publicationId, canonicalOrigin, ports);
  const raw = await ports.findPublication(publicView.publicationId, canonicalOrigin);
  const record = FinancingReleaseRecordSchema.parse(raw);
  if (
    record.snapshot.publicationId !== publicView.publicationId ||
    record.snapshot.canonicalUrl !== publicView.canonicalUrl ||
    record.snapshot.authority.origin.canonicalOrigin !== canonicalOrigin
  )
    fail("NOT_FOUND", 404);
  return ports.transaction(record.snapshot.locationRef, async (tx) => {
    const current = await assertFinancingReleaseEligible(
      await tx.load(record.snapshot.releaseRef),
      { locationRef: record.snapshot.locationRef, actorRef: record.snapshot.actorRef },
      ports,
      "capture",
    );
    if (
      current.snapshot.publicationId !== publicView.publicationId ||
      current.snapshot.canonicalUrl !== publicView.canonicalUrl
    )
      fail("NOT_FOUND", 404);
    // Eligibility and the record schema already require published state, approval and timestamp.
    await tx.assertEvidenceCurrent(current.snapshot, ports.now().toISOString());
    const acceptedAt = ports.now().toISOString(),
      expiresAt = new Date(Date.parse(acceptedAt) + 30 * 86_400_000).toISOString();
    const receipt = FinancingInquiryReceiptSchema.parse(
      await tx.capture({
        request,
        contentHash: hash({
          publicationId: publicView.publicationId,
          request,
          consentHash: current.snapshot.authority.consentHash,
        }),
        snapshot: current.snapshot,
        acceptedAt,
        expiresAt,
      }),
    );
    if (
      receipt.publicationId !== publicView.publicationId ||
      receipt.requestId !== request.requestId ||
      Date.parse(receipt.expiresAt) !== Date.parse(receipt.acceptedAt) + 30 * 86_400_000 ||
      Date.parse(receipt.expiresAt) <= ports.now().getTime() ||
      Date.parse(receipt.acceptedAt) > ports.now().getTime()
    )
      fail("UNAVAILABLE", 503);
    return receipt;
  });
}
