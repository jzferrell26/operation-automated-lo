import { z } from "zod";
import {
  canonicalCampaignHash,
  freezeAuthenticatedPrincipal,
  webinarPublisherConfirmationHash,
  type AuthenticatedPrincipal,
  type WebinarPublisherCommandRepository,
  type WebinarPublisherCommandTransaction,
  type WebinarPublisherCampaignEvidence,
} from "@oalo/application";
import {
  ApprovalDecisionSchema,
  CampaignVersionSchema,
  PreflightResultSchema,
  WebinarAdCampaignManifestSchema,
  WebinarProviderLaunchInputSchema,
  WebinarPublisherSelectionSchema,
  WebinarPublisherCommandSchema,
  WebinarPublisherSummarySchema,
  WebinarPublisherLaunchRecordSchema,
  WebinarPublisherOperationSchema,
  WebinarPublisherTaskSchema,
  WebinarPublisherCheckpointSchema,
  WebinarPublisherQualificationSchema,
  WebinarPublisherPauseQualificationSchema,
  WebinarPublisherNativeIdsSchema,
  WebinarPublisherHashSchema,
  OpaqueReferenceSchema,
  parseActorRef,
  parseLocationRef,
  parseInstallationRef,
  parseSessionRef,
  type WebinarPublisherLaunchRecord,
  type WebinarPublisherCheckpoint,
  type WebinarPublisherTask,
} from "@oalo/contracts";
import {
  defineSqlContract,
  type DatabasePool,
  type SqlContract,
  type SqlScalar,
} from "./sql-contract.js";
import {
  createPrincipalBoundTenantContextAuthority,
  withTenantTransaction,
  type TenantTransaction,
} from "./transaction-context.js";

const Time = z.iso.datetime({ offset: true });
const Ref = OpaqueReferenceSchema;
const Hash = WebinarPublisherHashSchema;
const Evidence = z
  .object({
    version: CampaignVersionSchema.extend({ manifest: WebinarAdCampaignManifestSchema }),
    preflight: PreflightResultSchema,
    approval: ApprovalDecisionSchema,
    state: z.literal("approved"),
  })
  .strict();
export const WebinarPublisherResolvedSelectionSchema = z
  .object({
    adAccountRef: Ref,
    pageRef: Ref,
    assets: WebinarProviderLaunchInputSchema.shape.assets,
    accountLabel: z.string().min(1).max(300),
    pageLabel: z.string().min(1).max(300),
    geographies: z
      .array(
        WebinarProviderLaunchInputSchema.shape.geographies.element
          .extend({
            selectionRef: Ref,
            approvedPlace: z.string().min(1).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    providerContract: WebinarProviderLaunchInputSchema.shape.providerContract,
    totalSemantics: z.literal("estimated_ceiling"),
  })
  .strict();
const Observation = z
  .object({
    projectionHash: Hash,
    nativeIds: WebinarPublisherNativeIdsSchema,
    state: z.enum(["in_review", "live", "paused", "failed", "uncertain"]),
    readBackHash: Hash,
    observedAt: Time,
    // Real Facebook IDs are distinct from HighLevel IDs. Unknown metrics stay null.
    facebookIds: z
      .object({
        campaignId: z.string().min(1).max(128).nullable(),
        adsetId: z.string().min(1).max(128).nullable(),
        adId: z.string().min(1).max(128).nullable(),
      })
      .strict(),
    metrics: z
      .object({
        impressions: z.number().int().nonnegative().nullable(),
        clicks: z.number().int().nonnegative().nullable(),
        spendMinor: z.number().int().nonnegative().nullable(),
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      value.state !== "live" ||
      (Object.values(value.nativeIds).every((id) => id !== null) &&
        Object.values(value.facebookIds).every((id) => id !== null)),
  );
const ReceiptBody = {
  schemaVersion: z.literal(1),
  contractId: z.literal("CTR-003"),
  contractRevision: z.literal(1),
  admissionRef: Ref,
  artifactHash: Hash,
  verifierRef: Ref,
  origin: z.literal("verified_provider"),
  observedAt: Time,
  expiresAt: Time,
};
/** Strict normalized records only. Raw page discovery (including tokens) never enters this port. */
export const WebinarPublisherAdmissionSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        ...ReceiptBody,
        kind: z.literal("selection"),
        normalized: z
          .object({
            selection: WebinarPublisherSelectionSchema,
            resolved: WebinarPublisherResolvedSelectionSchema,
            releaseEvidenceRef: Ref,
            releaseArtifactHash: Hash,
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...ReceiptBody,
        kind: z.literal("qualification"),
        normalized: WebinarPublisherQualificationSchema,
      })
      .strict(),
    z
      .object({
        ...ReceiptBody,
        kind: z.literal("pause"),
        normalized: WebinarPublisherPauseQualificationSchema,
      })
      .strict(),
    z.object({ ...ReceiptBody, kind: z.literal("observation"), normalized: Observation }).strict(),
  ])
  .refine((value) => Date.parse(value.expiresAt) > Date.parse(value.observedAt));
export type WebinarPublisherAdmission = z.infer<typeof WebinarPublisherAdmissionSchema>;

export class WebinarPublisherPersistenceError extends Error {
  constructor(
    public readonly code:
      "AUTHORITY_WITHDRAWN" | "ROW_INVALID" | "PROVENANCE_UNQUALIFIED" | "FENCED" | "HASH_MISMATCH",
  ) {
    super(code);
    this.name = "WebinarPublisherPersistenceError";
  }
}
export interface WebinarPublisherDatabaseAuthority {
  /** Read-only auth/session resolver, not a browser claim. Verify signed embedded sessions too.
   * Called again while DB authority locks are held: do not touch/extend the session via another pool. */
  currentPrincipal(principal: Readonly<AuthenticatedPrincipal>): Promise<AuthenticatedPrincipal>;
  /** Source registry, actual raster, lender release and CTR-002 standing, checked again at commit. */
  assertEvidenceCurrent(
    evidence: WebinarPublisherCampaignEvidence,
    principal: Readonly<AuthenticatedPrincipal>,
  ): Promise<void>;
  /** Native ownership, admitted actual wire/media proof, current source and cancellation-aware payload. */
  assertDispatch(
    input: Readonly<{
      principal: Readonly<AuthenticatedPrincipal>;
      record: WebinarPublisherWorkerRecord;
      requestHash: string;
    }>,
  ): Promise<void>;
  /** Independently decoded provider response/read-back; never derive a response from the request. */
  assertCheckpoint(
    input: Readonly<{
      principal: Readonly<AuthenticatedPrincipal>;
      record: WebinarPublisherWorkerRecord;
      checkpoint: WebinarPublisherCheckpoint;
    }>,
  ): Promise<void>;
}
export interface WebinarPublisherAdmissionVerifier {
  /** Trusted integration service must verify artifact provenance, ownership and lender release.
   * There is deliberately no default verifier or 'app_test' shape acceptance implementation. */
  verify(principal: Readonly<AuthenticatedPrincipal>, candidate: unknown): Promise<unknown>;
}
const WorkerRecord = z
  .object({
    operation: WebinarPublisherOperationSchema,
    launch: WebinarPublisherLaunchRecordSchema,
    workerRef: Ref.nullable(),
    deadlineAt: Time,
    leaseExpiresAt: Time.nullable(),
    cancellationGeneration: z.number().int().nonnegative(),
  })
  .strict();
export type WebinarPublisherWorkerRecord = z.infer<typeof WorkerRecord>;
const WorkerResult = z.union([
  WorkerRecord.extend({ status: z.literal("leased") }),
  z.object({ status: z.enum(["busy", "deadline"]) }).strict(),
]);
const valueContract = (name: string, text: string): SqlContract<unknown> =>
  defineSqlContract({
    name,
    text,
    access: "write",
    decode: (row) => z.object({ value: z.unknown() }).strict().parse(row).value,
  });
const command = valueContract(
  "webinar-publisher.command.v1",
  "select campaign.webinar_publisher_command($1::text::jsonb,$2::text,$3::text::jsonb) as value",
);
const worker = valueContract(
  "webinar-publisher.worker.v1",
  "select campaign.webinar_publisher_worker($1::text::jsonb,$2::text,$3::text::jsonb) as value",
);
const proof = valueContract(
  "webinar-publisher.proof.v1",
  "select campaign.webinar_publisher_proof($1::text::jsonb,$2::text,$3::text) as value",
);
const limits = valueContract(
  "webinar-publisher.transaction-limits.v1",
  "select set_config('lock_timeout','3s',true)='3s' and set_config('statement_timeout','10s',true)='10s' as value",
);

function validatePrincipal(principal: Readonly<AuthenticatedPrincipal>) {
  const p = freezeAuthenticatedPrincipal(principal);
  if (
    p.role !== "location_admin" ||
    p.authenticationMode === "local_synthetic" ||
    parseActorRef(p.actorRef) !== p.actorId ||
    parseLocationRef(p.locationRef) !== p.locationId
  )
    throw new WebinarPublisherPersistenceError("AUTHORITY_WITHDRAWN");
  parseInstallationRef(p.installationRef);
  if (p.authenticationMode === "first_party") parseSessionRef(p.sessionId);
  return p;
}
function identity(p: Readonly<AuthenticatedPrincipal>) {
  return JSON.stringify({
    role: p.role,
    roleVersion: p.roleVersion,
    mode: p.authenticationMode,
    sessionId: p.authenticationMode === "first_party" ? parseSessionRef(p.sessionId) : null,
    installationId: parseInstallationRef(p.installationRef),
  });
}
function assertHashes(launch: WebinarPublisherLaunchRecord) {
  const { summaryHash, ...summary } = launch.summary;
  const { projectionHash, ...projection } = summary.projection;
  if (
    canonicalCampaignHash(summary) !== summaryHash ||
    canonicalCampaignHash(projection) !== projectionHash
  )
    throw new WebinarPublisherPersistenceError("HASH_MISMATCH");
  return launch;
}
async function one(
  tx: TenantTransaction,
  contract: SqlContract<unknown>,
  values: readonly SqlScalar[],
) {
  const rows = await tx.write(contract, values);
  if (rows.length !== 1) throw new WebinarPublisherPersistenceError("ROW_INVALID");
  return rows[0];
}
/** Reuse the existing tenant context/pool. Upgrade only BEGIN before any context SQL. */
function serializable(pool: DatabasePool): DatabasePool {
  return {
    connect: async () => {
      const connection = await pool.connect();
      return {
        release: () => connection.release(),
        execute: (request) =>
          connection.execute(
            request.statementName === "transaction.begin"
              ? { ...request, text: "begin isolation level serializable" }
              : request,
          ),
      };
    },
  };
}

export class PostgresWebinarPublisherRepository implements WebinarPublisherCommandRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly authority: WebinarPublisherDatabaseAuthority,
    private readonly correlationRef: string,
  ) {
    Ref.parse(correlationRef);
  }
  async run<T>(
    supplied: Readonly<AuthenticatedPrincipal>,
    work: (tx: WebinarPublisherCommandTransaction) => Promise<T>,
  ): Promise<T> {
    const principal = validatePrincipal(supplied);
    const current = validatePrincipal(await this.authority.currentPrincipal(principal));
    if (canonicalCampaignHash(principal) !== canonicalCampaignHash(current))
      throw new WebinarPublisherPersistenceError("AUTHORITY_WITHDRAWN");
    return withTenantTransaction(
      serializable(this.pool),
      createPrincipalBoundTenantContextAuthority(current, this.correlationRef),
      async (tx) => {
        if ((await one(tx, limits, [])) !== true)
          throw new WebinarPublisherPersistenceError("ROW_INVALID");
        const evidence: WebinarPublisherCampaignEvidence[] = [];
        // Force authority locks even if callback performs no lookup.
        await this.call(tx, current, "find-command", {
          requestId: "00000000-0000-4000-8000-000000000000",
        });
        const result = await work({
          loadCurrentEvidence: async (campaignRef) => {
            Ref.parse(campaignRef);
            const raw = await this.call(tx, current, "evidence", { campaignRef });
            if (raw === null) return undefined;
            const parsed = Evidence.parse(raw);
            await this.authority.assertEvidenceCurrent(parsed, current);
            evidence.push(parsed);
            return parsed;
          },
          resolveSelection: async (input) => {
            const selection = WebinarPublisherSelectionSchema.parse(input.selection);
            const resolved = WebinarPublisherResolvedSelectionSchema.parse(
              await this.call(tx, current, "selection", { selection }),
            );
            if (
              resolved.adAccountRef !== selection.adAccountRef ||
              resolved.pageRef !== selection.pageRef
            )
              throw new WebinarPublisherPersistenceError("PROVENANCE_UNQUALIFIED");
            return resolved;
          },
          insertSummary: async (input) => {
            const summary = WebinarPublisherSummarySchema.parse(input);
            assertHashes({
              summary,
              rowVersion: 1,
              state: "reserved",
              nativeIds: { campaignId: null, adsetId: null, adId: null },
            });
            return assertHashes(
              WebinarPublisherLaunchRecordSchema.parse(
                await this.call(tx, current, "insert-summary", summary),
              ),
            );
          },
          loadLaunch: async (projectionRef) => {
            Ref.parse(projectionRef);
            const raw = await this.call(tx, current, "load", { projectionRef });
            return raw === null
              ? undefined
              : assertHashes(WebinarPublisherLaunchRecordSchema.parse(raw));
          },
          findCommand: async (requestId) => {
            z.uuid().parse(requestId);
            const raw = await this.call(tx, current, "find-command", { requestId });
            return raw === null ? undefined : WebinarPublisherOperationSchema.parse(raw);
          },
          reserveCommand: async (input) => {
            if (canonicalCampaignHash(input.principal) !== canonicalCampaignHash(current))
              throw new WebinarPublisherPersistenceError("AUTHORITY_WITHDRAWN");
            const operation = WebinarPublisherOperationSchema.parse(input.operation);
            const task = WebinarPublisherTaskSchema.parse(input.task);
            const request = WebinarPublisherCommandSchema.parse({
              requestId: operation.requestId,
              projectionRef: operation.projectionRef,
              expectedProjectionHash: operation.projectionHash,
              expectedRowVersion: operation.expectedRowVersion,
              action: operation.action,
              confirmationHash: operation.confirmationHash,
            });
            const launch = WebinarPublisherLaunchRecordSchema.parse(
              await this.call(tx, current, "load", { projectionRef: operation.projectionRef }),
            );
            assertHashes(launch);
            if (
              canonicalCampaignHash(request) !== operation.requestHash ||
              operation.expectedRowVersion !== input.expectedRowVersion ||
              operation.confirmationHash !==
                webinarPublisherConfirmationHash({
                  action: operation.action,
                  summary: launch.summary,
                  nativeIds: operation.nativeIdsAtConfirmation,
                })
            )
              throw new WebinarPublisherPersistenceError("HASH_MISMATCH");
            return WebinarPublisherOperationSchema.parse(
              await this.call(tx, current, "reserve", {
                projectionRef: operation.projectionRef,
                operation,
                task,
                expectedRowVersion: z.number().int().positive().parse(input.expectedRowVersion),
                expectedState: input.expectedState,
              }),
            );
          },
        });
        // Source authority can withdraw while asynchronous work ran. Keep all DB locks until done.
        for (const item of evidence) await this.authority.assertEvidenceCurrent(item, current);
        const final = validatePrincipal(await this.authority.currentPrincipal(current));
        if (canonicalCampaignHash(final) !== canonicalCampaignHash(current))
          throw new WebinarPublisherPersistenceError("AUTHORITY_WITHDRAWN");
        await this.call(tx, current, "find-command", {
          requestId: "00000000-0000-4000-8000-000000000000",
        });
        return result;
      },
    );
  }
  private call(
    tx: TenantTransaction,
    p: Readonly<AuthenticatedPrincipal>,
    method: string,
    input: unknown,
  ) {
    return one(tx, command, [identity(p), method, JSON.stringify(input)]);
  }
  private async scoped<T>(
    supplied: Readonly<AuthenticatedPrincipal>,
    work: (tx: TenantTransaction, p: Readonly<AuthenticatedPrincipal>) => Promise<T>,
  ) {
    const p = validatePrincipal(supplied);
    const current = validatePrincipal(await this.authority.currentPrincipal(p));
    if (canonicalCampaignHash(p) !== canonicalCampaignHash(current))
      throw new WebinarPublisherPersistenceError("AUTHORITY_WITHDRAWN");
    return withTenantTransaction(
      serializable(this.pool),
      createPrincipalBoundTenantContextAuthority(current, this.correlationRef),
      async (tx) => {
        if ((await one(tx, limits, [])) !== true)
          throw new WebinarPublisherPersistenceError("ROW_INVALID");
        const result = await work(tx, current);
        if (
          canonicalCampaignHash(
            validatePrincipal(await this.authority.currentPrincipal(current)),
          ) !== canonicalCampaignHash(current)
        )
          throw new WebinarPublisherPersistenceError("AUTHORITY_WITHDRAWN");
        return result;
      },
    );
  }
  async qualifiedProof(
    principal: Readonly<AuthenticatedPrincipal>,
    projectionRef: string,
    kind: "qualification" | "pause" | "observation",
  ) {
    Ref.parse(projectionRef);
    return this.scoped(principal, async (tx, p) => {
      const raw = await one(tx, proof, [identity(p), projectionRef, kind]);
      if (raw === null) throw new WebinarPublisherPersistenceError("PROVENANCE_UNQUALIFIED");
      return kind === "qualification"
        ? WebinarPublisherQualificationSchema.parse(raw)
        : kind === "pause"
          ? WebinarPublisherPauseQualificationSchema.parse(raw)
          : Observation.parse(raw);
    });
  }
  async readWorker(principal: Readonly<AuthenticatedPrincipal>, operationRef: string) {
    Ref.parse(operationRef);
    return this.scoped(principal, async (tx, p) => this.readRecord(tx, p, operationRef));
  }
  async pendingTasks(principal: Readonly<AuthenticatedPrincipal>, limit = 25) {
    z.number().int().min(1).max(50).parse(limit);
    return this.scoped(principal, async (tx, p) =>
      z
        .array(WebinarPublisherTaskSchema)
        .max(50)
        .parse(await one(tx, command, [identity(p), "pending", JSON.stringify({ limit })])),
    );
  }
  private async readRecord(
    tx: TenantTransaction,
    p: Readonly<AuthenticatedPrincipal>,
    operationRef: string,
  ) {
    const record = WorkerRecord.parse(
      await one(tx, worker, [identity(p), "read", JSON.stringify({ operationRef })]),
    );
    assertHashes(record.launch);
    return record;
  }
  async claim(
    principal: Readonly<AuthenticatedPrincipal>,
    input: Readonly<{ task: WebinarPublisherTask; workerRef: string; leaseSeconds: number }>,
  ) {
    const task = WebinarPublisherTaskSchema.parse(input.task);
    const workerRef = Ref.parse(input.workerRef);
    const leaseSeconds = z.number().int().min(1).max(60).parse(input.leaseSeconds);
    return this.scoped(principal, async (tx, p) =>
      WorkerResult.parse(
        await one(tx, worker, [
          identity(p),
          "claim",
          JSON.stringify({ operationRef: task.operationRef, task, workerRef, leaseSeconds }),
        ]),
      ),
    );
  }
  async beginDispatch(principal: Readonly<AuthenticatedPrincipal>, raw: unknown) {
    const input = z
      .object({
        operationRef: Ref,
        workerRef: Ref,
        leaseGeneration: z.number().int().positive(),
        expectedStage: WebinarPublisherCheckpointSchema.shape.expectedStage,
        requestHash: Hash,
      })
      .strict()
      .parse(raw);
    return this.scoped(principal, async (tx, p) => {
      const record = await this.readRecord(tx, p, input.operationRef);
      await this.authority.assertDispatch({ principal: p, record, requestHash: input.requestHash });
      return z
        .object({
          status: z.literal("dispatch-recorded"),
          generation: z.number().int().positive(),
          cancellationGeneration: z.number().int().nonnegative(),
        })
        .strict()
        .parse(await one(tx, worker, [identity(p), "dispatch", JSON.stringify(input)]));
    });
  }
  async checkpoint(principal: Readonly<AuthenticatedPrincipal>, raw: unknown) {
    const input = WebinarPublisherCheckpointSchema.parse(raw);
    return this.scoped(principal, async (tx, p) => {
      const record = await this.readRecord(tx, p, input.operationRef);
      await this.authority.assertCheckpoint({ principal: p, record, checkpoint: input });
      return WorkerResult.parse(
        await one(tx, worker, [identity(p), "checkpoint", JSON.stringify(input)]),
      );
    });
  }
  async markUncertain(principal: Readonly<AuthenticatedPrincipal>, raw: unknown) {
    const input = z
      .object({
        operationRef: Ref,
        workerRef: Ref,
        leaseGeneration: z.number().int().positive(),
        expectedStage: WebinarPublisherCheckpointSchema.shape.expectedStage,
      })
      .strict()
      .parse(raw);
    return this.scoped(principal, async (tx, p) =>
      WorkerResult.parse(await one(tx, worker, [identity(p), "uncertain", JSON.stringify(input)])),
    );
  }
}

/** The pool must be a separately configured publisher_admission_runtime capability login.
 * Migration grants NO login membership. Never substitute the request runtime pool or elevate it.
 * Candidate and verifier output are strict normalized records, never raw tokens/provider bodies. */
export function createWebinarPublisherAdmissionService(
  pool: DatabasePool,
  verifier: WebinarPublisherAdmissionVerifier,
) {
  return {
    async admit(
      supplied: Readonly<AuthenticatedPrincipal>,
      candidate: unknown,
    ): Promise<WebinarPublisherAdmission> {
      const principal = validatePrincipal(supplied);
      const receipt = WebinarPublisherAdmissionSchema.parse(
        await verifier.verify(principal, candidate),
      );
      if (
        (receipt.kind === "qualification" || receipt.kind === "pause") &&
        receipt.normalized.kind !== "app_test"
      )
        throw new WebinarPublisherPersistenceError("PROVENANCE_UNQUALIFIED");
      const connection = await pool.connect();
      try {
        await connection.execute({
          statementName: "webinar-publisher.admit.v1",
          text: "select campaign.webinar_publisher_admit($1::uuid,$2::uuid,$3::uuid,$4::text::jsonb)",
          values: [
            principal.locationId,
            principal.actorId,
            parseInstallationRef(principal.installationRef),
            JSON.stringify(receipt),
          ],
          preparedStatementMode: "unnamed",
        });
        return receipt;
      } finally {
        await connection.release();
      }
    },
  };
}
