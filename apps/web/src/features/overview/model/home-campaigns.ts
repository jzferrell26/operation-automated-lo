import {
  libraryAdRefusalFor,
  type LibraryAdCatalogStanding,
  type RecordedLibraryAd,
} from "@oalo/application";
import type { CampaignState } from "@oalo/contracts";

import { CHECK_RESULT_READY, campaignStateLabel } from "../../../copy/user-language.js";

/**
 * PRD-009b 009B-AC-009 and 009B-AC-010. Which campaigns Home's two lists show.
 *
 * The facts come from the server read (`apps/web/src/server/home-reads.ts`), which asks the
 * application layer's own projection and the ads catalog; the rules that choose among them are
 * here, pure, so every state of 009B-AC-010 is a plain unit case.
 */

/** Three rows, then a link to the rest (009B-AC-009). */
export const HOME_LIST_LIMIT = 3;

export type HomeCampaignFacts = Readonly<{
  campaignRef: string;
  /** The ad's name from the library when the catalog has it, otherwise the campaign's headline. */
  name: string;
  detailHref: string;
  /** Null-ish when the campaign starts "when you launch it". */
  startsAt: string | undefined;
  endsAt: string | undefined;
  state: CampaignState;
  /** The decision recorded on the latest version, if any. A send-back is `rejected`. */
  decision: "approved" | "rejected" | undefined;
  updatedAt: string;
  /**
   * The application layer's own answer to "would the approval command accept this person's
   * decision right now": an approving role, the campaign awaiting approval, nothing blocking.
   */
  canApprove: boolean;
  /**
   * False when the campaign's library ad is retired, replaced, missing, or has other art than the
   * version recorded: the approval command refuses it, so it is not waiting for anybody.
   */
  adAvailable: boolean;
  /** True when the campaign was built on a sample ad (009C-AC-005 asks every such place to say so). */
  sample: boolean;
}>;

export type HomeCampaignRow = Readonly<{
  campaignRef: string;
  name: string;
  href: string;
  startsAt: string | undefined;
  endsAt: string | undefined;
  statusLabel: string;
  sample: boolean;
}>;

export type HomeList = Readonly<{
  rows: readonly HomeCampaignRow[];
  /** Every campaign the list would hold, so "See all campaigns" is honest about the rest. */
  total: number;
}>;

/**
 * 009B-AC-010. Whether the approval command would still accept this library ad: the version is in
 * the catalog, neither it nor the ad's newest version was retired, it is the newest version, and
 * both pictures are the bytes the version recorded.
 *
 * The command's own rule, `libraryAdRefusalFor`, answers this (QA-06): Home asks the function the
 * command calls, so it never lists, as waiting for an approver, a campaign that command would
 * refuse, and the two cannot drift apart.
 */
export function libraryAdStillApprovable(
  recorded: RecordedLibraryAd,
  standing: LibraryAdCatalogStanding | undefined,
): boolean {
  return libraryAdRefusalFor(recorded, standing) === undefined;
}

function newestFirst(left: HomeCampaignFacts, right: HomeCampaignFacts): number {
  return right.updatedAt.localeCompare(left.updatedAt);
}

function rowOf(facts: HomeCampaignFacts, statusLabel: string): HomeCampaignRow {
  return Object.freeze({
    campaignRef: facts.campaignRef,
    name: facts.name,
    href: facts.detailHref,
    startsAt: facts.startsAt,
    endsAt: facts.endsAt,
    statusLabel,
    sample: facts.sample,
  });
}

function listOf(
  matching: readonly HomeCampaignFacts[],
  statusFor: (facts: HomeCampaignFacts) => string,
) {
  const ordered = [...matching].sort(newestFirst);
  return Object.freeze({
    rows: Object.freeze(
      ordered.slice(0, HOME_LIST_LIMIT).map((facts) => rowOf(facts, statusFor(facts))),
    ),
    total: ordered.length,
  });
}

/** "Running now": the live campaigns. PRD-009 can never produce one, so this is empty on a real account. */
export function buildRunningList(campaigns: readonly HomeCampaignFacts[]): HomeList {
  return listOf(
    campaigns.filter((facts) => facts.state === "live"),
    (facts) => campaignStateLabel(facts.state, facts.decision),
  );
}

/**
 * "Needs your approval" (D3). For a person who can approve, the campaigns whose latest version
 * passed its checks and has no recorded decision. `canApprove` on the facts already says the state
 * is awaiting approval and nothing blocks it; the recorded decision is what keeps a version that
 * was sent back out, because a send-back leaves the state where it was. A person who cannot approve
 * gets no list at all, so the card is not drawn for them.
 */
export function buildApprovalList(
  campaigns: readonly HomeCampaignFacts[],
  viewerCanApprove: boolean,
): HomeList | undefined {
  if (!viewerCanApprove) return undefined;
  return listOf(
    campaigns.filter(
      (facts) => facts.canApprove && facts.decision === undefined && facts.adAvailable,
    ),
    () => CHECK_RESULT_READY,
  );
}
