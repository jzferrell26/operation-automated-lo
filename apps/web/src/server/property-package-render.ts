import { createHash } from "node:crypto";
import {
  PROPERTY_PACKAGE_MAX_BYTES,
  PROPERTY_PACKAGE_TEMPLATE_VERSION,
  PropertyCampaignPackageSchema,
  type PropertyCampaignPackage,
  type CampaignVersion,
} from "@oalo/contracts";
import { NodeQrEncoderAdapter } from "@oalo/rendering/qr";
import {
  DRAFT_NOTICE,
  PropertyPackageError,
  propertyPackageDocument,
  propertyDraftCopy,
} from "./property-package-content.js";
import { escapePropertyPackageText, propertyDraftHtml } from "./property-package-html.js";
import { propertyDraftPdf } from "./property-package-pdf.js";

const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const textOutput = (content: string) => ({
  content,
  sha256: digest(content),
  byteSize: Buffer.byteLength(content, "utf8"),
});

export async function renderPropertyCampaignPackage(
  version: CampaignVersion,
  origin: string,
  generatedBy: string,
  generatedAt: string,
): Promise<PropertyCampaignPackage> {
  const document = propertyPackageDocument(version, origin);
  const qr = new NodeQrEncoderAdapter().encodeSymbol({
    payload: document.qrDestination,
    errorCorrection: "M",
    quietZoneModules: 4,
  });
  const flyer = await propertyDraftPdf(document, qr, generatedAt);
  // A labelled wrapper preserves the encoder's four-module quiet zone and keeps the notice in a downloaded SVG.
  const propertyPermission = document.propertyPermissionConfirmed ? "confirmed" : "NOT CONFIRMED";
  const realtorPermission = document.realtorPermissionConfirmed ? "confirmed" : "NOT CONFIRMED";
  const qrDescription = escapePropertyPackageText(
    [
      document.address,
      document.eventLabel,
      document.loanOfficer,
      document.lender,
      document.realtor,
      document.brokerage,
      document.permissions,
    ].join(". "),
  );
  const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="532" viewBox="0 0 420 532" role="img" aria-label="Draft private campaign preview QR code"><title>${DRAFT_NOTICE}. Private preview, sign-in required.</title><desc>${qrDescription}</desc><rect width="420" height="532" fill="white"/><g transform="scale(${420 / qr.viewBoxSize})"><path fill="black" d="${qr.path}"/></g><g text-anchor="middle" font-family="Arial,Helvetica,sans-serif" fill="#172b43"><text x="210" y="443" font-size="13">DRAFT / INTERNAL REVIEW ONLY</text><text x="210" y="467" font-size="12">Private preview. Sign-in required.</text><text x="210" y="490" font-size="12">Property permission: ${propertyPermission}</text><text x="210" y="513" font-size="12">Realtor permission: ${realtorPermission}</text></g></svg>`;
  const result = PropertyCampaignPackageSchema.parse({
    schemaVersion: 1,
    packageRef: `package_${digest(`${version.locationRef}:${version.campaignVersionRef}:${version.manifestHash}:${PROPERTY_PACKAGE_TEMPLATE_VERSION}`).slice(0, 40)}`,
    locationRef: version.locationRef,
    campaignRef: version.campaignRef,
    campaignVersionRef: version.campaignVersionRef,
    sourceManifestHash: version.manifestHash,
    sourceVersionNo: version.versionNo,
    templateVersion: PROPERTY_PACKAGE_TEMPLATE_VERSION,
    generatedAt,
    generatedBy,
    reviewOnly: true,
    qrDestination: document.qrDestination,
    outputs: {
      page: { ...textOutput(propertyDraftHtml(document)), mimeType: "text/html" },
      flyer: {
        mimeType: "application/pdf",
        base64: Buffer.from(flyer.bytes).toString("base64"),
        sha256: digest(flyer.bytes),
        byteSize: flyer.bytes.byteLength,
        pageCount: flyer.pageCount,
      },
      qr: { ...textOutput(qrSvg), mimeType: "image/svg+xml" },
      copy: { ...textOutput(propertyDraftCopy(document)), mimeType: "text/plain" },
    },
  });
  return verifyPropertyPackage(result);
}

/** Recheck stored bytes before any preview or download, rather than trusting saved metadata. */
export function verifyPropertyPackage(raw: unknown): PropertyCampaignPackage {
  const result = PropertyCampaignPackageSchema.parse(raw);
  if (Buffer.byteLength(JSON.stringify(result), "utf8") > PROPERTY_PACKAGE_MAX_BYTES) {
    throw new PropertyPackageError("PROPERTY_PACKAGE_INTEGRITY_FAILED", 503);
  }
  for (const output of Object.values(result.outputs)) {
    const bytes =
      "base64" in output
        ? Buffer.from(output.base64, "base64")
        : Buffer.from(output.content, "utf8");
    if (bytes.byteLength !== output.byteSize || digest(bytes) !== output.sha256) {
      throw new PropertyPackageError("PROPERTY_PACKAGE_INTEGRITY_FAILED", 503);
    }
  }
  return result;
}
