import { z } from "zod";
import {
  ApprovalDecisionSchema,
  CampaignVersionSchema,
  WebinarAdCampaignManifestSchema,
  PreflightResultSchema,
  OpaqueReferenceSchema,
  WebinarProviderLaunchInputSchema,
  WebinarProviderLaunchSchema,
  WebinarPublisherQualificationSchema,
  WebinarPublisherPauseQualificationSchema,
  WebinarPublisherSummaryRequestSchema,
  WebinarPublisherSummarySchema,
  WebinarPublisherCommandSchema,
  WebinarPublisherLaunchRecordSchema,
  WebinarPublisherOperationSchema,
  WebinarPublisherTaskSchema,
  WebinarPublisherCommandResultSchema,
  WebinarPublisherNativeIdsSchema,
  WebinarPublisherReadinessCodeSchema,
  type WebinarProviderLaunch,
  type WebinarPublisherAction,
  type WebinarPublisherSelection,
  type WebinarPublisherSummary,
  type WebinarPublisherOperation,
  type WebinarPublisherTask,
  type WebinarPublisherCommandResult,
  type WebinarPublisherLaunchRecord,
} from "@oalo/contracts";
import { canonicalCampaignHash } from "./canonical-hash.js";
import { createApprovalDecision } from "./campaign-foundation.js";
import {
  freezeAuthenticatedPrincipal,
  createSessionApprovalAuthority,
  CampaignCommandForbiddenError,
  CampaignResourceNotAccessibleError,
  type AuthenticatedPrincipal,
} from "./campaign-command-context.js";
import {
  assertWebinarAdEvidenceCurrent,
  type WebinarAdEvidencePort,
} from "./webinar-ad-evidence.js";

const EvidenceSchema = z
  .object({
    version: CampaignVersionSchema.extend({ manifest: WebinarAdCampaignManifestSchema }),
    preflight: PreflightResultSchema,
    approval: ApprovalDecisionSchema,
    state: z.literal("approved"),
  })
  .strict();
const ResolvedSelectionSchema = z
  .object({
    adAccountRef: OpaqueReferenceSchema,
    pageRef: OpaqueReferenceSchema,
    assets: WebinarProviderLaunchInputSchema.shape.assets,
    accountLabel: z.string().min(1).max(300),
    pageLabel: z.string().min(1).max(300),
    geographies: z
      .array(
        WebinarProviderLaunchInputSchema.shape.geographies.element
          .extend({
            selectionRef: OpaqueReferenceSchema,
            approvedPlace: z.string().min(1).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    providerContract: WebinarProviderLaunchInputSchema.shape.providerContract,
    totalSemantics: WebinarProviderLaunchInputSchema.shape.budget.shape.totalSemantics,
  })
  .strict();
export type WebinarPublisherResolvedSelection = z.infer<typeof ResolvedSelectionSchema>;
export type WebinarPublisherCampaignEvidence = z.infer<typeof EvidenceSchema>;

export class WebinarPublisherCommandError extends Error {
  public constructor(
    public readonly code:
      | "STALE_EVIDENCE"
      | "CONFIRMATION_STALE"
      | "REQUEST_CONFLICT"
      | "ACTION_NOT_READY"
      | "PROVIDER_CONTRACT_UNQUALIFIED",
  ) {
    super(code);
    this.name = "WebinarPublisherCommandError";
  }
}

/** Implement with a tenant-scoped serializable transaction. Lock current session/installation
 * authority and its role-version provenance, campaign/current approval,
 * projection lineage and request identity through callback completion. Reserve the operation,
 * lineage CAS, attempt provenance and outbox atomically. No production in-memory adapter. */
export interface WebinarPublisherCommandTransaction {
  loadCurrentEvidence(campaignRef: string): Promise<unknown>;
  resolveSelection(
    input: Readonly<{
      version: WebinarPublisherCampaignEvidence["version"];
      selection: WebinarPublisherSelection;
    }>,
  ): Promise<unknown>;
  insertSummary(summary: WebinarPublisherSummary): Promise<unknown>;
  loadLaunch(projectionRef: string): Promise<unknown>;
  findCommand(requestId: string): Promise<unknown>;
  reserveCommand(
    input: Readonly<{
      operation: WebinarPublisherOperation;
      task: WebinarPublisherTask;
      expectedRowVersion: number;
      expectedState: WebinarPublisherLaunchRecord["state"];
      principal: Readonly<AuthenticatedPrincipal>;
    }>,
  ): Promise<unknown>;
}
export interface WebinarPublisherCommandRepository {
  run<T>(
    principal: Readonly<AuthenticatedPrincipal>,
    work: (tx: WebinarPublisherCommandTransaction) => Promise<T>,
  ): Promise<T>;
}
export interface WebinarPublisherCommandPorts {
  repository: WebinarPublisherCommandRepository;
  evidence: WebinarAdEvidencePort;
  /** Fresh session/installation/role, not the serialized role captured at summary creation. */
  currentPrincipal(principal: Readonly<AuthenticatedPrincipal>): Promise<AuthenticatedPrincipal>;
  /** Resolve current installation assets and ownership even for stop-spend operations. */
  assertOwnedLineage(
    input: Readonly<{
      principal: Readonly<AuthenticatedPrincipal>;
      launch: WebinarPublisherLaunchRecord;
      action: WebinarPublisherAction;
    }>,
  ): Promise<void>;
  /** Trusted authority verifies real evidence provenance in addition to proof shape. Pause and
   * cancel qualify their own transport and ownership without requiring expired media/creative. */
  provider: {
    readiness(input: Readonly<{ projection: WebinarProviderLaunch; now: Date }>): Promise<unknown>;
    assertCurrent(
      input: Readonly<{
        projection: WebinarProviderLaunch;
        nativeIds: WebinarPublisherLaunchRecord["nativeIds"];
        action: WebinarPublisherAction;
        principal: Readonly<AuthenticatedPrincipal>;
        now: Date;
      }>,
    ): Promise<unknown>;
  };
  allocateRef(kind: "projection" | "operation" | "correlation"): string;
  now(): Date;
  /** Explicit dependency injection for offline tests. Production callers omit this. */
  executionMode?: "production" | "offline";
}

async function owner(
  principal: Readonly<AuthenticatedPrincipal>,
  ports: WebinarPublisherCommandPorts,
) {
  const supplied = freezeAuthenticatedPrincipal(principal);
  const current = freezeAuthenticatedPrincipal(await ports.currentPrincipal(supplied));
  if (
    current.actorId !== supplied.actorId ||
    current.actorRef !== supplied.actorRef ||
    current.locationId !== supplied.locationId ||
    current.locationRef !== supplied.locationRef ||
    current.installationRef !== supplied.installationRef ||
    current.sessionId !== supplied.sessionId ||
    current.role !== "location_admin" ||
    (current.authenticationMode === "local_synthetic" && ports.executionMode !== "offline")
  ) {
    throw new CampaignCommandForbiddenError();
  }
  return current;
}
function now(ports: WebinarPublisherCommandPorts): Date {
  return new Date(z.iso.datetime().parse(ports.now().toISOString()));
}
function ref(
  ports: WebinarPublisherCommandPorts,
  kind: "projection" | "operation" | "correlation",
) {
  return OpaqueReferenceSchema.parse(ports.allocateRef(kind));
}
function accessible(
  launch: WebinarPublisherLaunchRecord,
  principal: Readonly<AuthenticatedPrincipal>,
) {
  if (
    launch.summary.projection.locationRef !== principal.locationRef ||
    launch.summary.projection.createdBy !== principal.actorRef
  )
    throw new CampaignResourceNotAccessibleError();
}
function assertSummary(summary: WebinarPublisherSummary) {
  const { summaryHash, ...body } = summary;
  const { projectionHash, ...projection } = summary.projection;
  if (
    canonicalCampaignHash(body) !== summaryHash ||
    canonicalCampaignHash(projection) !== projectionHash
  )
    throw new WebinarPublisherCommandError("STALE_EVIDENCE");
}
async function evidence(
  tx: WebinarPublisherCommandTransaction,
  campaignRef: string,
  principal: Readonly<AuthenticatedPrincipal>,
  checkedAt: Date,
  ports: WebinarPublisherCommandPorts,
) {
  const raw = await tx.loadCurrentEvidence(campaignRef);
  if (raw === undefined) throw new CampaignResourceNotAccessibleError();
  const current = EvidenceSchema.parse(raw);
  const { version, approval, preflight } = current;
  if (
    version.locationRef !== principal.locationRef ||
    version.createdBy !== principal.actorRef ||
    version.campaignRef !== campaignRef
  )
    throw new CampaignResourceNotAccessibleError();
  if (
    approval.decision !== "approved" ||
    approval.locationRef !== version.locationRef ||
    approval.campaignRef !== version.campaignRef ||
    approval.campaignVersionRef !== version.campaignVersionRef ||
    approval.manifestHash !== version.manifestHash ||
    approval.preflightResultHash !== preflight.resultHash ||
    approval.actorRef !== principal.actorRef ||
    approval.actorRole !== "location_admin" ||
    Date.parse(approval.decidedAt) > checkedAt.getTime()
  )
    throw new WebinarPublisherCommandError("STALE_EVIDENCE");
  await assertWebinarAdEvidenceCurrent(version, checkedAt, ports.evidence);
  const candidate = await createApprovalDecision(
    {
      approvalRef: approval.approvalRef,
      campaignVersion: version,
      preflight,
      actorRef: principal.actorRef,
      actorKind: "human",
      actorRole: "location_admin",
      decidedAt: checkedAt,
      ipAuditHash: approval.ipAuditHash,
      decision: "approved",
      approverDisplayName: approval.snapshot.approverDisplayName,
    },
    createSessionApprovalAuthority(principal),
    ports.evidence,
  );
  if (canonicalCampaignHash(candidate.snapshot) !== canonicalCampaignHash(approval.snapshot))
    throw new WebinarPublisherCommandError("STALE_EVIDENCE");
  return current;
}

async function projectionFor(
  tx: WebinarPublisherCommandTransaction,
  current: WebinarPublisherCampaignEvidence,
  selection: WebinarPublisherSelection,
  identity: Readonly<{ projectionRef: string; createdBy: string; createdAt: string }>,
) {
  const resolved = ResolvedSelectionSchema.parse(
    await tx.resolveSelection({ version: current.version, selection }),
  );
  const manifest = current.version.manifest;
  const square = manifest.images[1];
  const approved = [...manifest.meta.targeting.regions, ...manifest.meta.targeting.cities];
  if (
    resolved.adAccountRef !== selection.adAccountRef ||
    resolved.pageRef !== selection.pageRef ||
    selection.creativeAssetRef !== square.assetRef ||
    resolved.geographies.length !== selection.geographyRefs.length ||
    resolved.geographies.length !== approved.length ||
    new Set(resolved.geographies.map((geo) => geo.selectionRef)).size !==
      resolved.geographies.length ||
    resolved.geographies.some(
      (geo, index) =>
        geo.selectionRef !== selection.geographyRefs[index] ||
        geo.selectionType !== "include" ||
        !approved.includes(geo.approvedPlace),
    ) ||
    new Set(resolved.geographies.map((geo) => geo.approvedPlace)).size !== approved.length
  )
    throw new WebinarPublisherCommandError("STALE_EVIDENCE");
  const body = WebinarProviderLaunchInputSchema.parse({
    schemaVersion: 1,
    kind: "webinar-provider-launch",
    contractId: "CTR-003",
    contractRevision: 1,
    projectionRef: identity.projectionRef,
    createdBy: identity.createdBy,
    createdAt: identity.createdAt,
    locationRef: current.version.locationRef,
    campaignRef: current.version.campaignRef,
    campaignVersionRef: current.version.campaignVersionRef,
    manifestHash: current.version.manifestHash,
    preflightHash: current.preflight.resultHash,
    approvalRef: current.approval.approvalRef,
    destination: {
      publicationId: manifest.destination.publicationId,
      sourceRevision: manifest.destination.sourceRevision,
      snapshotHash: manifest.destination.snapshotHash,
      destinationHash: manifest.destinationHash,
      publicUrl: manifest.destination.publicUrl,
    },
    templateSourceHash: manifest.template.sourceHash,
    brandHash: canonicalCampaignHash(manifest.advertiser),
    copyHash: canonicalCampaignHash({
      headline: manifest.content.headline,
      primaryText: manifest.content.body,
      callToAction: manifest.content.callToAction,
    }),
    advertiserIdentity: { kind: "loan_officer", displayName: manifest.advertiser.name },
    copy: {
      primaryText: manifest.content.body,
      headline: manifest.content.headline,
      description: manifest.content.disclosureText,
    },
    creative: {
      shape: square.shape,
      assetRef: square.assetRef,
      digest: square.contentSha256,
      width: square.width,
      height: square.height,
      byteLength: square.byteLength,
      rendererVersion: square.rendererVersion,
    },
    assets: resolved.assets,
    objective: "OUTCOME_TRAFFIC",
    cta: "LEARN_MORE",
    placements: manifest.meta.placements,
    specialAdCategories: [manifest.meta.specialAdCategory],
    geographies: resolved.geographies.map(
      ({ selectionRef: _ref, approvedPlace: _place, ...geo }) => geo,
    ),
    schedule: {
      startPolicy: "immediate",
      endsAt: manifest.schedule.endsAt,
      timezone: resolved.assets.timezone,
    },
    budget: {
      currency: "USD",
      dailyBudgetMinor: manifest.meta.dailyBudgetMinor,
      totalBudgetMinor: manifest.meta.totalBudgetMinor,
      nativeMode: "DAILY",
      totalSemantics: resolved.totalSemantics,
      boundsHash: canonicalCampaignHash({
        dailyBudgetMinor: manifest.meta.dailyBudgetMinor,
        totalBudgetMinor: manifest.meta.totalBudgetMinor,
      }),
    },
    providerContract: resolved.providerContract,
  });
  return {
    projection: WebinarProviderLaunchSchema.parse({
      ...body,
      projectionHash: canonicalCampaignHash(body),
    }),
    resolved,
  };
}

export async function prepareWebinarPublisherSummary(
  input: unknown,
  principal: Readonly<AuthenticatedPrincipal>,
  ports: WebinarPublisherCommandPorts,
): Promise<WebinarPublisherLaunchRecord> {
  const request = WebinarPublisherSummaryRequestSchema.parse(input);
  const currentOwner = await owner(principal, ports);
  return ports.repository.run(currentOwner, async (tx) => {
    const checkedAt = now(ports);
    const current = await evidence(tx, request.campaignRef, currentOwner, checkedAt, ports);
    if (
      request.campaignVersionRef !== current.version.campaignVersionRef ||
      request.expectedManifestHash !== current.version.manifestHash ||
      request.expectedPreflightHash !== current.preflight.resultHash
    )
      throw new WebinarPublisherCommandError("STALE_EVIDENCE");
    const { projection, resolved } = await projectionFor(tx, current, request.selection, {
      projectionRef: ref(ports, "projection"),
      createdBy: currentOwner.actorRef,
      createdAt: checkedAt.toISOString(),
    });
    const readiness = z
      .array(WebinarPublisherReadinessCodeSchema)
      .max(3)
      .parse(await ports.provider.readiness({ projection, now: checkedAt }));
    const body = {
      schemaVersion: 1 as const,
      contractId: "CTR-003" as const,
      contractRevision: 1 as const,
      projection,
      selection: request.selection,
      accountLabel: resolved.accountLabel,
      pageLabel: resolved.pageLabel,
      readiness,
    };
    const summary = WebinarPublisherSummarySchema.parse({
      ...body,
      summaryHash: canonicalCampaignHash(body),
    });
    const stored = WebinarPublisherLaunchRecordSchema.parse(await tx.insertSummary(summary));
    if (
      canonicalCampaignHash(stored.summary) !== canonicalCampaignHash(summary) ||
      stored.rowVersion !== 1 ||
      stored.state !== "reserved" ||
      Object.values(stored.nativeIds).some((id) => id !== null)
    )
      throw new WebinarPublisherCommandError("STALE_EVIDENCE");
    return stored;
  });
}

export function webinarPublisherConfirmationHash(
  input: Readonly<{
    action: WebinarPublisherAction;
    summary: WebinarPublisherSummary;
    nativeIds: WebinarPublisherLaunchRecord["nativeIds"];
  }>,
): string {
  const summary = WebinarPublisherSummarySchema.parse(input.summary);
  assertSummary(summary);
  return canonicalCampaignHash({
    contractId: "CTR-003",
    contractRevision: 1,
    action: WebinarPublisherCommandSchema.shape.action.parse(input.action),
    projectionHash: summary.projection.projectionHash,
    summaryHash: summary.summaryHash,
    nativeIds: WebinarPublisherNativeIdsSchema.parse(input.nativeIds),
  });
}
async function capability(
  launch: WebinarPublisherLaunchRecord,
  action: WebinarPublisherAction,
  principal: Readonly<AuthenticatedPrincipal>,
  checkedAt: Date,
  ports: WebinarPublisherCommandPorts,
) {
  const raw = await ports.provider.assertCurrent({
    projection: launch.summary.projection,
    nativeIds: launch.nativeIds,
    action,
    principal,
    now: checkedAt,
  });
  // Stop controls are independently authorized by the transport authority. They deliberately
  // do not depend on qualification/media leases of an expired creative.
  if (action === "cancel") return;
  if (action === "pause") {
    const control = WebinarPublisherPauseQualificationSchema.safeParse(raw);
    const projection = launch.summary.projection;
    if (!control.success) throw new WebinarPublisherCommandError("PROVIDER_CONTRACT_UNQUALIFIED");
    const proof = control.data;
    if (
      (proof.kind !== "app_test" && ports.executionMode !== "offline") ||
      proof.projectionHash !== projection.projectionHash ||
      proof.wireMappingHash !== projection.providerContract.wireMappingHash ||
      proof.locationId !== projection.assets.locationId ||
      proof.adAccountId !== projection.assets.adAccountId ||
      proof.campaignId !== launch.nativeIds.campaignId ||
      Date.parse(proof.observedAt) > checkedAt.getTime() ||
      Date.parse(proof.expiresAt) <= checkedAt.getTime()
    )
      throw new WebinarPublisherCommandError("PROVIDER_CONTRACT_UNQUALIFIED");
    return;
  }
  const proof = WebinarPublisherQualificationSchema.safeParse(raw);
  const projection = launch.summary.projection;
  if (!proof.success) throw new WebinarPublisherCommandError("PROVIDER_CONTRACT_UNQUALIFIED");
  const q = proof.data;
  if (
    (q.kind !== "app_test" && ports.executionMode !== "offline") ||
    projection.budget.totalSemantics !== "estimated_ceiling" ||
    q.projectionHash !== projection.projectionHash ||
    q.wireMappingHash !== projection.providerContract.wireMappingHash ||
    q.locationId !== projection.assets.locationId ||
    q.adAccountId !== projection.assets.adAccountId ||
    q.pageId !== projection.assets.pageId ||
    q.timezone !== projection.assets.timezone ||
    q.budget.amountMajor !== projection.budget.dailyBudgetMinor / 100 ||
    q.schedule.requestEnd !== projection.schedule.endsAt ||
    q.schedule.observedStop !== projection.schedule.endsAt ||
    Date.parse(q.observedAt) > checkedAt.getTime() ||
    Date.parse(q.expiresAt) <= checkedAt.getTime()
  )
    throw new WebinarPublisherCommandError("PROVIDER_CONTRACT_UNQUALIFIED");
}
function actionReady(launch: WebinarPublisherLaunchRecord, action: WebinarPublisherAction) {
  const ids = launch.nativeIds;
  const ready =
    action === "draft"
      ? launch.state === "reserved" && ids.campaignId === null
      : action === "publish"
        ? launch.state === "draft_ready" && ids.adId !== null
        : action === "resume"
          ? launch.state === "paused" && ids.adId !== null
          : action === "pause"
            ? ids.campaignId !== null && launch.state !== "cancelled"
            : [
                "reserved",
                "drafting",
                "publish_queued",
                "publishing",
                "pause_pending",
                "resume_pending",
                "uncertain",
              ].includes(launch.state);
  if (!ready) throw new WebinarPublisherCommandError("ACTION_NOT_READY");
}
export async function executeWebinarPublisherCommand(
  input: unknown,
  principal: Readonly<AuthenticatedPrincipal>,
  ports: WebinarPublisherCommandPorts,
): Promise<WebinarPublisherCommandResult> {
  const command = WebinarPublisherCommandSchema.parse(input);
  const currentOwner = await owner(principal, ports);
  return ports.repository.run(currentOwner, async (tx) => {
    const raw = await tx.loadLaunch(command.projectionRef);
    if (raw === undefined) throw new CampaignResourceNotAccessibleError();
    const launch = WebinarPublisherLaunchRecordSchema.parse(raw);
    accessible(launch, currentOwner);
    assertSummary(launch.summary);
    const projection = launch.summary.projection;
    if (
      projection.projectionRef !== command.projectionRef ||
      projection.projectionHash !== command.expectedProjectionHash
    )
      throw new WebinarPublisherCommandError("STALE_EVIDENCE");
    const checkedAt = now(ports);
    await ports.assertOwnedLineage({ principal: currentOwner, launch, action: command.action });
    if (command.action !== "pause" && command.action !== "cancel") {
      const current = await evidence(tx, projection.campaignRef, currentOwner, checkedAt, ports);
      const regenerated = await projectionFor(tx, current, launch.summary.selection, projection);
      if (
        regenerated.projection.projectionHash !== projection.projectionHash ||
        regenerated.resolved.accountLabel !== launch.summary.accountLabel ||
        regenerated.resolved.pageLabel !== launch.summary.pageLabel
      )
        throw new WebinarPublisherCommandError("STALE_EVIDENCE");
    }
    await capability(launch, command.action, currentOwner, checkedAt, ports);
    const requestHash = canonicalCampaignHash(command);
    const previous = await tx.findCommand(command.requestId);
    if (previous !== undefined) {
      const operation = WebinarPublisherOperationSchema.parse(previous);
      if (
        operation.locationRef !== currentOwner.locationRef ||
        operation.actorRef !== currentOwner.actorRef ||
        operation.requestId !== command.requestId ||
        operation.projectionRef !== command.projectionRef ||
        operation.expectedRowVersion !== command.expectedRowVersion ||
        operation.confirmationHash !== command.confirmationHash ||
        operation.requestHash !== requestHash ||
        operation.projectionHash !== projection.projectionHash ||
        operation.summaryHash !== launch.summary.summaryHash ||
        operation.action !== command.action ||
        operation.confirmationHash !==
          webinarPublisherConfirmationHash({
            action: command.action,
            summary: launch.summary,
            nativeIds: operation.nativeIdsAtConfirmation,
          })
      )
        throw new WebinarPublisherCommandError("REQUEST_CONFLICT");
      return result(operation, true);
    }
    if (launch.rowVersion !== command.expectedRowVersion)
      throw new WebinarPublisherCommandError("STALE_EVIDENCE");
    if (
      command.confirmationHash !==
      webinarPublisherConfirmationHash({
        action: command.action,
        summary: launch.summary,
        nativeIds: launch.nativeIds,
      })
    )
      throw new WebinarPublisherCommandError("CONFIRMATION_STALE");
    actionReady(launch, command.action);
    const operation = WebinarPublisherOperationSchema.parse({
      schemaVersion: 1,
      contractId: "CTR-003",
      contractRevision: 1,
      operationRef: ref(ports, "operation"),
      projectionRef: projection.projectionRef,
      projectionHash: projection.projectionHash,
      locationRef: currentOwner.locationRef,
      actorRef: currentOwner.actorRef,
      actorRoleVersion: currentOwner.roleVersion,
      requestId: command.requestId,
      expectedRowVersion: command.expectedRowVersion,
      requestHash,
      confirmationHash: command.confirmationHash,
      summaryHash: launch.summary.summaryHash,
      nativeIdsAtConfirmation: launch.nativeIds,
      action: command.action,
      state: "reserved",
      stage: "queued",
      correlationRef: ref(ports, "correlation"),
      createdAt: checkedAt.toISOString(),
      leaseGeneration: 0,
      providerObservedAt: null,
      lastSafeFailure: null,
    });
    const task = WebinarPublisherTaskSchema.parse({
      schemaVersion: 1,
      contractId: "CTR-003",
      contractRevision: 1,
      kind: "webinar-publisher-command",
      operationRef: operation.operationRef,
      locationRef: operation.locationRef,
      projectionHash: operation.projectionHash,
      action: operation.action,
      correlationRef: operation.correlationRef,
    });
    const committed = WebinarPublisherOperationSchema.parse(
      await tx.reserveCommand({
        operation,
        task,
        expectedRowVersion: launch.rowVersion,
        expectedState: launch.state,
        principal: currentOwner,
      }),
    );
    if (canonicalCampaignHash(committed) !== canonicalCampaignHash(operation))
      throw new WebinarPublisherCommandError("REQUEST_CONFLICT");
    return result(committed, false);
  });
}
function result(
  operation: WebinarPublisherOperation,
  duplicate: boolean,
): WebinarPublisherCommandResult {
  return WebinarPublisherCommandResultSchema.parse({
    operationRef: operation.operationRef,
    action: operation.action,
    state: operation.state,
    duplicate,
    correlationRef: operation.correlationRef,
  });
}
