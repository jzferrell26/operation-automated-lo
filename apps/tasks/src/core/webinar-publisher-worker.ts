import {
  canonicalCampaignHash,
  webinarPublisherConfirmationHash,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import {
  OpaqueReferenceSchema,
  WebinarPublisherTaskSchema,
  WebinarPublisherQualificationSchema,
  WebinarPublisherPauseQualificationSchema,
  WebinarPublisherMediaReceiptSchema,
  type WebinarPublisherTask,
  type WebinarPublisherCheckpoint,
} from "@oalo/contracts";
import type { PostgresWebinarPublisherRepository, WebinarPublisherWorkerRecord } from "@oalo/db";
import {
  assertWebinarPublisherProjection,
  compileWebinarPublisherDraft,
  compareWebinarPublisherReadBack,
  hashWebinarPublisherValue,
  WebinarPublisherResponseSchemas,
  WEBINAR_PUBLISHER_NATIVE_OPERATIONS,
  type createWebinarPublisherNativeTransport,
} from "@oalo/ghl";

export class WebinarPublisherWorkerError extends Error {
  constructor(
    public readonly code:
      | "TASK_MISMATCH"
      | "PROVIDER_UNQUALIFIED"
      | "PARITY_MISMATCH"
      | "AUTHORITY_WITHDRAWN"
      | "RUNTIME_UNBOUND",
  ) {
    super(code);
    this.name = "WebinarPublisherWorkerError";
  }
}
export type WebinarPublisherWorkerRepository = Pick<
  PostgresWebinarPublisherRepository,
  "readWorker" | "claim" | "beginDispatch" | "checkpoint" | "markUncertain" | "qualifiedProof"
>;
export type WebinarPublisherWorkerPorts = Readonly<{
  repository: WebinarPublisherWorkerRepository;
  transport: Pick<ReturnType<typeof createWebinarPublisherNativeTransport>, "execute">;
  /** Must resolve current session, owner, installation, source and lender standing, even on replay.
   * Stop actions check owned lineage independently of expired creative/source. */
  assertCurrent(
    principal: Readonly<AuthenticatedPrincipal>,
    record: WebinarPublisherWorkerRecord,
  ): Promise<void>;
  media(
    principal: Readonly<AuthenticatedPrincipal>,
    record: WebinarPublisherWorkerRecord,
  ): Promise<unknown>;
  /** Independently verify and admit the actual decoded readback, not a projection-shaped fixture.
   * Observation admission must exist before a progress/reconcile SQL checkpoint. */
  admitResponse(
    input: Readonly<{
      principal: Readonly<AuthenticatedPrincipal>;
      record: WebinarPublisherWorkerRecord;
      operation: string;
      normalized: unknown;
      readBackHash: string;
      observedAt: string;
      state: WebinarPublisherCheckpoint["state"];
      nativeIds: WebinarPublisherCheckpoint["nativeIds"];
    }>,
  ): Promise<void>;
  now(): Date;
}>;
export type WebinarPublisherWorkerResult = Readonly<{
  disposition: "complete" | "busy" | "deadline" | "pending" | "uncertain";
  operationRef: string;
  state: WebinarPublisherWorkerRecord["operation"]["state"];
  stage: WebinarPublisherWorkerRecord["operation"]["stage"];
}>;
type NativeOperation = "campaign" | "adset" | "ad" | "publish" | "pause" | "resume";

function boundTask(
  task: WebinarPublisherTask,
  record: WebinarPublisherWorkerRecord,
  principal: Readonly<AuthenticatedPrincipal>,
) {
  const o = record.operation;
  const p = assertWebinarPublisherProjection(record.launch.summary.projection);
  const { summaryHash, ...summary } = record.launch.summary;
  if (
    canonicalCampaignHash(summary) !== summaryHash ||
    o.summaryHash !== summaryHash ||
    task.operationRef !== o.operationRef ||
    task.locationRef !== o.locationRef ||
    task.projectionHash !== o.projectionHash ||
    task.action !== o.action ||
    task.correlationRef !== o.correlationRef ||
    p.projectionHash !== o.projectionHash ||
    p.projectionRef !== o.projectionRef ||
    p.locationRef !== principal.locationRef ||
    p.createdBy !== principal.actorRef ||
    o.actorRef !== principal.actorRef ||
    o.actorRoleVersion !== principal.roleVersion ||
    principal.authenticationMode === "local_synthetic" ||
    principal.role !== "location_admin" ||
    o.confirmationHash !==
      webinarPublisherConfirmationHash({
        action: o.action,
        summary: record.launch.summary,
        nativeIds: o.nativeIdsAtConfirmation,
      }) ||
    o.requestHash !==
      canonicalCampaignHash({
        requestId: o.requestId,
        projectionRef: o.projectionRef,
        expectedProjectionHash: o.projectionHash,
        expectedRowVersion: o.expectedRowVersion,
        action: o.action,
        confirmationHash: o.confirmationHash,
      })
  )
    throw new WebinarPublisherWorkerError("TASK_MISMATCH");
}
function result(
  record: WebinarPublisherWorkerRecord,
  disposition: WebinarPublisherWorkerResult["disposition"],
): WebinarPublisherWorkerResult {
  return {
    disposition,
    operationRef: record.operation.operationRef,
    state: record.operation.state,
    stage: record.operation.stage,
  };
}
function fence(record: WebinarPublisherWorkerRecord, workerRef: string) {
  return {
    operationRef: record.operation.operationRef,
    workerRef,
    leaseGeneration: record.operation.leaseGeneration,
    expectedStage: record.operation.stage,
  };
}
async function checkpointParityRefusal(
  task: WebinarPublisherTask,
  principal: Readonly<AuthenticatedPrincipal>,
  record: WebinarPublisherWorkerRecord,
  workerRef: string,
  nativeIds: WebinarPublisherCheckpoint["nativeIds"],
  observedAt: string,
  readBackHash: string,
  ports: WebinarPublisherWorkerPorts,
): Promise<WebinarPublisherWorkerResult> {
  const saved = await ports.repository.checkpoint(principal, {
    ...fence(record, workerRef),
    stage: "complete",
    state: "failed",
    nativeIds,
    providerObservedAt: observedAt,
    requestHash: null,
    readBackHash,
  });
  return result(
    saved.status === "leased"
      ? saved
      : await ports.repository.readWorker(principal, task.operationRef),
    saved.status === "leased" ? "complete" : saved.status,
  );
}
function requestHash(operation: NativeOperation, body: unknown, campaignId: string | null) {
  const d = WEBINAR_PUBLISHER_NATIVE_OPERATIONS[operation];
  const url = new URL(
    d.path.replace(":campaignId", encodeURIComponent(campaignId ?? "")),
    "https://services.leadconnectorhq.com",
  ).toString();
  return hashWebinarPublisherValue({ operation, version: d.version, method: d.method, url, body });
}
function exactFields(actual: Record<string, unknown>, expected: Record<string, unknown>) {
  const selected = Object.fromEntries(Object.keys(expected).map((key) => [key, actual[key]]));
  if (hashWebinarPublisherValue(selected) !== hashWebinarPublisherValue(expected))
    throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
}
function ownedLinked(raw: unknown, record: WebinarPublisherWorkerRecord) {
  const linked = WebinarPublisherResponseSchemas.linked.parse(raw);
  const p = record.launch.summary.projection;
  const ids = record.launch.nativeIds;
  if (
    linked.id !== ids.campaignId ||
    linked.locationId !== p.assets.locationId ||
    linked.fbAdAccountId !== p.assets.adAccountId ||
    linked.adsets.length !== (ids.adsetId === null ? 0 : 1) ||
    (ids.adsetId !== null &&
      (linked.adsets[0]?.id !== ids.adsetId || linked.adsets[0].campaignId !== ids.campaignId)) ||
    (ids.adsetId !== null && linked.adsets[0]?.ads.length !== (ids.adId === null ? 0 : 1)) ||
    (ids.adId !== null &&
      (linked.adsets[0]?.ads[0]?.id !== ids.adId ||
        linked.adsets[0].ads[0].campaignId !== ids.campaignId ||
        linked.adsets[0].ads[0].adsetId !== ids.adsetId))
  )
    throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
  return linked;
}
async function currentSpendingLease(
  task: WebinarPublisherTask,
  principal: Readonly<AuthenticatedPrincipal>,
  record: WebinarPublisherWorkerRecord,
  workerRef: string,
  ports: WebinarPublisherWorkerPorts,
) {
  const current = await ports.repository.readWorker(principal, task.operationRef);
  boundTask(task, current, principal);
  if (
    current.workerRef !== workerRef ||
    !["publish", "resume"].includes(current.operation.stage) ||
    current.operation.stage !== record.operation.stage ||
    current.operation.leaseGeneration !== record.operation.leaseGeneration ||
    current.cancellationGeneration !== record.cancellationGeneration ||
    canonicalCampaignHash(current.launch.nativeIds) !==
      canonicalCampaignHash(record.launch.nativeIds) ||
    ports.now().getTime() >= Date.parse(current.leaseExpiresAt ?? current.deadlineAt) ||
    ports.now().getTime() >= Date.parse(current.deadlineAt)
  )
    throw new WebinarPublisherWorkerError("AUTHORITY_WITHDRAWN");
  await ports.assertCurrent(principal, current);
  return current;
}

/** One bounded delivery consumes persisted stages. Every external write is recorded before send.
 * Any ambiguous send or failed acknowledgement moves to reconciliation; never blindly resend. */
export async function runWebinarPublisherWorker(
  input: unknown,
  principal: Readonly<AuthenticatedPrincipal>,
  workerRefInput: string,
  ports: WebinarPublisherWorkerPorts,
  signal?: AbortSignal,
): Promise<WebinarPublisherWorkerResult> {
  const task = WebinarPublisherTaskSchema.parse(input);
  const workerRef = OpaqueReferenceSchema.parse(workerRefInput);
  let record = await ports.repository.readWorker(principal, task.operationRef);
  boundTask(task, record, principal);
  await ports.assertCurrent(principal, record);
  if (record.operation.stage === "complete") return result(record, "complete");
  const claimed = await ports.repository.claim(principal, { task, workerRef, leaseSeconds: 55 });
  if (claimed.status !== "leased") {
    record = await ports.repository.readWorker(principal, task.operationRef);
    return result(record, claimed.status);
  }
  record = claimed;
  const startedAt = ports.now().getTime();
  for (let step = 0; step < 6; step += 1) {
    boundTask(task, record, principal);
    await ports.assertCurrent(principal, record);
    if (record.operation.stage === "complete") return result(record, "complete");
    if (
      signal?.aborted ||
      ports.now().getTime() - startedAt >= 40_000 ||
      ports.now().getTime() + 10_000 >= Date.parse(record.leaseExpiresAt ?? record.deadlineAt)
    )
      return result(record, "pending");
    const p = record.launch.summary.projection;
    const stage = record.operation.stage;
    const ids = record.launch.nativeIds;
    if (stage === "reconcile" && ids.campaignId === null) {
      // Lost identities cannot be recovered by guessed name/id or a repeated create.
      return result(record, "uncertain");
    }
    const pause =
      stage === "pause" ||
      ((record.operation.action === "pause" || record.operation.action === "cancel") &&
        ["progress", "reconcile"].includes(stage));
    let proof = pause
      ? WebinarPublisherPauseQualificationSchema.parse(
          await ports.repository.qualifiedProof(principal, p.projectionRef, "pause"),
        )
      : WebinarPublisherQualificationSchema.parse(
          await ports.repository.qualifiedProof(principal, p.projectionRef, "qualification"),
        );
    if (proof.kind !== "app_test") throw new WebinarPublisherWorkerError("PROVIDER_UNQUALIFIED");
    let compiled:
      Extract<ReturnType<typeof compileWebinarPublisherDraft>, { ok: true }> | undefined;
    let media: unknown;
    if (!pause && record.operation.action !== "cancel") {
      media = WebinarPublisherMediaReceiptSchema.parse(await ports.media(principal, record));
      const outcome = compileWebinarPublisherDraft({
        projection: p,
        qualification: proof,
        media,
        now: ports.now().toISOString(),
      });
      if (!outcome.ok || outcome.fixtureOnly)
        throw new WebinarPublisherWorkerError("PROVIDER_UNQUALIFIED");
      compiled = outcome;
    }
    if (["parity", "progress", "reconcile"].includes(stage)) {
      if (ids.campaignId === null) return result(record, "uncertain");
      let progressComplete = false;
      let progressFailed = false;
      if (
        stage === "progress" &&
        record.operation.action !== "pause" &&
        record.operation.action !== "cancel"
      ) {
        const polled = await ports.transport.execute(
          {
            operation: "progress",
            locationRef: p.locationRef,
            parameters: { campaignId: ids.campaignId },
          },
          signal,
        );
        const progress = WebinarPublisherResponseSchemas.progress.parse(polled.normalized);
        if (
          polled.normalizedResultHash !== hashWebinarPublisherValue(progress) ||
          progress.campaignId !== ids.campaignId ||
          progress.processed > progress.total
        )
          throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
        progressComplete =
          progress.isComplete && progress.total > 0 && progress.processed === progress.total;
        progressFailed = progress.hasFailed;
        await ports.assertCurrent(principal, record);
      }
      const response = await ports.transport.execute(
        {
          operation: "linked",
          locationRef: p.locationRef,
          parameters: { campaignId: ids.campaignId },
        },
        signal,
      );
      if (stage === "parity") {
        const actual = WebinarPublisherResponseSchemas.linked.parse(response.normalized);
        if (response.normalizedResultHash !== hashWebinarPublisherValue(actual))
          throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
        let matches = false;
        try {
          const linked = ownedLinked(actual, record);
          matches =
            compiled !== undefined &&
            ids.adsetId !== null &&
            ids.adId !== null &&
            compareWebinarPublisherReadBack(compiled, linked, {
              campaignId: ids.campaignId,
              adsetId: ids.adsetId,
              adId: ids.adId,
            }).matches;
        } catch (error) {
          if (!(error instanceof WebinarPublisherWorkerError) || error.code !== "PARITY_MISMATCH")
            throw error;
        }
        if (!matches) {
          // A verified linked mismatch has an atomic terminal refusal. Unavailable or malformed
          // reads have no such observation and must not manufacture this outcome.
          const observedAt = ports.now().toISOString();
          await ports.admitResponse({
            principal,
            record,
            operation: "linked",
            normalized: actual,
            readBackHash: response.normalizedResultHash,
            observedAt,
            state: "failed",
            nativeIds: ids,
          });
          await ports.assertCurrent(principal, record);
          return await checkpointParityRefusal(
            task,
            principal,
            record,
            workerRef,
            ids,
            observedAt,
            response.normalizedResultHash,
            ports,
          );
        }
      }
      const linked = ownedLinked(response.normalized, record);
      if (response.normalizedResultHash !== hashWebinarPublisherValue(linked))
        throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
      let reconcileHash: string | null = null;
      const draftReconcile = stage === "reconcile" && record.operation.action === "draft";
      if (!pause) {
        if (compiled === undefined) throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
        if (draftReconcile) {
          exactFields(linked, {
            name: compiled.campaign.name,
            objective: p.objective,
            specialAdCategories: p.specialAdCategories,
            publishingStatus: "DRAFT",
          });
          let creation: NativeOperation = "campaign";
          let originalBody: Record<string, unknown> = compiled.campaign;
          if (ids.adsetId !== null) {
            originalBody = { ...compiled.adset, campaignId: ids.campaignId };
            const { locationId: _location, ...expected } = originalBody;
            exactFields(linked.adsets[0]!, { ...expected, publishingStatus: "DRAFT" });
            creation = "adset";
          }
          if (ids.adId !== null) {
            originalBody = { ...compiled.ad, campaignId: ids.campaignId, adsetId: ids.adsetId };
            const { locationId: _location, ...expected } = originalBody;
            exactFields(linked.adsets[0]!.ads[0]!, { ...expected, publishingStatus: "DRAFT" });
            creation = "ad";
          }
          reconcileHash = requestHash(creation, originalBody, ids.campaignId);
        } else if (
          ids.adsetId === null ||
          ids.adId === null ||
          !compareWebinarPublisherReadBack(compiled, linked, {
            campaignId: ids.campaignId,
            adsetId: ids.adsetId,
            adId: ids.adId,
          }).matches
        )
          throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
      }
      let state: WebinarPublisherCheckpoint["state"] = "uncertain";
      let next: WebinarPublisherCheckpoint["stage"] = "progress";
      if (draftReconcile) {
        state = "drafting";
        next = ids.adsetId === null ? "adset" : ids.adId === null ? "ad" : "parity";
      } else if (stage === "parity") {
        state = "draft_ready";
        next = "complete";
      } else if (linked.publishingStatus === "PAUSED") {
        state = "paused";
        next = "complete";
      } else if (["FAILED", "REJECTED", "WITH_ISSUES"].includes(linked.publishingStatus)) {
        state = "failed";
        next = "complete";
      } else if (linked.publishingStatus === "IN_REVIEW") state = "in_review";
      else if (
        record.operation.action !== "cancel" &&
        record.operation.action !== "pause" &&
        !progressFailed &&
        (stage === "reconcile" || progressComplete) &&
        linked.publishingStatus === "PUBLISHED" &&
        linked.fbCampaignId &&
        linked.adsets[0]?.fbAdSetId &&
        linked.adsets[0]?.ads[0]?.fbAdId &&
        linked.adsets[0].publishingStatus === "PUBLISHED" &&
        linked.adsets[0].ads[0].publishingStatus === "PUBLISHED"
      ) {
        state = "live";
        next = "complete";
      }
      const observedAt = ports.now().toISOString();
      await ports.admitResponse({
        principal,
        record,
        operation: "linked",
        normalized: linked,
        readBackHash: response.normalizedResultHash,
        observedAt,
        state,
        nativeIds: ids,
      });
      await ports.assertCurrent(principal, record);
      const saved = await ports.repository.checkpoint(principal, {
        ...fence(record, workerRef),
        stage: next,
        state,
        nativeIds: ids,
        providerObservedAt: observedAt,
        requestHash: reconcileHash,
        readBackHash: response.normalizedResultHash,
      });
      if (saved.status !== "leased")
        return result(
          await ports.repository.readWorker(principal, task.operationRef),
          saved.status,
        );
      record = saved;
      // One fresh observation per delivery. Queued acknowledgement or progress never means live.
      return result(
        record,
        next === "complete" ? "complete" : state === "uncertain" ? "uncertain" : "pending",
      );
    }
    if (!["campaign", "adset", "ad", "publish", "pause", "resume"].includes(stage))
      throw new WebinarPublisherWorkerError("TASK_MISMATCH");
    const operation = stage as NativeOperation;
    let body: Record<string, unknown> = { locationId: p.assets.locationId };
    if (operation === "campaign") {
      if (ids.campaignId !== null || compiled === undefined)
        throw new WebinarPublisherWorkerError("TASK_MISMATCH");
      body = compiled.campaign;
    } else if (operation === "adset") {
      if (ids.campaignId === null || ids.adsetId !== null || compiled === undefined)
        throw new WebinarPublisherWorkerError("TASK_MISMATCH");
      body = { ...compiled.adset, campaignId: ids.campaignId };
    } else if (operation === "ad") {
      if (
        ids.campaignId === null ||
        ids.adsetId === null ||
        ids.adId !== null ||
        compiled === undefined
      )
        throw new WebinarPublisherWorkerError("TASK_MISMATCH");
      body = { ...compiled.ad, campaignId: ids.campaignId, adsetId: ids.adsetId };
    } else if (ids.campaignId === null) throw new WebinarPublisherWorkerError("TASK_MISMATCH");
    if (operation === "publish" || operation === "resume") {
      if (compiled === undefined || ids.adsetId === null || ids.adId === null)
        throw new WebinarPublisherWorkerError("TASK_MISMATCH");
      // This bounded fresh GET precedes both the spending reservation and the publish/resume POST.
      const response = await ports.transport.execute(
        {
          operation: "linked",
          locationRef: p.locationRef,
          parameters: { campaignId: ids.campaignId },
        },
        signal,
      );
      const actual = WebinarPublisherResponseSchemas.linked.parse(response.normalized);
      if (response.normalizedResultHash !== hashWebinarPublisherValue(actual))
        throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
      let matches = false;
      try {
        const linked = ownedLinked(actual, record);
        matches =
          compareWebinarPublisherReadBack(compiled, linked, {
            campaignId: ids.campaignId!,
            adsetId: ids.adsetId,
            adId: ids.adId,
          }).matches &&
          (operation === "publish"
            ? linked.publishingStatus === "DRAFT" &&
              linked.adsets[0]?.publishingStatus === "DRAFT" &&
              linked.adsets[0]?.ads[0]?.publishingStatus === "DRAFT"
            : linked.publishingStatus === "PAUSED" &&
              !!linked.fbCampaignId &&
              !!linked.adsets[0]?.fbAdSetId &&
              !!linked.adsets[0]?.ads[0]?.fbAdId &&
              ["PAUSED", "PUBLISHED"].includes(linked.adsets[0].publishingStatus) &&
              ["PAUSED", "PUBLISHED"].includes(linked.adsets[0].ads[0].publishingStatus));
      } catch (error) {
        if (!(error instanceof WebinarPublisherWorkerError) || error.code !== "PARITY_MISMATCH")
          throw error;
      }
      const observedAt = ports.now().toISOString();
      await ports.admitResponse({
        principal,
        record,
        operation: "linked",
        normalized: actual,
        readBackHash: response.normalizedResultHash,
        observedAt,
        state: matches ? (operation === "publish" ? "draft_ready" : "paused") : "failed",
        nativeIds: ids,
      });
      record = await currentSpendingLease(task, principal, record, workerRef, ports);
      if (!matches) {
        // The separately guarded spending-stage refusal retains the exact remote IDs.
        // Unknown/unavailable GETs never reach this independently verified observation path.
        return await checkpointParityRefusal(
          task,
          principal,
          record,
          workerRef,
          ids,
          observedAt,
          response.normalizedResultHash,
          ports,
        );
      }
      proof = WebinarPublisherQualificationSchema.parse(
        await ports.repository.qualifiedProof(principal, p.projectionRef, "qualification"),
      );
      const fresh = compileWebinarPublisherDraft({
        projection: p,
        qualification: proof,
        media,
        now: ports.now().toISOString(),
      });
      if (
        !fresh.ok ||
        fresh.fixtureOnly ||
        !compareWebinarPublisherReadBack(fresh, actual, {
          campaignId: ids.campaignId!,
          adsetId: ids.adsetId,
          adId: ids.adId,
        }).matches
      )
        throw new WebinarPublisherWorkerError("PROVIDER_UNQUALIFIED");
      compiled = fresh;
      if (
        signal?.aborted ||
        ports.now().getTime() + 10_000 >= Date.parse(record.leaseExpiresAt ?? record.deadlineAt)
      )
        return result(record, "pending");
    }
    const hash = requestHash(operation, body, ids.campaignId);
    const dispatched = await ports.repository.beginDispatch(principal, {
      ...fence(record, workerRef),
      requestHash: hash,
    });
    if (
      dispatched.generation !== record.operation.leaseGeneration ||
      dispatched.cancellationGeneration !== record.cancellationGeneration
    )
      throw new WebinarPublisherWorkerError("TASK_MISMATCH");
    try {
      if (operation === "publish" || operation === "resume")
        record = await currentSpendingLease(task, principal, record, workerRef, ports);
      const response = await ports.transport.execute(
        {
          operation,
          locationRef: p.locationRef,
          projection: p,
          qualification: proof,
          ...(media === undefined ? {} : { mediaReceipt: media }),
          body,
          ...(["publish", "pause", "resume"].includes(operation)
            ? { parameters: { campaignId: ids.campaignId } }
            : {}),
        },
        signal,
      );
      if (response.requestHash !== hash) throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
      const normalized = WebinarPublisherResponseSchemas[operation].parse(response.normalized);
      if (response.normalizedResultHash !== hashWebinarPublisherValue(normalized))
        throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
      const nextIds = { ...ids };
      let next: WebinarPublisherCheckpoint["stage"] = "progress";
      let state: WebinarPublisherCheckpoint["state"] =
        operation === "pause"
          ? "pause_pending"
          : operation === "resume"
            ? "resume_pending"
            : "publish_queued";
      if (operation === "campaign") {
        const data = WebinarPublisherResponseSchemas.campaign.parse(normalized);
        exactFields(data, {
          name: body.name,
          locationId: p.assets.locationId,
          fbAdAccountId: p.assets.adAccountId,
          objective: p.objective,
          specialAdCategories: p.specialAdCategories,
          publishingStatus: "DRAFT",
        });
        nextIds.campaignId = data.id;
        next = "adset";
        state = "drafting";
      } else if (operation === "adset" || operation === "ad") {
        const data = WebinarPublisherResponseSchemas[operation].parse(normalized);
        const { locationId: _location, ...expected } = body;
        exactFields(data, { ...expected, publishingStatus: "DRAFT" });
        if (operation === "adset") {
          nextIds.adsetId = data.id;
          next = "ad";
        } else {
          nextIds.adId = data.id;
          next = "parity";
        }
        state = "drafting";
      } else if (operation === "publish") {
        const linked = ownedLinked(normalized, record);
        if (
          compiled === undefined ||
          ids.adsetId === null ||
          ids.adId === null ||
          !compareWebinarPublisherReadBack(compiled, linked, {
            campaignId: ids.campaignId!,
            adsetId: ids.adsetId,
            adId: ids.adId,
          }).matches
        )
          throw new WebinarPublisherWorkerError("PARITY_MISMATCH");
      }
      const observedAt = ports.now().toISOString();
      await ports.admitResponse({
        principal,
        record,
        operation,
        normalized,
        readBackHash: response.normalizedResultHash,
        observedAt,
        state,
        nativeIds: nextIds,
      });
      await ports.assertCurrent(principal, record);
      const saved = await ports.repository.checkpoint(principal, {
        ...fence(record, workerRef),
        stage: next,
        state,
        nativeIds: nextIds,
        providerObservedAt: observedAt,
        requestHash: hash,
        readBackHash: response.normalizedResultHash,
      });
      if (saved.status !== "leased")
        return result(
          await ports.repository.readWorker(principal, task.operationRef),
          saved.status,
        );
      record = saved;
    } catch {
      // A provider may have accepted the request. Even a malformed 200 is an uncertain write.
      const saved = await ports.repository.markUncertain(principal, fence(record, workerRef));
      return result(
        saved.status === "leased"
          ? saved
          : await ports.repository.readWorker(principal, task.operationRef),
        "uncertain",
      );
    }
  }
  return result(record, "pending");
}
