import type {
  CampaignStanding,
  CampaignVersionSummary,
  CampaignWorkspaceApprovalProjection,
} from "@oalo/application";
import type {
  AdsLibraryCallToAction,
  AdsLibraryTopic,
  CampaignState,
  ReportingMetric,
} from "@oalo/contracts";

import type { CampaignApprovalControlsProps } from "./components/campaign-approval-controls.js";
import type { LaunchBand } from "./launch-model.js";

/**
 * PRD-009e. What the two Campaigns pages are handed: plain data, already read under the session's
 * workspace and already decided about (which standing, which notices, which actions), so the
 * components that draw it make no decision of their own and are easy to test with a literal.
 *
 * No type here carries an address, an open house time, a Realtor, a contact, a lead, or a pipeline
 * (009E-AC-008): the projection these are built from has none of them, and the earlier open house
 * flow's property fields are never read at all (D4).
 */

/** The three figures the results card shows, in the shape of a campaign's reporting record (D1). */
export interface CampaignResultsInput {
  readonly spendCents: ReportingMetric;
  readonly leads: ReportingMetric;
  readonly costPerLeadCents: ReportingMetric;
}

/**
 * No live source feeds any figure in review mode, so every figure is `null` and the card says so in
 * words (MTK-009, 009E-AC-002). A future source supplies a record of the same shape.
 */
export const NO_LIVE_RESULTS: CampaignResultsInput = Object.freeze({
  spendCents: Object.freeze({ value: null, source: "meta" as const, updatedAt: null }),
  leads: Object.freeze({ value: null, source: "ghl" as const, updatedAt: null }),
  costPerLeadCents: Object.freeze({ value: null, source: "meta" as const, updatedAt: null }),
});

/** One library notice (009E-AC-006). Each carries at most one action, and the page draws it. */
export type CampaignNotice =
  | Readonly<{
      kind: "retired";
      /** The day the library took the ad out, when it recorded one. */
      retiredOn: string | null;
      /** True when nobody approved this version, so it can no longer be approved (009c D4). */
      blocksApproval: boolean;
      chooseAnotherAdHref: string | undefined;
    }>
  | Readonly<{ kind: "missing"; blocksApproval: boolean; chooseAnotherAdHref: string | undefined }>
  | Readonly<{ kind: "newer-version"; useNewVersion: UseNewVersionRequest | undefined }>
  | Readonly<{ kind: "brand-changed" }>;

/**
 * 009C-AC-009. The save the "Use the new version" action makes: the same campaign, the library ad's
 * highest version, that version's own words, and the budget, dates, and area the campaign already
 * has. It is exactly the body `POST /api/campaigns/preflight` takes, and carries nothing else.
 */
export interface UseNewVersionRequest {
  readonly campaignRef: string;
  readonly adId: string;
  readonly adVersion: number;
  readonly headline: string;
  readonly primaryText: string;
  readonly endsOn: string;
  readonly dailyBudgetDollars: number;
  readonly totalBudgetDollars: number;
  readonly places: readonly string[];
}

export interface CampaignPageCommon {
  readonly campaignRef: string;
  /** The campaign's own address, which is the newest version's. */
  readonly detailHref: string;
  readonly versionNo: number;
  /** False for an older version, which is read-only (D3). */
  readonly isLatest: boolean;
  readonly standing: CampaignStanding;
  /** The decision recorded on the version being shown, if any. */
  readonly decision?: CampaignWorkspaceApprovalProjection;
  /** The stored state of the newest version, which decides the approve control's wording. */
  readonly state: CampaignState;
  readonly savedAt: string;
  readonly savedByViewer: boolean;
  /** Every version, newest first (009E-AC-005). */
  readonly versions: readonly CampaignVersionSummary[];
  readonly campaignVersionRef: string;
  /** The blocking findings' plain fixes, which a "Needs changes" version shows (D8). */
  readonly fixes: readonly string[];
}

/** A campaign made from a library ad: the page of the design, with results, ad, and approval. */
export interface LibraryAdCampaignPage extends CampaignPageCommon {
  readonly kind: "library-ad";
  readonly name: string;
  readonly topic: AdsLibraryTopic | undefined;
  readonly ad: Readonly<{
    id: string;
    version: number;
    /** False when the catalog no longer holds this ad, so its picture cannot be shown. */
    inLibrary: boolean;
    alt: string;
    art: Readonly<{ tall: string; square: string }> | undefined;
    sample: boolean;
    callToAction: AdsLibraryCallToAction;
    /** The library's own words for this version, to tell which of the person's words changed. */
    defaults: Readonly<{ headline: string; primaryText: string }> | undefined;
  }>;
  readonly words: Readonly<{ headline: string; primaryText: string }>;
  readonly advertiser: LaunchBand;
  /** `YYYY-MM-DD`; `undefined` when the ad starts when it is launched. */
  readonly startsOn: string | undefined;
  readonly endsOn: string;
  readonly budget: Readonly<{ dailyDollars: number; totalDollars: number }>;
  readonly places: Readonly<{ states: readonly string[]; cities: readonly string[] }>;
  readonly results: CampaignResultsInput;
  readonly notices: readonly CampaignNotice[];
  /** True when the viewer may save a new version of this campaign. */
  readonly canMakeNewVersion: boolean;
  /** Where "Make a new version" goes: step 2 of "Launch an ad", prefilled from this campaign. */
  readonly makeNewVersionHref: string | undefined;
  /** The approve, send back, and hand-off card, for the newest version only. */
  readonly approvalControls: CampaignApprovalControlsProps | undefined;
}

/** D4. A campaign saved before PRD-009: read-only, one honest line, its words and decisions. */
export interface EarlierFlowCampaignPage extends CampaignPageCommon {
  readonly kind: "earlier-flow";
  readonly headline: string;
  readonly body: string;
  readonly disclosureText: string;
}

export type CampaignPageData = LibraryAdCampaignPage | EarlierFlowCampaignPage;

/** One row of the Campaigns list (009E-AC-009, 009E-AC-012). */
export interface CampaignListRow {
  readonly campaignRef: string;
  readonly href: string;
  /** The library ad's name, or the saved headline for an earlier campaign. */
  readonly name: string;
  readonly topic: AdsLibraryTopic | undefined;
  /** True for a campaign made with the earlier open house flow. */
  readonly earlierFlow: boolean;
  /** The ad's tall art, shown as a decorative thumbnail, when the catalog still holds it. */
  readonly thumbnail: string | undefined;
  readonly alt: string;
  readonly sample: boolean;
  /** `YYYY-MM-DD` for both, or `undefined` when the ad starts when launched or has no schedule. */
  readonly startsOn: string | undefined;
  readonly endsOn: string | undefined;
  readonly places: readonly string[];
  readonly standing: CampaignStanding;
  readonly decision: "approved" | "rejected" | undefined;
  readonly updatedAt: string;
}

/** The labels a standing is drawn with, so every screen draws one standing the same way. */
export type StandingTone = "success" | "warning" | "critical" | "info" | "neutral";

export function standingTone(
  standing: CampaignStanding,
  decision: "approved" | "rejected" | undefined,
): StandingTone {
  switch (standing) {
    case "approved":
    case "completed":
      return "success";
    case "preflight_failed":
      return "critical";
    case "awaiting_approval":
      return decision === "rejected" ? "warning" : "info";
    default:
      return "neutral";
  }
}

/**
 * "Oct 6", or "Oct 6, 2025" when the day is not in `currentYear`, read in UTC like every other date
 * on these pages, so the list says the same thing wherever the server runs.
 */
export function monthDay(isoDay: string, currentYear: number): string {
  const day = new Date(`${isoDay.slice(0, 10)}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(day.getUTCFullYear() === currentYear ? {} : { year: "numeric" as const }),
    timeZone: "UTC",
  }).format(day);
}
