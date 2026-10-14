import "server-only";

import { WebinarAdCampaignManifestSchema, type WebinarAdCampaignManifest } from "@oalo/contracts";
import {
  renderWebinarAdRasters,
  verifyFrozenWebinarRaster,
  WEBINAR_AD_FONT_SHA256,
  WEBINAR_AD_GLYPHS_SHA256,
  webinarRasterSha256,
  WebinarAdRasterError,
  type WebinarAdRasterOutput,
} from "@oalo/rendering";
import { z } from "zod";

import {
  loadVerifiedWebinarArt,
  loadFrozenWebinarArt,
  readContainedWebinarFile,
  webinarPublicRoot,
} from "./webinar-ad-art.js";

export type WebinarAdPreparationRasterInput = Pick<
  WebinarAdCampaignManifest,
  "template" | "advertiser" | "content"
>;
const glyphSchema = z
  .array(
    z
      .tuple([
        z.number().int().nonnegative().max(0x10ffff),
        z.number().int().nonnegative().max(0x10ffff),
      ])
      .refine(([low, high]) => low <= high),
  )
  .max(10_000);

/** No request/manifest/image hash participates in raster production, keeping save hashing acyclic. */
export async function prepareWebinarAdRasters(
  input: WebinarAdPreparationRasterInput,
  publicRoot = webinarPublicRoot(),
): Promise<readonly [WebinarAdRasterOutput, WebinarAdRasterOutput]> {
  const art = await loadVerifiedWebinarArt(input.template, publicRoot);
  return renderVerifiedWebinarAssets(input, art, publicRoot);
}
async function renderVerifiedWebinarAssets(
  input: WebinarAdPreparationRasterInput,
  art: Readonly<{ tall: Uint8Array; square: Uint8Array }>,
  publicRoot: string,
): Promise<readonly [WebinarAdRasterOutput, WebinarAdRasterOutput]> {
  try {
    const font = await readContainedWebinarFile(
      publicRoot,
      ["fonts", "webinar", "AutomatedLOWebinarInter.ttf"],
      1024 * 1024,
    );
    const glyphs = await readContainedWebinarFile(
      publicRoot,
      ["fonts", "webinar", "glyph-ranges.json"],
      32 * 1024,
    );
    if (
      webinarRasterSha256(font.bytes) !== WEBINAR_AD_FONT_SHA256 ||
      webinarRasterSha256(glyphs.bytes) !== WEBINAR_AD_GLYPHS_SHA256
    )
      throw new WebinarAdRasterError("WEBINAR_RENDER_UNAVAILABLE");
    const glyphRanges = glyphSchema.parse(JSON.parse(Buffer.from(glyphs.bytes).toString("utf8")));
    return await renderWebinarAdRasters(
      {
        template: input.template,
        advertiser: input.advertiser,
        disclosureText: input.content.disclosureText,
      },
      { ...art, fontFile: font.path, glyphRanges },
    );
  } catch (error) {
    if (error instanceof WebinarAdRasterError) throw error;
    throw new WebinarAdRasterError("WEBINAR_RENDER_UNAVAILABLE", { cause: error });
  }
}

/** Reads and decisions regenerate only frozen identity/art/disclosure, never current brand defaults. */
export async function regenerateWebinarAdRasters(
  manifestValue: WebinarAdCampaignManifest,
  publicRoot = webinarPublicRoot(),
): Promise<readonly [WebinarAdRasterOutput, WebinarAdRasterOutput]> {
  try {
    const manifest = WebinarAdCampaignManifestSchema.parse(manifestValue);
    const art = await loadFrozenWebinarArt(manifest.template, publicRoot);
    const output = await renderVerifiedWebinarAssets(manifest, art, publicRoot);
    output.forEach((image, index) => verifyFrozenWebinarRaster(image, manifest.images[index]!));
    return output;
  } catch (error) {
    if (error instanceof WebinarAdRasterError) throw error;
    throw new WebinarAdRasterError("WEBINAR_RASTER_CHANGED", { cause: error });
  }
}

export { WebinarAdRasterError };
