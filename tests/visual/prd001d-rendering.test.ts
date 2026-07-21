import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  publicPageVisualFingerprints,
  renderSourceForManifest,
  supportedPublicPageWidths,
} from "../../packages/rendering/src/index.js";
import { renderingGoldenFixtures } from "../../tooling/tests/fixtures/prd001d-render-manifests.js";

describe("PRD-001d golden rendering corpus", () => {
  it("covers common, long-text, missing-photo, portrait-photo and multi-disclosure fixtures", () => {
    expect(Object.keys(renderingGoldenFixtures)).toEqual([
      "common",
      "longText",
      "missingPhoto",
      "portraitPhoto",
      "multiDisclosure",
    ]);
    for (const manifest of Object.values(renderingGoldenFixtures)) {
      const page = renderSourceForManifest(manifest, "public-page-projection");
      const pdf = renderSourceForManifest(manifest, "pdf");
      expect(page.html).toContain(manifest.publicContent.headline);
      expect(pdf.html).toContain(manifest.publicContent.headline);
    }
  });

  it("produces deterministic, width-specific page fingerprints at every supported width", () => {
    for (const manifest of Object.values(renderingGoldenFixtures)) {
      const first = publicPageVisualFingerprints(manifest);
      const second = publicPageVisualFingerprints(structuredClone(manifest));
      expect(second).toEqual(first);
      expect(Object.keys(first).map(Number)).toEqual([...supportedPublicPageWidths]);
      expect(new Set(Object.values(first))).toHaveLength(supportedPublicPageWidths.length);
    }
  });

  it("fingerprints every generated PDF page and preserves all disclosure endings", () => {
    for (const manifest of Object.values(renderingGoldenFixtures)) {
      const pdf = renderSourceForManifest(manifest, "pdf");
      const pages = pdf.html.match(/<section class="pdf-page">[\s\S]*?<\/section>/gu) ?? [];
      const fingerprints = pages.map((page) => createHash("sha256").update(page).digest("hex"));
      expect(pages.length).toBeGreaterThanOrEqual(3);
      expect(new Set(fingerprints)).toHaveLength(pages.length);
      for (const disclosure of manifest.publicContent.disclosureBlocks) {
        expect(pdf.html).toContain(disclosure.slice(-Math.min(120, disclosure.length)));
      }
    }
  });

  it("keeps consent and configured crop geometry in the golden render sources", () => {
    const page = renderSourceForManifest(renderingGoldenFixtures.common, "public-page-projection");
    const commonSquare = renderSourceForManifest(renderingGoldenFixtures.common, "meta-square");
    const portraitStory = renderSourceForManifest(
      renderingGoldenFixtures.portraitPhoto,
      "meta-story",
    );

    expect(page.html).toContain(
      `Consent disclosure version: ${renderingGoldenFixtures.common.consentDisclosureVersion}`,
    );
    expect(page.html.indexOf("Consent disclosure version")).toBeLessThan(
      page.html.indexOf('class="cta"'),
    );
    expect(commonSquare.html).toContain('data-focal-point="50%,50%"');
    expect(commonSquare.html).toContain('data-safe-zone="5%,6%,5%,6%"');
    expect(portraitStory.html).toContain('data-focal-point="50%,35%"');
    expect(portraitStory.html).toContain('data-safe-zone="5%,8%,10%,8%"');
  });
});
