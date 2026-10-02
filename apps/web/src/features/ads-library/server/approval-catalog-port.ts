import type { LibraryAdCatalogPort } from "@oalo/application";

import { loadAdsLibrary, type LoadedAdsLibrary } from "./catalog-loader.js";

/**
 * PRD-009c D4. The catalog port the approval command requires, composed from this feature's loader.
 *
 * The catalog is loaded on first use, under the same sample guard as every other read, so a
 * deployment resolves only real ads and a version built on a sample ad there is "missing". An open
 * house version never asks, so approving one never reads the catalog.
 */
export function createLibraryAdCatalogPort(
  environment: unknown = process.env,
  load: () => Promise<LoadedAdsLibrary> = () => loadAdsLibrary({ environment }),
): LibraryAdCatalogPort {
  let library: Promise<LoadedAdsLibrary> | undefined;
  return Object.freeze({
    async standingOf(ad: Readonly<{ id: string; version: number }>) {
      library ??= load();
      return (await library).standingOf(ad);
    },
  });
}
