/**
 * PRD-009c part 2. The words of the "Ads library" tab and of "Use the new version", in one file the
 * user-language guard and the writing review read (`library/knowledge/private/standards/user-language-contract.md`).
 *
 * The tab strip's words live in `campaign-page-messages.ts` and the card's words in
 * `launch-messages.ts`; both belong to other lanes and are read, not copied. This file holds only
 * what the library page adds: its heading, the lead sentence, the count a screen reader hears when
 * a topic is chosen, and the newer-version notice with its confirm step.
 */

/** The Campaigns section's title, which both its tabs carry (design mockup `ads-library.html`). */
export const ADS_LIBRARY_PAGE_TITLE = "Campaigns";
export const ADS_LIBRARY_HEADING = "Ads library";

/**
 * The design's lead sentence as 009d D3 corrects it: nothing here promises a logo, because the
 * product has no logo upload. It is the same sentence the mockup (`ads-library.html`) draws.
 */
export const ADS_LIBRARY_LEAD =
  "Ready-made ads for loan officers, reviewed before they're added. Your name and NMLS number go on each one automatically. You can change the words; the image stays as it is.";

/** The line a screen reader hears after a topic chip filters the grid in place. */
export function adsShownStatus(count: number, topicLabel: string | undefined): string {
  const noun = count === 1 ? "ad" : "ads";
  return topicLabel === undefined
    ? `Showing all ${String(count)} ${noun}.`
    : `Showing ${String(count)} ${noun} about ${topicLabel}.`;
}

/** The accessible suffix that tells eight "Use this ad" links apart. */
export function useThisAdSuffix(adName: string): string {
  return `: ${adName}`;
}

/** 009C-AC-009 and design section 5.5: shown for a campaign version on an older version of its ad. */
export const NEWER_VERSION_NOTICE = "A newer version of this ad is in the library.";
export const USE_NEW_VERSION = "Use the new version";
export const USE_NEW_VERSION_CONFIRM = "Yes, use the new version";
export const USE_NEW_VERSION_EXPLANATION =
  "Your headline and ad text will be replaced with the words from the newer version of this ad.";
export const USE_NEW_VERSION_WHO = "The campaign creator or your workspace owner";
export const USE_NEW_VERSION_CONFIRMATION = Object.freeze({
  title: "Use the new version of this ad?",
  effect:
    "Saves a new version of this campaign on the newer version of the ad. Your headline and ad text are replaced with the newer words.",
  scope: "Your budget, dates and area are kept. The version you have now stays as it is.",
  result:
    "The new version opens for you to review. It gets its own checks and needs its own approval.",
});
export const USE_NEW_VERSION_SAVING = "Saving the new version";
export const USE_NEW_VERSION_SAVED_NOTHING = "Nothing has changed yet";
export const USE_NEW_VERSION_FAILED = "We couldn't save the new version. Nothing was saved.";
