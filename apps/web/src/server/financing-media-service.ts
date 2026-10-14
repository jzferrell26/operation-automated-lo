import "server-only";
import { createHash } from "node:crypto";
import {
  assertMayExecuteCampaignMutation,
  canonicalCampaignHash,
  FinancingMediaError,
  type AuthenticatedPrincipal,
  type FinancingMediaBytesPort,
  type FinancingMediaRepository,
  type ResolvedFinancingMedia,
} from "@oalo/application";
import {
  FINANCING_MEDIA_MAX_BYTES,
  FinancingMediaRecordSchema,
  FinancingMediaSnapshotSchema,
  FinancingPropertyMediaSchema,
  FinancingMediaRefSchema,
  FinancingMediaAltTextSchema,
  FinancingImageMimeSchema,
  FinancingRightsBasisSchema,
  type FinancingMediaRecord,
  type FinancingMediaSnapshot,
} from "@oalo/contracts";
import { normalizeUploadedImages, SharpImageNormalizationAdapter } from "@oalo/rendering";
import sharp from "sharp";
import { R2ObjectStoreError, FinancingMediaStorageError } from "@oalo/storage";
import { z } from "zod";

const sha256 = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
let activeNormalizations = 0;
export interface FinancingMediaRuntime {
  readonly repository: FinancingMediaRepository;
  readonly bytes: FinancingMediaBytesPort;
}
async function inspect(bytes: Uint8Array, mime: string, normalized: boolean) {
  // Sharp/libvips can decode only the first APNG frame. Reject animation chunks
  // before accepting that first frame as an ordinary static PNG.
  if (mime === "image/png") {
    const source = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let offset = 8; offset + 12 <= source.length;) {
      const length = source.readUInt32BE(offset);
      if (length > source.length - offset - 12) throw new Error("Invalid PNG chunks");
      if (source.toString("ascii", offset + 4, offset + 8) === "acTL")
        throw new Error("Animated PNG unsupported");
      offset += length + 12;
    }
  }
  // sharp is a native external module. Normalize the view to a node Buffer so
  // a Uint8Array supplied by another server realm has identical byte semantics.
  const sourceBytes = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const processor = sharp(sourceBytes, {
    limitInputPixels: 12_000_000,
    failOn: "warning",
    unlimited: false,
  });
  const m = await processor.metadata();
  if (
    !m.width ||
    !m.height ||
    m.width < 400 ||
    m.height < 400 ||
    m.width > 6000 ||
    m.height > 6000 ||
    m.width * m.height > 12_000_000 ||
    (m.pages ?? 1) !== 1 ||
    (m.format === "jpeg" ? "image/jpeg" : m.format === "png" ? "image/png" : "") !== mime ||
    (normalized && Boolean(m.exif || m.icc || m.iptc || m.xmp || m.tifftagPhotoshop))
  )
    throw new Error("Invalid image");
  if (normalized) await processor.raw().toBuffer();
  return { width: m.width, height: m.height };
}
export async function verifyFinancingMediaBytes(
  record: FinancingMediaRecord,
  port: FinancingMediaBytesPort,
): Promise<Uint8Array> {
  let bytes: Uint8Array;
  try {
    bytes = await port.read(record);
  } catch (error) {
    if (
      (error instanceof R2ObjectStoreError &&
        !["not_found", "conflict"].includes(error.classification)) ||
      (error instanceof FinancingMediaStorageError && error.kind === "unavailable")
    )
      throw new FinancingMediaError("FINANCING_MEDIA_UNAVAILABLE", 503);
    throw new FinancingMediaError("FINANCING_MEDIA_INTEGRITY_FAILED", 422);
  }
  try {
    if (bytes.length !== record.byteSize || sha256(bytes) !== record.sha256)
      throw new Error("Hash mismatch");
    const size = await inspect(bytes, record.mimeType, true);
    if (size.width !== record.width || size.height !== record.height)
      throw new Error("Dimension mismatch");
  } catch {
    throw new FinancingMediaError("FINANCING_MEDIA_INTEGRITY_FAILED", 422);
  }
  return bytes;
}
export function financingMediaPublicRecord(record: FinancingMediaRecord) {
  const {
    mediaRef,
    sha256,
    mimeType,
    byteSize,
    width,
    height,
    normalizationVersion,
    metadataRetained,
    rights,
  } = record;
  return {
    mediaRef,
    sha256,
    mimeType,
    byteSize,
    width,
    height,
    normalizationVersion,
    metadataRetained,
    rights,
  };
}
const Intake = z
  .object({
    requestId: z.uuid(),
    declaredMimeType: FinancingImageMimeSchema,
    rightsBasis: FinancingRightsBasisSchema,
    rightsConfirmed: z.literal(true),
  })
  .strict();
export async function uploadFinancingMedia(
  input: unknown,
  sourceBytes: Uint8Array,
  principal: AuthenticatedPrincipal,
  runtime: FinancingMediaRuntime,
  now: () => Date = () => new Date(),
) {
  assertMayExecuteCampaignMutation(principal);
  const values = Intake.parse(input);
  if (sourceBytes.length < 1) throw new FinancingMediaError("FINANCING_MEDIA_INVALID", 400);
  if (sourceBytes.length > FINANCING_MEDIA_MAX_BYTES)
    throw new FinancingMediaError("FINANCING_MEDIA_TOO_LARGE", 413);
  const sourceSha256 = sha256(sourceBytes);
  const mediaRef = `media_${sha256(`financing-media:${principal.locationRef}:${principal.actorRef}:${values.requestId}`).slice(0, 32)}`;
  const requestHash = canonicalCampaignHash({
    sourceSha256,
    declaredMimeType: values.declaredMimeType,
    rightsBasis: values.rightsBasis,
    rightsConfirmed: true,
  });
  const existing = await runtime.repository.find(mediaRef);
  if (existing) {
    if (existing.record.requestHash !== requestHash)
      throw new FinancingMediaError("FINANCING_MEDIA_CONFLICT", 409);
    if (existing.revocation) throw new FinancingMediaError("FINANCING_MEDIA_REVOKED", 410);
    await readFinancingMedia(mediaRef, runtime);
    return { record: existing.record, replayed: true };
  }
  if (activeNormalizations >= 2) throw new FinancingMediaError("FINANCING_MEDIA_BUSY", 429);
  activeNormalizations++;
  let normalized;
  try {
    await inspect(sourceBytes, values.declaredMimeType, false);
    normalized = (
      await normalizeUploadedImages(
        {
          schemaVersion: 1,
          locationRef: principal.locationRef,
          files: [
            { assetRef: mediaRef, bytes: sourceBytes, declaredMimeType: values.declaredMimeType },
          ],
        },
        new SharpImageNormalizationAdapter(),
      )
    )[0];
    if (!normalized) throw new Error("Missing image");
    if (normalized.bytes.length > FINANCING_MEDIA_MAX_BYTES)
      throw new FinancingMediaError("FINANCING_MEDIA_TOO_LARGE", 413);
    await inspect(normalized.bytes, normalized.mimeType, true);
  } catch (error) {
    if (error instanceof FinancingMediaError) throw error;
    throw new FinancingMediaError("FINANCING_MEDIA_INVALID", 400);
  } finally {
    activeNormalizations--;
  }
  const createdAt = now().toISOString();
  const record = FinancingMediaRecordSchema.parse({
    mediaRef,
    locationRef: principal.locationRef,
    createdBy: principal.actorRef,
    requestId: values.requestId,
    requestHash,
    sourceSha256,
    sha256: normalized.sha256,
    mimeType: normalized.mimeType,
    byteSize: normalized.bytes.length,
    width: normalized.width,
    height: normalized.height,
    normalizationVersion: "1.0.0",
    metadataRetained: false,
    rights: {
      schemaVersion: 1,
      basis: values.rightsBasis,
      confirmed: true,
      attestedBy: principal.actorRef,
      attestedAt: createdAt,
      scope: "tenant-private-financing",
    },
    createdAt,
  });
  await runtime.bytes.putImmutable(record, normalized.bytes);
  await verifyFinancingMediaBytes(record, runtime.bytes);
  const committed = await runtime.repository.commitReady(record);
  // Concurrent exact requests preserve the original record and attestation.
  const final = await runtime.repository.find(mediaRef);
  if (!final) throw new FinancingMediaError("FINANCING_MEDIA_INTEGRITY_FAILED", 422);
  if (final.revocation) throw new FinancingMediaError("FINANCING_MEDIA_REVOKED", 410);
  return { record: committed, replayed: committed.createdAt !== createdAt };
}
export async function readFinancingMedia(mediaRef: string, runtime: FinancingMediaRuntime) {
  if (!FinancingMediaRefSchema.safeParse(mediaRef).success)
    throw new FinancingMediaError("FINANCING_MEDIA_NOT_FOUND", 404);
  const found = await runtime.repository.find(mediaRef);
  if (!found) throw new FinancingMediaError("FINANCING_MEDIA_NOT_FOUND", 404);
  if (found.revocation) throw new FinancingMediaError("FINANCING_MEDIA_REVOKED", 410);
  const bytes = await verifyFinancingMediaBytes(found.record, runtime.bytes);
  const current = await runtime.repository.find(mediaRef);
  if (!current) throw new FinancingMediaError("FINANCING_MEDIA_INTEGRITY_FAILED", 422);
  if (current.revocation) throw new FinancingMediaError("FINANCING_MEDIA_REVOKED", 410);
  return { record: found.record, bytes };
}
const Placements = z
  .array(
    z.object({ mediaRef: FinancingMediaRefSchema, altText: FinancingMediaAltTextSchema }).strict(),
  )
  .max(6)
  .refine((items) => new Set(items.map((item) => item.mediaRef)).size === items.length);
export async function resolveFinancingMediaPlacements(
  input: readonly { mediaRef: string; altText: string }[],
  repository: FinancingMediaRepository,
  bytes: FinancingMediaBytesPort,
): Promise<readonly FinancingMediaSnapshot[]> {
  const snapshots: FinancingMediaSnapshot[] = [];
  for (const placement of Placements.parse(input)) {
    const resolved = await readFinancingMedia(placement.mediaRef, { repository, bytes });
    snapshots.push(
      FinancingMediaSnapshotSchema.parse({
        ...financingMediaPublicRecord(resolved.record),
        altText: placement.altText,
      }),
    );
  }
  return FinancingPropertyMediaSchema.parse(snapshots);
}
export async function resolveFinancingMedia(
  report: { manifest: { schemaVersion: number; property: unknown } },
  repository: FinancingMediaRepository,
  bytes: FinancingMediaBytesPort,
): Promise<readonly ResolvedFinancingMedia[]> {
  if (report.manifest.schemaVersion === 1) return [];
  if (report.manifest.schemaVersion !== 2)
    throw new FinancingMediaError("FINANCING_MEDIA_INVALID", 400);
  const property = z
    .object({ media: FinancingPropertyMediaSchema })
    .passthrough()
    .parse(report.manifest.property);
  const result: ResolvedFinancingMedia[] = [];
  for (const snapshot of property.media) {
    const resolved = await readFinancingMedia(snapshot.mediaRef, { repository, bytes });
    const current = FinancingMediaSnapshotSchema.parse({
      ...financingMediaPublicRecord(resolved.record),
      altText: snapshot.altText,
    });
    if (canonicalCampaignHash(current) !== canonicalCampaignHash(snapshot))
      throw new FinancingMediaError("FINANCING_MEDIA_INTEGRITY_FAILED", 422);
    result.push({ snapshot, bytes: resolved.bytes });
  }
  return result;
}
