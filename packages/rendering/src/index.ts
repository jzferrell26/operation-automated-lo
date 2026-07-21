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
