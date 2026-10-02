import type { AuthenticatedPrincipal } from "@oalo/application";
import { ADS_LIBRARY_TOPICS, type AdsLibraryTopic } from "@oalo/contracts";

import { loadAdsLibrary } from "../../../../../features/ads-library/server/catalog-loader.js";
import type { LaunchAdCard, LaunchBand } from "../../../../../features/campaigns/launch-model.js";
import { readSavedAdBrand, type SavedAdBrand } from "../../../../../server/ad-brand-read.js";
import {
  resolveAuthenticatedReadPrincipal,
  UnauthenticatedPrincipalError,
} from "../../../../../server/authenticated-principal.js";
import { activeLibraryCards, PLACEHOLDER_BAND } from "../../../../../server/launch-an-ad.js";
import { resolveRuntimeCampaignCommandPorts } from "../../../../../server/runtime-authentication.js";
import { WorkspacePreferenceError } from "../../../../../server/workspace-preferences.js";

/**
 * PRD-009c part 2. What the "Ads library" tab is handed: the ads a person can choose today as
 * display cards, the topic the address names, and the signed-in person's own brand for the band.
 *
 * The cards come from the catalog loader, which asks the sample guard on every call: the flag and
 * the environment are read raw each time, so nothing is decided at build time (009C-AC-004). A card
 * carries display fields only (009C-AC-013): the entry's compliance notes and approval block stay on
 * the server. The address is typed, so a topic the page does not know reads as no topic at all.
 */

export interface AdsLibraryPageData {
  readonly topic: AdsLibraryTopic | undefined;
  readonly cards: readonly LaunchAdCard[];
  readonly advertiser: LaunchBand;
}

type Search = Readonly<Record<string, string | readonly string[] | undefined>>;

/** `?topic=` is one of the five topic ids, once; anything else is ignored. */
export function parseLibraryTopic(search: Search): AdsLibraryTopic | undefined {
  const topic = search["topic"];
  return typeof topic === "string" && (ADS_LIBRARY_TOPICS as readonly string[]).includes(topic)
    ? (topic as AdsLibraryTopic)
    : undefined;
}

export interface AdsLibraryPagePorts {
  readonly readBrand?: (
    principal: Readonly<AuthenticatedPrincipal>,
    environment: unknown,
  ) => Promise<Pick<SavedAdBrand, "band">>;
}

/**
 * The band is the viewer's own saved Brand. Support cannot open a person's Brand, and sees the
 * placeholder band, as "Launch an ad" shows it.
 */
async function bandFor(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
  readBrand: NonNullable<AdsLibraryPagePorts["readBrand"]>,
): Promise<LaunchBand> {
  try {
    return (await readBrand(principal, environment)).band;
  } catch (error) {
    if (error instanceof WorkspacePreferenceError) return PLACEHOLDER_BAND;
    throw error;
  }
}

export async function loadAdsLibraryPage(
  principal: Readonly<AuthenticatedPrincipal>,
  search: Search,
  environment: unknown,
  ports: AdsLibraryPagePorts = {},
): Promise<AdsLibraryPageData> {
  const [library, advertiser] = await Promise.all([
    loadAdsLibrary({ environment }),
    bandFor(principal, environment, ports.readBrand ?? readSavedAdBrand),
  ]);
  return Object.freeze({
    topic: parseLibraryTopic(search),
    cards: activeLibraryCards(library),
    advertiser,
  });
}

export type AdsLibraryPageRead =
  | Readonly<{ authenticated: false }>
  | Readonly<{ authenticated: true; data: AdsLibraryPageData }>;

async function principalFor(
  request: Request,
  environment: unknown,
): Promise<Readonly<AuthenticatedPrincipal> | undefined> {
  try {
    return await resolveAuthenticatedReadPrincipal(
      request,
      environment,
      resolveRuntimeCampaignCommandPorts(environment),
    );
  } catch (error) {
    if (error instanceof UnauthenticatedPrincipalError) return undefined;
    throw error;
  }
}

/**
 * The tab shows the viewer's own brand on every ad, so it is a page for a session: a visitor with
 * none is told so apart from an empty library, and the page sends them to sign in.
 */
export async function readAdsLibraryPageForRequest(
  request: Request,
  search: Search,
  environment: unknown = process.env,
): Promise<AdsLibraryPageRead> {
  const principal = await principalFor(request, environment);
  if (principal === undefined) return { authenticated: false };
  return { authenticated: true, data: await loadAdsLibraryPage(principal, search, environment) };
}

/**
 * The dashboard preview has no session and runs as `preview`, so the sample guard refuses and its
 * library is the real catalog, which is empty (009c D3).
 */
export async function loadPreviewAdsLibraryPage(
  search: Search,
  environment: unknown = process.env,
): Promise<AdsLibraryPageData> {
  const library = await loadAdsLibrary({ environment });
  return Object.freeze({
    topic: parseLibraryTopic(search),
    cards: activeLibraryCards(library),
    advertiser: PLACEHOLDER_BAND,
  });
}
