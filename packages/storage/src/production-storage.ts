import { createHash } from "node:crypto";

import {
  ArtifactRecordSchema,
  PublishedCampaignProjectionSchema,
  StorageTransferRequestSchema,
  type ArtifactRecord,
  type ArtifactType,
  type PublishedCampaignProjection,
  type StorageTransferRequest,
} from "@oalo/contracts";

function assertPathSegment(value: string, label: string): string {
  if (!/^[A-Za-z0-9_-]{8,128}$/u.test(value)) {
    throw new Error(`${label} is not an opaque path segment`);
  }
  return value;
}

export function privateArtifactKey(
  input: Readonly<{
    locationRef: string;
    campaignRef: string;
    campaignVersionRef: string;
    artifactRef: string;
    sha256: string;
    extension: "html" | "pdf" | "png" | "jpg";
  }>,
): string {
  const location = assertPathSegment(input.locationRef, "locationRef");
  const campaign = assertPathSegment(input.campaignRef, "campaignRef");
  const version = assertPathSegment(input.campaignVersionRef, "campaignVersionRef");
  const artifact = assertPathSegment(input.artifactRef, "artifactRef");
  if (!/^[a-f0-9]{64}$/u.test(input.sha256)) throw new Error("sha256 is invalid");
  return `locations/${location}/campaigns/${campaign}/versions/${version}/${artifact}/${input.sha256}.${input.extension}`;
}

export function publishedArtifactKey(
  input: Readonly<{
    locationRef: string;
    publicCampaignId: string;
    publishedVersion: number;
    sha256: string;
    extension: "html" | "pdf" | "png" | "jpg";
  }>,
): string {
  const prefix = publishedArtifactPrefix(input);
  if (!/^[a-f0-9]{64}$/u.test(input.sha256)) throw new Error("sha256 is invalid");
  return `${prefix}${input.sha256}.${input.extension}`;
}

export function publishedArtifactPrefix(
  input: Readonly<{
    locationRef: string;
    publicCampaignId: string;
    publishedVersion: number;
  }>,
): string {
  const location = assertPathSegment(input.locationRef, "locationRef");
  const publicId = assertPathSegment(input.publicCampaignId, "publicCampaignId");
  if (!Number.isInteger(input.publishedVersion) || input.publishedVersion < 1) {
    throw new Error("publishedVersion must be a positive integer");
  }
  const tenantNamespace = createHash("sha256").update(location).digest("hex");
  return `locations/${tenantNamespace}/campaigns/${publicId}/${input.publishedVersion}/`;
}

export function planPrivateTransfer(input: unknown, now: Date): StorageTransferRequest {
  const request = StorageTransferRequestSchema.parse(input);
  const expiresInMs = new Date(request.expiresAt).getTime() - now.getTime();
  if (expiresInMs <= 0 || expiresInMs > 10 * 60 * 1_000) {
    throw new Error("Private transfer expiry must be within the next ten minutes");
  }
  if (!request.objectKey.startsWith(`locations/${request.locationRef}/`)) {
    throw new Error("Private transfer key is outside the tenant prefix");
  }
  return Object.freeze(request);
}

export interface PublishedStoragePort {
  copyApprovedArtifact(
    input: Readonly<{
      artifact: ArtifactRecord;
      publishedKey: string;
    }>,
  ): Promise<Readonly<{ immutableUrl: string; sha256: string }>>;
  withdraw(publicCampaignId: string, campaignVersionRef: string): Promise<void>;
}

function extensionForMimeType(
  mimeType: ArtifactRecord["mimeType"],
): "html" | "pdf" | "png" | "jpg" {
  switch (mimeType) {
    case "text/html":
      return "html";
    case "application/pdf":
      return "pdf";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
  }
}

export async function publishProjection(
  untrustedProjection: unknown,
  artifacts: readonly ArtifactRecord[],
  publishedVersion: number,
  port: PublishedStoragePort,
): Promise<PublishedCampaignProjection> {
  const projection = PublishedCampaignProjectionSchema.parse(untrustedProjection);
  const approvedArtifacts = artifacts.map((artifact) => ArtifactRecordSchema.parse(artifact));
  if (approvedArtifacts.length === 0) {
    throw new Error("At least one approved artifact is required for publication");
  }
  if (
    approvedArtifacts.some(
      (artifact) => artifact.campaignVersionRef !== projection.campaignVersionRef,
    )
  ) {
    throw new Error("Published artifacts must belong to the approved campaign version");
  }
  const locationRef = approvedArtifacts[0]?.locationRef;
  if (
    locationRef === undefined ||
    approvedArtifacts.some((artifact) => artifact.locationRef !== locationRef)
  ) {
    throw new Error("Published artifacts must belong to one tenant location");
  }
  const artifactUrls: Partial<Record<ArtifactType, string>> = {};
  for (const artifact of approvedArtifacts) {
    if (artifactUrls[artifact.artifactType] !== undefined) {
      throw new Error(`Artifact type ${artifact.artifactType} appears more than once`);
    }
    const publishedKey = publishedArtifactKey({
      locationRef,
      publicCampaignId: projection.publicCampaignId,
      publishedVersion,
      sha256: artifact.sha256,
      extension: extensionForMimeType(artifact.mimeType),
    });
    const copied = await port.copyApprovedArtifact({ artifact, publishedKey });
    if (copied.sha256 !== artifact.sha256) {
      throw new Error("Published copy checksum does not match the approved artifact");
    }
    artifactUrls[artifact.artifactType] = copied.immutableUrl;
  }
  return Object.freeze(
    PublishedCampaignProjectionSchema.parse({
      ...projection,
      artifactUrls,
    }),
  );
}

export async function withdrawProjection(
  projection: PublishedCampaignProjection,
  port: PublishedStoragePort,
): Promise<void> {
  const validated = PublishedCampaignProjectionSchema.parse(projection);
  await port.withdraw(validated.publicCampaignId, validated.campaignVersionRef);
}
