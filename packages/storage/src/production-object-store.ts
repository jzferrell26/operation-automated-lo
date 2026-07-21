import { createHash } from "node:crypto";

import {
  ArtifactRecordSchema,
  PublishedCampaignProjectionSchema,
  type ArtifactRecord,
  type ArtifactType,
  type PublicationCleanupIntent,
  type PublicationCleanupLease,
  type PublishedCampaignProjection,
  type StorageTransferRequest,
} from "@oalo/contracts";
import { z } from "zod";

import { publishedArtifactKey, planPrivateTransfer } from "./production-storage.js";
import {
  withdrawProjectionWithAudit,
  type ProjectionWithdrawalRecord,
} from "./projection-withdrawal.js";

const BucketSchema = z.string().regex(/^[a-z0-9][a-z0-9.-]{2,62}$/u);
const OpaqueAuthorizationSchema = z.string().regex(/^[A-Za-z0-9_-]{24,512}$/u);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const DEFAULT_PUBLICATION_CLEANUP_MAXIMUM_ATTEMPTS = 5;
const DEFAULT_PUBLICATION_CLEANUP_RETRY_POLICY = Object.freeze({
  baseDelayMilliseconds: 1_000,
  maximumDelayMilliseconds: 15 * 60 * 1_000,
});

export const ProductionObjectStorePolicySchema = z
  .object({ privateBucket: BucketSchema, publicBucket: BucketSchema })
  .strict()
  .refine(
    (value) => value.privateBucket !== value.publicBucket,
    "Storage buckets must be distinct.",
  );

export type ProductionObjectStorePolicy = z.infer<typeof ProductionObjectStorePolicySchema>;

const PrivateTransferAuthorizationSchema = z
  .object({
    bucket: BucketSchema,
    objectKey: z.string().min(1).max(1_024),
    visibility: z.literal("private"),
    publicReadUrl: z.null(),
    publicBucketPath: z.null(),
    authorization: OpaqueAuthorizationSchema,
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .readonly();

export type PrivateTransferAuthorization = z.infer<typeof PrivateTransferAuthorizationSchema>;

export interface ProductionObjectStoreAdapter {
  authorizePrivateTransfer(
    input: Readonly<{ bucket: string; request: StorageTransferRequest }>,
  ): Promise<unknown>;
  copyApprovedPrivateArtifact(
    input: Readonly<{
      privateBucket: string;
      publicBucket: string;
      artifact: ArtifactRecord;
      publishedKey: string;
    }>,
  ): Promise<unknown>;
  quarantinePartialPublication(
    input: Readonly<{
      publicBucket: string;
      locationRef: string;
      publicCampaignId: string;
      campaignVersionRef: string;
      publishedVersion: number;
      attemptedKeys: readonly string[];
      idempotencyKey: string;
      problemCode: "PUBLICATION_PARTIAL_FAILURE";
    }>,
  ): Promise<unknown>;
  withdrawExactProjectionAndAppendImmutableAudit(
    input: Readonly<{
      projection: PublishedCampaignProjection;
      record: ProjectionWithdrawalRecord;
    }>,
  ): Promise<unknown>;
}

export async function authorizePrivateObjectTransfer(
  untrustedRequest: unknown,
  untrustedPolicy: unknown,
  adapter: Pick<ProductionObjectStoreAdapter, "authorizePrivateTransfer">,
  now: Date,
): Promise<PrivateTransferAuthorization> {
  const request = planPrivateTransfer(untrustedRequest, now);
  const policy = ProductionObjectStorePolicySchema.parse(untrustedPolicy);
  const receipt = PrivateTransferAuthorizationSchema.parse(
    await adapter.authorizePrivateTransfer({ bucket: policy.privateBucket, request }),
  );
  if (
    receipt.bucket !== policy.privateBucket ||
    receipt.objectKey !== request.objectKey ||
    receipt.expiresAt !== request.expiresAt
  ) {
    throw new Error(
      "Private transfer authorization does not match the exact approved bucket, key, or expiry.",
    );
  }
  return receipt;
}

const PublishedCopyReceiptSchema = z
  .object({
    sourceBucket: BucketSchema,
    sourceKey: z.string().min(1).max(1_024),
    destinationBucket: BucketSchema,
    destinationKey: z.string().min(1).max(1_024),
    visibility: z.literal("public"),
    immutableUrl: z.url({ protocol: /^https$/u }),
    sha256: Sha256Schema,
    artifactRef: z.string().min(8).max(128),
    campaignVersionRef: z.string().min(8).max(128),
  })
  .strict();

const PublicationQuarantineEvidenceSchema = z
  .object({
    status: z.literal("quarantined"),
    publicBucket: BucketSchema,
    locationRef: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/u),
    publicCampaignId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/u),
    campaignVersionRef: z.string().min(8).max(128),
    publishedVersion: z.number().int().positive(),
    quarantinedKeys: z.array(z.string().min(1).max(1_024)).min(1),
    idempotencyKey: Sha256Schema,
    problemCode: z.literal("PUBLICATION_PARTIAL_FAILURE"),
  })
  .strict()
  .readonly();

export interface PublicationCleanupReconciliationPort {
  enqueue(
    intent: PublicationCleanupIntent,
  ): Promise<"enqueued" | "already_pending" | "already_completed" | "already_dead_lettered">;
  claimAvailable(
    input: Readonly<{
      leaseOwner: string;
      limit: number;
      leaseUntil: string;
    }>,
  ): Promise<readonly PublicationCleanupLease[]>;
  complete(
    input: Readonly<{
      idempotencyKey: string;
      leaseOwner: string;
      quarantinedKeys: readonly string[];
    }>,
  ): Promise<void>;
  releaseAfterFailure(
    input: Readonly<{
      availableAt: string;
      idempotencyKey: string;
      leaseOwner: string;
      problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED";
    }>,
  ): Promise<"pending" | "dead_lettered">;
}

export interface PublicationCleanupRetryPolicy {
  readonly baseDelayMilliseconds: number;
  readonly maximumDelayMilliseconds: number;
}

const PublicationCleanupLeaseSchema = z
  .object({
    publicBucket: BucketSchema,
    locationRef: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/u),
    publicCampaignId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/u),
    campaignVersionRef: z.string().min(8).max(128),
    publishedVersion: z.number().int().positive(),
    attemptedKeys: z.array(z.string().min(1).max(1_024)).min(1),
    idempotencyKey: Sha256Schema,
    maximumAttempts: z.number().int().min(1).max(20),
    problemCode: z.literal("PUBLICATION_PARTIAL_FAILURE"),
    attemptCount: z.number().int().nonnegative(),
    leaseOwner: z.string().min(1).max(128),
    leaseUntil: z.iso.datetime({ offset: true }),
  })
  .strict()
  .readonly();

export class PublicationCleanupReconciliationRequiredError extends AggregateError {
  public readonly problemCode = "PUBLICATION_CLEANUP_RECONCILIATION_REQUIRED" as const;
  public readonly intent: PublicationCleanupIntent;

  public constructor(
    publicationError: unknown,
    cleanupError: unknown,
    intent: PublicationCleanupIntent,
  ) {
    super(
      [publicationError, cleanupError],
      "Public artifact publication failed; durable cleanup reconciliation is pending.",
    );
    this.name = "PublicationCleanupReconciliationRequiredError";
    this.intent = intent;
  }
}

export class PublicationCleanupReleaseError extends AggregateError {
  public readonly problemCode = "PUBLICATION_CLEANUP_RELEASE_FAILED" as const;
  public readonly idempotencyKey: string;

  public constructor(cleanupError: unknown, releaseError: unknown, idempotencyKey: string) {
    super(
      [cleanupError, releaseError],
      "Publication cleanup failed and its retry state could not be persisted.",
    );
    this.name = "PublicationCleanupReleaseError";
    this.idempotencyKey = idempotencyKey;
  }
}

function sameKeys(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const expected = [...left].toSorted();
  const actual = [...right].toSorted();
  return expected.every((key, index) => key === actual[index]);
}

function publicationQuarantineIdempotencyKey(
  input: Readonly<{
    publicBucket: string;
    publicCampaignId: string;
    campaignVersionRef: string;
    publishedVersion: number;
    attemptedKeys: readonly string[];
    maximumAttempts: number;
  }>,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        ...input,
        attemptedKeys: [...input.attemptedKeys].toSorted(),
      }),
    )
    .digest("hex");
}

function validateQuarantineEvidence(
  unsafeEvidence: unknown,
  cleanupInput: PublicationCleanupIntent,
): z.infer<typeof PublicationQuarantineEvidenceSchema> {
  const evidence = PublicationQuarantineEvidenceSchema.parse(unsafeEvidence);
  if (
    evidence.publicBucket !== cleanupInput.publicBucket ||
    evidence.locationRef !== cleanupInput.locationRef ||
    evidence.publicCampaignId !== cleanupInput.publicCampaignId ||
    evidence.campaignVersionRef !== cleanupInput.campaignVersionRef ||
    evidence.publishedVersion !== cleanupInput.publishedVersion ||
    evidence.idempotencyKey !== cleanupInput.idempotencyKey ||
    !sameKeys(evidence.quarantinedKeys, cleanupInput.attemptedKeys)
  ) {
    throw new Error("Publication quarantine evidence does not match the partial projection.");
  }
  return evidence;
}

function quarantineRequest(intent: PublicationCleanupIntent) {
  return Object.freeze({
    publicBucket: intent.publicBucket,
    locationRef: intent.locationRef,
    publicCampaignId: intent.publicCampaignId,
    campaignVersionRef: intent.campaignVersionRef,
    publishedVersion: intent.publishedVersion,
    attemptedKeys: intent.attemptedKeys,
    idempotencyKey: intent.idempotencyKey,
    problemCode: intent.problemCode,
  });
}

export function publicationCleanupBackoffMilliseconds(
  attemptCount: number,
  policy: PublicationCleanupRetryPolicy = DEFAULT_PUBLICATION_CLEANUP_RETRY_POLICY,
): number {
  if (
    !Number.isSafeInteger(attemptCount) ||
    attemptCount < 1 ||
    !Number.isSafeInteger(policy.baseDelayMilliseconds) ||
    policy.baseDelayMilliseconds < 1 ||
    !Number.isSafeInteger(policy.maximumDelayMilliseconds) ||
    policy.maximumDelayMilliseconds < policy.baseDelayMilliseconds
  ) {
    throw new Error("Publication cleanup retry policy is invalid.");
  }
  return Math.min(
    policy.maximumDelayMilliseconds,
    policy.baseDelayMilliseconds * 2 ** Math.min(attemptCount - 1, 30),
  );
}

export async function reconcilePublicationCleanup(
  reconciliation: Pick<
    PublicationCleanupReconciliationPort,
    "claimAvailable" | "complete" | "releaseAfterFailure"
  >,
  adapter: Pick<ProductionObjectStoreAdapter, "quarantinePartialPublication">,
  input: Readonly<{
    leaseOwner: string;
    limit: number;
    leaseUntil: string;
    clock?: () => Date;
    retryPolicy?: PublicationCleanupRetryPolicy;
  }>,
): Promise<
  Readonly<{ leased: number; completed: number; released: number; deadLettered: number }>
> {
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) {
    throw new Error("Publication cleanup lease limit must be an integer from 1 through 100.");
  }
  const leases = await reconciliation.claimAvailable({
    leaseOwner: input.leaseOwner,
    limit: input.limit,
    leaseUntil: input.leaseUntil,
  });
  let completed = 0;
  let released = 0;
  let deadLettered = 0;
  for (const unsafeLease of leases) {
    const lease = PublicationCleanupLeaseSchema.parse(unsafeLease);
    const intent: PublicationCleanupIntent = Object.freeze({
      publicBucket: lease.publicBucket,
      locationRef: lease.locationRef,
      publicCampaignId: lease.publicCampaignId,
      campaignVersionRef: lease.campaignVersionRef,
      publishedVersion: lease.publishedVersion,
      attemptedKeys: lease.attemptedKeys,
      idempotencyKey: lease.idempotencyKey,
      maximumAttempts: lease.maximumAttempts,
      problemCode: lease.problemCode,
    });
    try {
      const evidence = validateQuarantineEvidence(
        await adapter.quarantinePartialPublication(quarantineRequest(intent)),
        intent,
      );
      await reconciliation.complete({
        idempotencyKey: lease.idempotencyKey,
        leaseOwner: lease.leaseOwner,
        quarantinedKeys: evidence.quarantinedKeys,
      });
      completed += 1;
    } catch (cleanupError: unknown) {
      const failedAt = input.clock?.() ?? new Date();
      if (Number.isNaN(failedAt.getTime())) {
        throw new Error("Publication cleanup reconciliation time is invalid.");
      }
      const availableAt = new Date(
        failedAt.getTime() +
          publicationCleanupBackoffMilliseconds(lease.attemptCount, input.retryPolicy),
      ).toISOString();
      let disposition: "pending" | "dead_lettered";
      try {
        disposition = await reconciliation.releaseAfterFailure({
          availableAt,
          idempotencyKey: lease.idempotencyKey,
          leaseOwner: lease.leaseOwner,
          problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
        });
      } catch (releaseError: unknown) {
        throw new PublicationCleanupReleaseError(cleanupError, releaseError, lease.idempotencyKey);
      }
      if (disposition === "dead_lettered") deadLettered += 1;
      else released += 1;
    }
  }
  return Object.freeze({ leased: leases.length, completed, released, deadLettered });
}

function extensionForMimeType(
  mimeType: ArtifactRecord["mimeType"],
): "html" | "pdf" | "png" | "jpg" {
  if (mimeType === "text/html") return "html";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

export async function publishProjectionWithObjectStore(
  untrustedProjection: unknown,
  artifacts: readonly ArtifactRecord[],
  publishedVersion: number,
  untrustedPolicy: unknown,
  adapter: Pick<
    ProductionObjectStoreAdapter,
    "copyApprovedPrivateArtifact" | "quarantinePartialPublication"
  >,
  cleanupReconciliation: Pick<PublicationCleanupReconciliationPort, "enqueue">,
): Promise<PublishedCampaignProjection> {
  const projection = PublishedCampaignProjectionSchema.parse(untrustedProjection);
  const policy = ProductionObjectStorePolicySchema.parse(untrustedPolicy);
  const artifactUrls: Partial<Record<ArtifactType, string>> = {};
  if (artifacts.length === 0)
    throw new Error("At least one approved artifact is required for publication.");

  const plannedCopies: Array<Readonly<{ artifact: ArtifactRecord; publishedKey: string }>> = [];
  const artifactTypes = new Set<ArtifactType>();
  let publicationLocationRef: string | undefined;
  for (const untrustedArtifact of artifacts) {
    const artifact = ArtifactRecordSchema.parse(untrustedArtifact);
    if (artifact.campaignVersionRef !== projection.campaignVersionRef) {
      throw new Error("Published artifacts must belong to the approved campaign version.");
    }
    if (!artifact.storageKey.startsWith(`locations/${artifact.locationRef}/`)) {
      throw new Error("Approved artifact source must remain tenant-private.");
    }
    if (publicationLocationRef !== undefined && artifact.locationRef !== publicationLocationRef) {
      throw new Error("Published artifacts must belong to one tenant location.");
    }
    publicationLocationRef = artifact.locationRef;
    if (artifactTypes.has(artifact.artifactType)) {
      throw new Error(`Artifact type ${artifact.artifactType} appears more than once.`);
    }
    artifactTypes.add(artifact.artifactType);
    const publishedKey = publishedArtifactKey({
      locationRef: artifact.locationRef,
      publicCampaignId: projection.publicCampaignId,
      publishedVersion,
      sha256: artifact.sha256,
      extension: extensionForMimeType(artifact.mimeType),
    });
    plannedCopies.push(Object.freeze({ artifact, publishedKey }));
  }
  if (publicationLocationRef === undefined) {
    throw new Error("Published artifacts must belong to one tenant location.");
  }
  plannedCopies.sort((left, right) => left.publishedKey.localeCompare(right.publishedKey));

  const attemptedKeys: string[] = [];
  try {
    for (const { artifact, publishedKey } of plannedCopies) {
      attemptedKeys.push(publishedKey);
      const receipt = PublishedCopyReceiptSchema.parse(
        await adapter.copyApprovedPrivateArtifact({
          privateBucket: policy.privateBucket,
          publicBucket: policy.publicBucket,
          artifact,
          publishedKey,
        }),
      );
      if (
        receipt.sourceBucket !== policy.privateBucket ||
        receipt.sourceKey !== artifact.storageKey ||
        receipt.destinationBucket !== policy.publicBucket ||
        receipt.destinationKey !== publishedKey ||
        receipt.sha256 !== artifact.sha256 ||
        receipt.artifactRef !== artifact.artifactRef ||
        receipt.campaignVersionRef !== projection.campaignVersionRef
      ) {
        throw new Error("Published copy receipt does not match the approved artifact identity.");
      }
      artifactUrls[artifact.artifactType] = receipt.immutableUrl;
    }
  } catch (publicationError: unknown) {
    const cleanupInput = {
      publicBucket: policy.publicBucket,
      locationRef: publicationLocationRef,
      publicCampaignId: projection.publicCampaignId,
      campaignVersionRef: projection.campaignVersionRef,
      publishedVersion,
      attemptedKeys: Object.freeze([...attemptedKeys]),
      maximumAttempts: DEFAULT_PUBLICATION_CLEANUP_MAXIMUM_ATTEMPTS,
    };
    const idempotencyKey = publicationQuarantineIdempotencyKey(cleanupInput);
    const intent: PublicationCleanupIntent = Object.freeze({
      ...cleanupInput,
      idempotencyKey,
      problemCode: "PUBLICATION_PARTIAL_FAILURE",
    });
    try {
      validateQuarantineEvidence(
        await adapter.quarantinePartialPublication(quarantineRequest(intent)),
        intent,
      );
    } catch (cleanupError: unknown) {
      try {
        await cleanupReconciliation.enqueue(intent);
      } catch (reconciliationError: unknown) {
        throw new AggregateError(
          [publicationError, cleanupError, reconciliationError],
          "Public artifact publication failed and durable cleanup reconciliation could not be recorded.",
        );
      }
      throw new PublicationCleanupReconciliationRequiredError(
        publicationError,
        cleanupError,
        intent,
      );
    }
    throw publicationError;
  }
  return PublishedCampaignProjectionSchema.parse({ ...projection, artifactUrls });
}

const ImmutableAuditEvidenceSchema = z
  .object({
    auditRef: z.string().regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u),
    immutable: z.literal(true),
    recordSha256: Sha256Schema,
    publicCampaignId: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/u),
    campaignVersionRef: z.string().min(8).max(128),
  })
  .strict();

function withdrawalRecordHash(record: ProjectionWithdrawalRecord): string {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex");
}

export async function withdrawProjectionWithObjectStoreAudit(
  projection: unknown,
  actorRef: unknown,
  withdrawnAt: Date,
  adapter: Pick<ProductionObjectStoreAdapter, "withdrawExactProjectionAndAppendImmutableAudit">,
): Promise<Readonly<{ record: ProjectionWithdrawalRecord; auditRef: string }>> {
  let evidence: z.infer<typeof ImmutableAuditEvidenceSchema> | undefined;
  const record = await withdrawProjectionWithAudit(projection, actorRef, withdrawnAt, {
    async withdrawAndAppendAudit(input) {
      evidence = ImmutableAuditEvidenceSchema.parse(
        await adapter.withdrawExactProjectionAndAppendImmutableAudit(input),
      );
    },
  });
  const confirmedEvidence = evidence;
  if (
    confirmedEvidence === undefined ||
    confirmedEvidence.recordSha256 !== withdrawalRecordHash(record) ||
    confirmedEvidence.publicCampaignId !== record.publicCampaignId ||
    confirmedEvidence.campaignVersionRef !== record.campaignVersionRef
  ) {
    throw new Error(
      "Immutable withdrawal audit evidence does not match the exact withdrawn projection.",
    );
  }
  return Object.freeze({ record, auditRef: confirmedEvidence.auditRef });
}
