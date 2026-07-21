import { createHash } from "node:crypto";

import { RenderManifestSchema, type RenderManifest } from "@oalo/contracts";
import QRCode from "qrcode";
import { z } from "zod";

const OPAQUE_TRACKING_REFERENCE = /^track_[a-f0-9]{24}$/u;

export interface ApprovedCampaignLink {
  readonly payload: string;
  readonly campaignVersionRef: string;
  readonly trackingRef: string;
}

export function approvedCampaignLink(untrustedManifest: unknown): ApprovedCampaignLink {
  const manifest = RenderManifestSchema.parse(untrustedManifest);
  const trackingRef = `track_${createHash("sha256")
    .update(`${manifest.campaignVersionRef}:${manifest.manifestRef}`)
    .digest("hex")
    .slice(0, 24)}`;
  const query = new URLSearchParams({ v: manifest.campaignVersionRef, t: trackingRef });
  return Object.freeze({
    payload: `${manifest.publicContent.destinationPath}?${query.toString()}`,
    campaignVersionRef: manifest.campaignVersionRef,
    trackingRef,
  });
}

export function resolveApprovedCampaignLink(
  untrustedManifest: unknown,
  payload: string,
): ApprovedCampaignLink {
  const manifest = RenderManifestSchema.parse(untrustedManifest);
  const parsed = new URL(payload, "https://render.invalid");
  const resolved = approvedCampaignLink(manifest);
  if (
    parsed.origin !== "https://render.invalid" ||
    parsed.pathname !== manifest.publicContent.destinationPath ||
    parsed.searchParams.get("v") !== manifest.campaignVersionRef ||
    parsed.searchParams.get("t") === null ||
    !OPAQUE_TRACKING_REFERENCE.test(parsed.searchParams.get("t") ?? "") ||
    parsed.searchParams.toString() !==
      new URL(resolved.payload, "https://render.invalid").searchParams.toString()
  ) {
    throw new Error("QR and short-link payload does not resolve to the approved campaign version");
  }
  return resolved;
}

export interface ProductionQrEncoderPort {
  encodeSvg(
    input: Readonly<{ payload: string; errorCorrection: "M"; quietZoneModules: 4 }>,
  ): string;
}

export class NodeQrEncoderAdapter implements ProductionQrEncoderPort {
  encodeSvg(
    input: Readonly<{ payload: string; errorCorrection: "M"; quietZoneModules: 4 }>,
  ): string {
    const encoded = QRCode.create(input.payload, { errorCorrectionLevel: input.errorCorrection });
    const size = encoded.modules.size;
    const viewBoxSize = size + input.quietZoneModules * 2;
    const darkModules: string[] = [];
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        if (encoded.modules.get(row, column) === 1) {
          darkModules.push(
            `M${String(column + input.quietZoneModules)} ${String(row + input.quietZoneModules)}h1v1h-1z`,
          );
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(viewBoxSize)} ${String(viewBoxSize)}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><path fill="#000" d="${darkModules.join("")}"/></svg>`;
  }
}

export interface QrEncodingEvidence extends ApprovedCampaignLink {
  readonly svg: string;
  readonly sha256: string;
}

export function encodeApprovedCampaignQr(
  manifest: RenderManifest,
  encoder: ProductionQrEncoderPort,
): QrEncodingEvidence {
  const link = approvedCampaignLink(manifest);
  const svg = encoder.encodeSvg({
    payload: link.payload,
    errorCorrection: "M",
    quietZoneModules: 4,
  });
  const svgWithoutNamespace = svg.replace('xmlns="http://www.w3.org/2000/svg"', "");
  if (
    !svg.startsWith("<svg") ||
    /(?:https?:|<script|<foreignObject)/iu.test(svgWithoutNamespace) ||
    !/viewBox=/u.test(svg)
  ) {
    throw new Error("QR encoder did not return a self-contained SVG");
  }
  return Object.freeze({
    ...link,
    svg,
    sha256: createHash("sha256").update(svg).digest("hex"),
  });
}

export interface PdfBinaryInspection {
  readonly isPdf: boolean;
  readonly hasEofMarker: boolean;
  readonly pageCount: number;
  readonly hasTaggedStructure: boolean;
  readonly hasDocumentLanguage: boolean;
  readonly hasRemoteRuntimeDependency: boolean;
}

export function inspectPdfBinary(bytes: Uint8Array): PdfBinaryInspection {
  const text = new TextDecoder("latin1").decode(bytes);
  const isPdf = text.startsWith("%PDF-");
  const hasEofMarker = /%%EOF\s*$/u.test(text);
  const pageCount = (text.match(/\/Type\s*\/Page(?!s)\b/gu) ?? []).length;
  const hasTaggedStructure = /\/StructTreeRoot\b/u.test(text) && /\/MarkInfo\b/u.test(text);
  const hasDocumentLanguage = /\/Lang\s*(?:\(|\/)/u.test(text);
  const hasRemoteRuntimeDependency =
    /\/URI\s*\([^)]*(?:https?:|ftp:|javascript:)/iu.test(text) ||
    /(?:https?:|ftp:|javascript:)/iu.test(text);
  return Object.freeze({
    isPdf,
    hasEofMarker,
    pageCount,
    hasTaggedStructure,
    hasDocumentLanguage,
    hasRemoteRuntimeDependency,
  });
}

export const PdfBinaryInspectionSchema = z
  .object({
    isPdf: z.literal(true),
    hasEofMarker: z.literal(true),
    pageCount: z.number().int().positive(),
    hasTaggedStructure: z.literal(true),
    hasDocumentLanguage: z.literal(true),
    hasRemoteRuntimeDependency: z.literal(false),
  })
  .strict();
