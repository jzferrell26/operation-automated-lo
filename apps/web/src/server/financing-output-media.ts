import { createHash } from "node:crypto";
import {
  canonicalCampaignHash,
  FinancingMediaError,
  type ResolvedFinancingMedia,
} from "@oalo/application";
import type { FinancingReportView } from "../features/financing/model.js";

export const FINANCING_OUTPUT_MAX_BYTES = 20 * 1024 * 1024;

/** Only a verified explicit empty array can bypass the photograph storage boundary. */
export function financingReportIsTextOnly(report: FinancingReportView): boolean {
  return (
    report.manifest.schemaVersion === 2 &&
    Array.isArray(report.manifest.property.media) &&
    report.manifest.property.media.length === 0
  );
}

/** An output consumes an exact ordered bundle, never caller-selected substitutions. */
export function financingOutputMedia(
  report: FinancingReportView,
  resolved: readonly ResolvedFinancingMedia[] | undefined,
): readonly ResolvedFinancingMedia[] {
  if (report.manifest.schemaVersion === 1) return [];
  const expected = report.manifest.property.media;
  if (!resolved || resolved.length !== expected.length)
    throw new FinancingMediaError("FINANCING_MEDIA_INTEGRITY_FAILED", 422);
  for (const [index, item] of resolved.entries()) {
    if (
      canonicalCampaignHash(item.snapshot) !== canonicalCampaignHash(expected[index]) ||
      item.bytes.byteLength !== item.snapshot.byteSize ||
      createHash("sha256").update(item.bytes).digest("hex") !== item.snapshot.sha256
    )
      throw new FinancingMediaError("FINANCING_MEDIA_INTEGRITY_FAILED", 422);
  }
  return resolved;
}

export function financingImageData(item: ResolvedFinancingMedia): string {
  return `data:${item.snapshot.mimeType};base64,${Buffer.from(item.bytes).toString("base64")}`;
}
