import { contractVersion } from "@oalo/contracts";

export const renderingPackage = Object.freeze({
  contractVersion,
  implementation: "deterministic-rendering-contract",
});

export {
  canonicalRenderBytes,
  renderArtifactBatch,
  renderContentHash,
  type BrowserOutput,
  type DeterministicBrowserPort,
  type DeterministicBrowserRenderInput,
  type CollateralBrowserRenderInput,
  type PaidAdBrowserRenderInput,
  type PrivateArtifactPort,
  type RenderBatchInput,
} from "./production-rendering.js";

export {
  publicCampaignPerformanceBudget,
  publicPageVisualFingerprints,
  renderSourceForManifest,
  supportedPublicPageWidths,
  type RenderSourceDocument,
} from "./campaign-render-sources.js";

export {
  normalizeUploadedImages,
  SharpImageNormalizationAdapter,
  type ImageNormalizationPort,
  type NormalizedImage,
} from "./image-normalization.js";

export {
  PdfBinaryInspectionSchema,
  NodeQrEncoderAdapter,
  approvedCampaignLink,
  encodeApprovedCampaignQr,
  inspectPdfBinary,
  resolveApprovedCampaignLink,
  type ApprovedCampaignLink,
  type PdfBinaryInspection,
  type ProductionQrEncoderPort,
  type QrEncodingEvidence,
} from "./render-evidence.js";

export {
  PlaywrightBrowserAdapter,
  type ApprovedRenderAssetLoaderPort,
} from "./playwright-browser.js";

export {
  paidAdRenderAssetManifestHash,
  renderPaidAdCreativeSource,
  type PaidAdCreativeFormat,
  type PaidAdRenderAuthorization,
  type PaidAdRenderAssetAuthority,
  type PaidAdRenderSourceDocument,
} from "./paid-ad-render-sources.js";
