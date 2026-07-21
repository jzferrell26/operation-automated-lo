import { createHash } from "node:crypto";

import {
  ArtifactRecordSchema,
  PublishedCampaignProjectionSchema,
  type ArtifactRecord,
  type ArtifactType,
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
  adapter: Pick<ProductionObjectStoreAdapter, "copyApprovedPrivateArtifact">,
): Promise<PublishedCampaignProjection> {
  const projection = PublishedCampaignProjectionSchema.parse(untrustedProjection);
  const policy = ProductionObjectStorePolicySchema.parse(untrustedPolicy);
  const artifactUrls: Partial<Record<ArtifactType, string>> = {};
  if (artifacts.length === 0)
    throw new Error("At least one approved artifact is required for publication.");

  for (const untrustedArtifact of artifacts) {
    const artifact = ArtifactRecordSchema.parse(untrustedArtifact);
    if (artifact.campaignVersionRef !== projection.campaignVersionRef) {
      throw new Error("Published artifacts must belong to the approved campaign version.");
    }
    if (!artifact.storageKey.startsWith(`locations/${artifact.locationRef}/`)) {
      throw new Error("Approved artifact source must remain tenant-private.");
    }
    if (artifactUrls[artifact.artifactType] !== undefined) {
      throw new Error(`Artifact type ${artifact.artifactType} appears more than once.`);
    }
    const publishedKey = publishedArtifactKey({
      publicCampaignId: projection.publicCampaignId,
      publishedVersion,
      sha256: artifact.sha256,
      extension: extensionForMimeType(artifact.mimeType),
    });
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
