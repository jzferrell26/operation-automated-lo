/**
 * PRD-009e. The words of the Campaigns page, its tab strip, and the campaign page, in one file, so
 * the writing review reads them in one place (user-language contract, section 5). 009e owns this
 * file; the library tab (009c part 2) reads the tab strip's words from it.
 *
 * Several strings here say "Not live yet". That phrase lives in this file on purpose: the
 * default-off security test reads the campaign screens for the words live, launched, and running,
 * and the one place a screen is allowed to say a figure is not live yet is a copy module.
 */

import type { ReportingMetricSource } from "@oalo/contracts";

/** 009E-AC-009. The Campaigns page's two tabs, in the design's order. */
export const CAMPAIGNS_TABS = Object.freeze({
  label: "Campaigns sections",
  campaigns: "Your campaigns",
  library: "Ads library",
});

/** The Campaigns page, 009E-AC-009 to 011. */
export const CAMPAIGNS_PAGE = Object.freeze({
  title: "Campaigns",
  lead: "Every ad you've set up, newest first. Open one to see the ad, its approval and its results.",
  tableLabel: "Your campaigns, newest first",
  action: "Launch an ad",
  emptyTitle: "No campaigns yet",
  emptyDescription: "Pick an ad from the library to set up your first one.",
});

export const CAMPAIGN_COLUMNS = Object.freeze({
  ad: "Ad",
  topic: "Topic",
  runs: "Runs",
  where: "Where it shows",
  status: "Status",
  lastChange: "Last change",
});

/** 009E-AC-012. What a campaign saved before PRD-009 is called in the Topic column. */
export const EARLIER_FLOW_TOPIC = "Earlier flow";
/** A library ad the catalog no longer holds has no topic to show. */
export const TOPIC_NOT_IN_LIBRARY = "Not in the library";
export const RUNS_NOT_SET = "Not set";
export const WHERE_NOT_SET = "Not set";

/** "Oct 6 to Oct 20", or "Until Oct 20" when the ad starts when it is launched. */
export function runsRange(startsOn: string | undefined, endsOn: string): string {
  return startsOn === undefined ? `Until ${endsOn}` : `${startsOn} to ${endsOn}`;
}

/** "Austin, TX", or "Austin, TX and 2 more" when the ad shows in several places. */
export function wherePreview(first: string, others: number): string {
  if (others <= 0) return first;
  return `${first} and ${String(others)} more`;
}

/** The thumbnail beside an ad's name is decorative; the name beside it is the link. */
export const THUMBNAIL_ALT = "";

/** The campaign page, 009E-AC-001. */
export function libraryEyebrow(topic: string | undefined): string {
  return topic === undefined ? "From the ads library" : `From the ads library, ${topic}`;
}
export const FIXES_TITLE = "What to fix";
export const EARLIER_FLOW_EYEBROW = "Campaign";
export const EARLIER_FLOW_LINE = "Made with the earlier open house flow.";
export const LAUNCH_AN_AD_INSTEAD = "Launch an ad";

/** "Runs from launch until Oct 20, 2026, in Austin, TX. $25 a day, up to $350 in total." */
export function runLine(parts: {
  startsOn: string | undefined;
  endsOn: string;
  places: string;
  daily: string;
  total: string;
}): string {
  const when =
    parts.startsOn === undefined
      ? `Runs from launch until ${parts.endsOn}`
      : `Runs from ${parts.startsOn} until ${parts.endsOn}`;
  return `${when}, in ${parts.places}. ${parts.daily} a day, up to ${parts.total} in total.`;
}

/** Joins places for a sentence: "a", "a and b", "a; b; and c" (a city already holds a comma). */
export function listPlaces(places: readonly string[]): string {
  if (places.length <= 1) return places[0] ?? "";
  if (places.length === 2) return `${places[0] ?? ""} and ${places[1] ?? ""}`;
  return `${places.slice(0, -1).join("; ")}; and ${places.at(-1) ?? ""}`;
}

/** The results card, 009E-AC-002 and D1. */
export const RESULTS = Object.freeze({
  title: "Results",
  chip: "Not live yet",
  figureNotLive: "Not live yet",
  notLiveSentence:
    "This ad isn't running, so there is nothing to count yet. Spend comes from Meta, and leads are counted when they reach HighLevel.",
  spend: "Spend",
  leads: "Leads sent to HighLevel",
  costPerLead: "Cost per lead",
});

/** Where a figure comes from, said as the product names it. */
export const RESULT_SOURCE_NAMES: Readonly<Record<ReportingMetricSource, string>> = Object.freeze({
  meta: "Meta",
  ghl: "HighLevel",
  application: "Automated LO",
});

export function resultSourceLine(source: string): string {
  return `Source: ${source}`;
}
export function resultUpdatedLine(updatedAt: string): string {
  return `Updated ${updatedAt}`;
}
export const RESULT_UPDATED_UNKNOWN = "Update time not recorded";

/** The ad card, 009E-AC-003. */
export const AD_CARD = Object.freeze({
  title: "The ad",
  previewLabel: "Facebook feed preview of the ad",
  pictureMissing: "The picture for this ad isn't available.",
  libraryAd: "Library ad",
  words: "Words",
  shows: "Shows to",
});
export function versionLabel(versionNo: number): string {
  return `Version ${String(versionNo)}`;
}
export function showsLine(places: readonly string[], feed: string): string {
  return [...places, feed].join(", ");
}

/** The approval card, 009E-AC-004 and D2. */
export const APPROVAL = Object.freeze({
  title: "Approval",
  nobody: "Nobody has approved this version yet.",
  covers:
    "The approval covers this version and these words only. A new version needs its own approval.",
});

/** The role as a noun in "Approved by Alex Morgan, workspace owner, on Oct 1, 2026." */
export const APPROVER_ROLE_NOUNS: Readonly<
  Record<"approver" | "lender_approver" | "location_admin" | "realtor_approver", string>
> = Object.freeze({
  approver: "approver",
  lender_approver: "lender approver",
  location_admin: "workspace owner",
  realtor_approver: "Realtor approver",
});

/** Who made a decision: the name recorded at the time, when there is one, and always the role. */
export type DecisionWho = Readonly<{
  name: string | undefined;
  roleNoun: string;
  rolePhrase: string;
}>;

/**
 * The words around a decision's date, split so a screen can show the name as text, in its own
 * element, beside the role: "Approved by " + name + ", workspace owner, on " + date + ".", or
 * "Approved by the workspace owner on " + date + "." for a decision recorded without a name (D2).
 */
export function decisionParts(
  verb: string,
  who: DecisionWho,
): Readonly<{ lead: string; name: string | undefined; trail: string }> {
  return who.name === undefined
    ? { lead: `${verb} by ${who.rolePhrase} on `, name: undefined, trail: "" }
    : { lead: `${verb} by `, name: who.name, trail: `, ${who.roleNoun}, on ` };
}

/** The versions list, 009E-AC-005. */
export const VERSIONS = Object.freeze({
  title: "Versions",
  open: "Open",
  viewing: "Viewing now",
});
export function savedLine(savedOn: string, byViewer: boolean): string {
  return byViewer ? `Saved on ${savedOn} by you` : `Saved on ${savedOn}`;
}
export function decidedLine(verb: "Approved" | "Sent back", on: string, who: DecisionWho): string {
  return who.name === undefined
    ? `${verb} on ${on} by ${who.rolePhrase}`
    : `${verb} on ${on} by ${who.name}, ${who.roleNoun}`;
}

/** An older version's own page, 009E-AC-005 and D3. */
export const OLDER_VERSION = Object.freeze({
  notice:
    "You're looking at an older version. It can't be approved, launched or changed from here.",
  seeLatest: "See the latest version",
});

/** The library notices, 009E-AC-006. */
export const NOTICES = Object.freeze({
  chooseAnotherAd: "Choose another ad",
  useNewVersion: "Use the new version",
  newerVersion: "A newer version of this ad is in the library.",
  brandChanged: "Brand changed after this version was saved. Make a new version to use it.",
  missingUndecided: "This ad isn't in the library, so this version can't be approved.",
  missingApproved: "This ad isn't in the library. This campaign keeps the version you approved.",
});
export function retiredKept(retiredOn: string): string {
  return `This ad was taken out of the library on ${retiredOn}. This campaign keeps the version you approved.`;
}

/** "Use the new version" asks first (009C-AC-009), then saves a new version of the campaign. */
export const USE_NEW_VERSION = Object.freeze({
  question:
    "Use the new version of this ad? Your headline and ad text are replaced with the new version's words. Your budget, dates and area are kept.",
  confirm: "Yes, use the new version",
  cancel: "Cancel",
  saving: "Saving the new version",
});

/** The earlier open house flow, D4 and 009E-AC-012. */
export const EARLIER_FLOW = Object.freeze({
  wordsTitle: "The saved words",
  headline: "Headline",
  adText: "Ad text",
  disclosure: "Disclosure",
});

/** The support details, 009E-AC-007. The library ad's identifier lives only in this region. */
export const SUPPORT_LABELS = Object.freeze({
  libraryAd: "Library ad",
});
export function supportLibraryAd(id: string, version: number): string {
  return `${id}, version ${String(version)}`;
}
