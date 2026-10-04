import { AdsLibraryAdIdSchema } from "@oalo/contracts";

import {
  AdsLibraryArtRefusedError,
  adsLibrarySamplesEnabled,
  defaultAdsLibraryRoots,
  loadAdsLibrary,
  readContainedArt,
  type AdsLibraryRoots,
} from "./catalog-loader.js";

/**
 * PRD-009c D2, 009C-AC-016. Serves sample art by `(adId, version, shape)` and nothing else.
 *
 * The route answers 404 unless the sample guard passes (D3), so a deployment never serves it. With
 * samples on, each part must be exactly its type: a kebab id, a positive integer written without a
 * sign or leading zero, and `tall` or `square`. The entry is looked up in the loaded sample catalog,
 * and only that entry's derived art name is read, through the loader's contained read, which checks
 * the bytes against the catalog digest again. No part of the request ever becomes a path.
 */

const VERSION = /^[1-9][0-9]{0,2}$/u;
const SHAPES = new Set(["tall", "square"]);

function notFound(): Response {
  return Response.json(
    { error: "NOT_FOUND" },
    { status: 404, headers: { "cache-control": "no-store" } },
  );
}

function part(params: unknown, name: string): string | undefined {
  if (typeof params !== "object" || params === null) return undefined;
  const value: unknown = Reflect.get(params, name);
  return typeof value === "string" ? value : undefined;
}

export async function handleSampleArtRequest(
  params: unknown,
  environment: unknown = process.env,
  roots: AdsLibraryRoots = defaultAdsLibraryRoots(),
): Promise<Response> {
  if (!adsLibrarySamplesEnabled(environment)) return notFound();
  const adId = part(params, "adId");
  const version = part(params, "version");
  const shape = part(params, "shape");
  if (
    adId === undefined ||
    version === undefined ||
    shape === undefined ||
    !AdsLibraryAdIdSchema.safeParse(adId).success ||
    !VERSION.test(version) ||
    !SHAPES.has(shape)
  ) {
    return notFound();
  }
  const library = await loadAdsLibrary({ environment, roots });
  const loaded = library.find(adId, Number(version));
  if (loaded === undefined || loaded.source !== "sample") return notFound();
  const art = loaded.entry.images[shape === "tall" ? "tall" : "square"];
  try {
    const contained = await readContainedArt(roots.sampleArtRoot, art.art, art.sha256);
    return new Response(contained.bytes, {
      status: 200,
      headers: {
        "content-type": contained.contentType,
        "content-length": String(contained.bytes.byteLength),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AdsLibraryArtRefusedError) return notFound();
    throw error;
  }
}
