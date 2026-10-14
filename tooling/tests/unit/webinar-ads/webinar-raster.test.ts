import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { canonicalCampaignHash } from "@oalo/application";
import { WebinarAdCampaignManifestSchema, type WebinarAdCampaignManifest } from "@oalo/contracts";
import {
  renderWebinarAdRasters,
  verifyFrozenWebinarRaster,
  verifyWebinarPanel,
  webinarRasterSha256,
} from "@oalo/rendering";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { inspectAdsLibraryArt } from "../../../../apps/web/src/features/ads-library/server/art-file.js";
import { WEBINAR_ADS } from "../../../../apps/web/src/features/webinar-ads/catalog.js";
import {
  loadVerifiedWebinarArt,
  readContainedWebinarFile,
  webinarPublicRoot,
  webinarTemplateEvidence,
} from "../../../../apps/web/src/server/webinar-ad-art.js";
import {
  prepareWebinarAdRasters,
  regenerateWebinarAdRasters,
  type WebinarAdPreparationRasterInput,
} from "../../../../apps/web/src/server/webinar-ad-raster.js";

async function input(id = WEBINAR_ADS[0]!.id): Promise<WebinarAdPreparationRasterInput> {
  return {
    template: webinarTemplateEvidence(id, 1),
    advertiser: {
      name: "Alex Morgan",
      title: "Loan officer",
      company: "Prairie Home Lending",
      nmls: "0000000",
      companyNmls: "0000000",
      colorPresetId: "navy",
    },
    content: {
      headline: "Plan your first home",
      body: "Learn practical steps in a homebuyer webinar.",
      callToAction: "Learn more",
      disclosureText: "Equal Housing Opportunity.",
      consentText: "Contact me about home financing.",
      claims: [],
      mergeTokens: [],
      financingTerms: [],
    },
  };
}
async function assets() {
  const value = await input();
  const art = await loadVerifiedWebinarArt(value.template);
  return {
    ...art,
    fontFile: resolve("apps/web/public/fonts/webinar/AutomatedLOWebinarInter.ttf"),
    glyphRanges: JSON.parse(
      await readFile(resolve("apps/web/public/fonts/webinar/glyph-ranges.json"), "utf8"),
    ) as [number, number][],
  };
}
async function frozenManifest(
  value: WebinarAdPreparationRasterInput,
): Promise<WebinarAdCampaignManifest> {
  const renders = await prepareWebinarAdRasters(value);
  const destination = {
    publicationId: "00000000-0000-4000-8000-000000000801",
    kind: "on-demand",
    sourceRevision: "00000000-0000-4000-8000-000000000802",
    publisherActorRef: "actor_syntheticRaster",
    snapshotHash: "a".repeat(64),
    publicUrl: "https://example.test/f/00000000-0000-4000-8000-000000000801",
    publishedAt: "2026-10-01T12:00:00.000Z",
    expiresAt: "2026-11-15T18:00:00.000Z",
    eventStartsAt: null,
  };
  return WebinarAdCampaignManifestSchema.parse({
    schemaVersion: 1,
    blueprintId: "webinar-ad",
    requestHash: "a".repeat(64),
    destination,
    destinationHash: canonicalCampaignHash(destination),
    schedule: { startsAt: null, endsAt: "2026-10-31T23:59:59.000Z" },
    meta: {
      enabled: false,
      specialAdCategory: "HOUSING",
      platform: "meta",
      placements: ["facebook_feed"],
      targeting: {
        country: "US",
        regions: ["IL"],
        cities: [],
        zipCodes: [],
        customAudienceRefs: [],
        protectedDimensions: [],
      },
      dailyBudgetMinor: 2500,
      totalBudgetMinor: 35000,
    },
    ...value,
    images: renders.map(({ bytes: _bytes, ...image }) => ({
      ...image,
      assetRef: `webinarimage_${image.shape}${image.contentSha256.slice(0, 32)}`,
      altText: "Original webinar art with synthetic lender identity",
    })),
  });
}

describe("native fixed-font webinar raster evidence", () => {
  it.each(WEBINAR_ADS)(
    "renders both exact panels and complete lender footers for $id",
    async (entry) => {
      const value = await input(entry.id);
      const renders = await prepareWebinarAdRasters(value);
      const artifactRoot = resolve("test-results/product-review-frames/webinar-raster");
      await mkdir(artifactRoot, { recursive: true });
      for (const output of renders) {
        expect(output.byteLength).toBe(output.bytes.byteLength);
        expect(output.byteLength).toBeLessThanOrEqual(2 * 1024 * 1024);
        expect(output.contentSha256).toBe(webinarRasterSha256(output.bytes));
        expect(inspectAdsLibraryArt(output.bytes)).toEqual({
          ok: true,
          type: "png",
          width: 1080,
          height: output.shape === "tall" ? 1350 : 1080,
          metadata: [],
        });
        const source = await readFile(
          resolve("apps/web/public", `.${entry.art[output.shape].path}`),
        );
        const originalPixels = await sharp(source).ensureAlpha().raw().toBuffer();
        const outputPanel = await sharp(output.bytes)
          .extract({ left: 0, top: 0, width: 1080, height: output.shape === "tall" ? 1080 : 842 })
          .ensureAlpha()
          .raw()
          .toBuffer();
        expect(outputPanel.equals(originalPixels)).toBe(true);
        await writeFile(join(artifactRoot, `${entry.id}-${output.shape}.png`), output.bytes);
      }
    },
  );
  it("repeats exact bytes and regenerates only frozen identity and disclosure", async () => {
    const value = await input();
    const manifest = await frozenManifest(value);
    const repeated = await regenerateWebinarAdRasters(manifest);
    expect(repeated.map((image) => image.contentSha256)).toEqual(
      manifest.images.map((image) => image.contentSha256),
    );
    const editedPlacementCopy = await prepareWebinarAdRasters({
      ...value,
      content: {
        ...value.content,
        headline: "Different placement heading",
        body: "Different edited Facebook placement words.",
      },
    });
    expect(editedPlacementCopy.map((image) => image.contentSha256)).toEqual(
      manifest.images.map((image) => image.contentSha256),
    );
  });
  it("keeps exact historical images after registry withdrawal while refusing new preparation", async () => {
    const value = await input();
    const manifest = await frozenManifest(value);
    const index = WEBINAR_ADS.findIndex((entry) => entry.id === value.template.id);
    const [withdrawn] = WEBINAR_ADS.splice(index, 1);
    try {
      await expect(prepareWebinarAdRasters(value)).rejects.toMatchObject({
        code: "WEBINAR_ART_INVALID",
      });
      const historical = await regenerateWebinarAdRasters(manifest);
      expect(historical.map((image) => image.contentSha256)).toEqual(
        manifest.images.map((image) => image.contentSha256),
      );
      await expect(
        regenerateWebinarAdRasters({
          ...manifest,
          template: { ...manifest.template, tallSha256: "0".repeat(64) },
        }),
      ).rejects.toMatchObject({ code: "WEBINAR_ART_INVALID" });
    } finally {
      WEBINAR_ADS.splice(index, 0, withdrawn!);
    }
  });
  it("refuses every altered frozen digest, dimensions, byte count, shape and renderer version", async () => {
    const value = await input();
    const manifest = await frozenManifest(value);
    const output = (await prepareWebinarAdRasters(value))[0];
    const expected = manifest.images[0];
    for (const change of [
      { contentSha256: "f".repeat(64) },
      { byteLength: expected.byteLength + 1 },
      { rendererVersion: "2.0.0" },
      { width: 1079 },
      { height: 1351 },
      { shape: "square" },
    ]) {
      expect(() =>
        verifyFrozenWebinarRaster(output, { ...expected, ...change } as typeof expected),
      ).toThrow("WEBINAR_RASTER_CHANGED");
    }
    const alteredBytes = Uint8Array.from(output.bytes);
    alteredBytes[100] = (alteredBytes[100] ?? 0) ^ 1;
    expect(() => verifyFrozenWebinarRaster({ ...output, bytes: alteredBytes }, expected)).toThrow(
      "WEBINAR_RASTER_CHANGED",
    );
    await expect(
      regenerateWebinarAdRasters({
        ...manifest,
        images: [{ ...expected, contentSha256: "f".repeat(64) }, manifest.images[1]],
      }),
    ).rejects.toMatchObject({ code: "WEBINAR_RASTER_CHANGED" });
  });
  it("renders long identity, escaped ampersands and full disclosure or explicitly refuses a legible fit", async () => {
    const value = await input();
    const long = {
      ...value,
      advertiser: {
        ...value.advertiser,
        name: "Alexandra Christine Montgomery Whitfield",
        title: "Senior residential mortgage loan officer",
        company: "Prairie & Lakes Regional Home Lending Company",
        nmls: "123456789012",
        companyNmls: "987654321012",
      },
      content: {
        ...value.content,
        disclosureText:
          "Equal Housing Opportunity. Educational information only; eligibility and loan terms depend on individual circumstances.",
      },
    };
    const rendered = await prepareWebinarAdRasters(long);
    for (const image of rendered)
      await writeFile(
        resolve(`test-results/product-review-frames/webinar-raster/long-brand-${image.shape}.png`),
        image.bytes,
      );
    const maximum = {
      ...long,
      advertiser: {
        ...long.advertiser,
        name: "Alexander ".repeat(12).trim().padEnd(120, "W"),
        title: "Residential mortgage education and home financing specialist".padEnd(60, "W"),
        company: "Prairie Regional Home Lending and Mortgage Education Company "
          .repeat(2)
          .trim()
          .padEnd(160, "W"),
      },
      content: { ...long.content, disclosureText: long.content.disclosureText.padEnd(120, ".") },
    };
    // A valid bound does not permit unreadable output. This exact worst case refuses both outputs.
    await expect(prepareWebinarAdRasters(maximum)).rejects.toMatchObject({
      code: "WEBINAR_BRAND_DOES_NOT_FIT",
    });
  });
  it("rejects unsupported glyphs, invisible control, markup, missing identity and arbitrary preset", async () => {
    const value = await input();
    for (const change of [
      { name: "Alex 🏠" },
      { name: "Alex\u200bMorgan" },
      { name: "<b>Alex</b>" },
      { companyNmls: "" },
      { colorPresetId: "custom" },
    ])
      await expect(
        prepareWebinarAdRasters({ ...value, advertiser: { ...value.advertiser, ...change } }),
      ).rejects.toMatchObject({ code: "WEBINAR_ART_INVALID" });
  });
  it("refuses missing/replaced versions, changed registry hashes and traversal paths", async () => {
    const value = await input();
    for (const change of [
      { id: "webinar-missing-source" },
      { version: 2 },
      { sourceHash: "0".repeat(64) },
      { tallSha256: "0".repeat(64) },
      { squareSha256: "0".repeat(64) },
      { id: "../../private" },
    ])
      await expect(loadVerifiedWebinarArt({ ...value.template, ...change })).rejects.toMatchObject({
        code: "WEBINAR_ART_INVALID",
      });
    for (const part of ["..", "/etc", "C:\\private", "https://example.test", "hello/../../private"])
      await expect(
        readContainedWebinarFile(webinarPublicRoot(), [part], 100),
      ).rejects.toMatchObject({ code: "WEBINAR_ART_INVALID" });
  });
  it("refuses metadata, malformed pixels, renamed non-PNG, trailing bytes and wrong dimensions", async () => {
    const original = (await assets()).tall;
    const withMetadata = await sharp(original)
      .withExif({ IFD0: { Artist: "Fixture identity" } })
      .png()
      .toBuffer();
    const wrongSize = await sharp(original).resize(1079, 1080).png().toBuffer();
    const wrongType = await sharp(original).jpeg().toBuffer();
    const badCrc = Uint8Array.from(original);
    badCrc[29] = (badCrc[29] ?? 0) ^ 1;
    const variants = [
      withMetadata,
      wrongSize,
      wrongType,
      badCrc,
      Buffer.concat([original, Buffer.from("trailing payload")]),
      Buffer.from(original.subarray(0, 100)),
    ];
    for (const variant of variants)
      await expect(
        verifyWebinarPanel(variant, webinarRasterSha256(variant), 1080),
      ).rejects.toThrow();
  });
  it("rejects a source directory junction and a changed font before native rendering", async () => {
    const directory = await mkdtemp(join(tmpdir(), "oalo-webinar-raster-"));
    try {
      await symlink(
        resolve("apps/web/public/webinar-ads"),
        join(directory, "webinar-ads"),
        process.platform === "win32" ? "junction" : "dir",
      );
      await expect(
        loadVerifiedWebinarArt((await input()).template, directory),
      ).rejects.toMatchObject({ code: "WEBINAR_ART_INVALID" });
      const changedFont = join(directory, "changed.ttf");
      await writeFile(changedFont, Buffer.from("bad font"));
      const value = await input();
      await expect(
        renderWebinarAdRasters(
          {
            template: value.template,
            advertiser: value.advertiser,
            disclosureText: "Equal Housing Opportunity.",
          },
          { ...(await assets()), fontFile: changedFont },
        ),
      ).rejects.toMatchObject({ code: "WEBINAR_RENDER_UNAVAILABLE" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("bounds concurrent native jobs and releases slots after refusal", async () => {
    const value = await input();
    const raw = {
      template: value.template,
      advertiser: value.advertiser,
      disclosureText: value.content.disclosureText,
    };
    const loaded = await assets();
    const first = renderWebinarAdRasters(raw, loaded);
    const second = renderWebinarAdRasters(raw, loaded);
    await expect(renderWebinarAdRasters(raw, loaded)).rejects.toMatchObject({
      code: "WEBINAR_RENDER_BUSY",
    });
    await Promise.all([first, second]);
    await expect(renderWebinarAdRasters(raw, loaded)).resolves.toHaveLength(2);
  });
});
