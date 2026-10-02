import { SHELL_WORDMARK } from "./shell-messages.js";

/**
 * PRD-009 writing review pass 1, W-13. The words in a browser tab and in a screen reader's list of
 * pages. Page titles are governed copy (the user-language contract's opening paragraph) and WCAG
 * 2.4.2 asks that each page's title say what the page is.
 *
 * Every page used to share the one title "Operation Automated LO", which is not the product's name
 * (the wordmark is "Automated LO", D-14) and told a person nothing about which tab was which. The
 * root layout now sets a default and a template, so a page names itself and the product follows:
 * "Campaigns | Automated LO".
 *
 * A title that already carries the product's name ("Sign in to Automated LO") is set `absolute` by its
 * page so the name is not said twice, and the homeowner's shared report page is `absolute` so the
 * product's name is not added to a page a loan officer's client opens.
 */

/** What a tab says when a page names nothing: the product's own name. */
export const DEFAULT_PAGE_TITLE = SHELL_WORDMARK;

/** `%s` is the page's own title. */
export const PAGE_TITLE_TEMPLATE = `%s | ${SHELL_WORDMARK}`;

/** The site description, said once for search results and link previews. */
export const SITE_DESCRIPTION =
  "Automated LO: launch ready-made Facebook ads for loan officers, with every approval saved by name.";

/** The signed-in pages' own titles. The menu's words are used where the page is a menu item. */
export const PAGE_TITLES = Object.freeze({
  home: "Home",
  campaigns: "Campaigns",
  adsLibrary: "Ads library",
  launchAnAd: "Launch an ad",
  /** A campaign's page is titled by its ad's name; this is what a tab says when the name is not known. */
  campaign: "Campaign",
  brand: "Brand",
  /**
   * Writing review closing check, N-1. The five pages pass 1 left out. "Connections" is the page every
   * "See what's needed" link opens, "Realtor partners" is a menu item, and the other three are the
   * Settings page and the two it links to. Each is the page's own name, as its heading and its link say it.
   */
  connections: "Connections",
  settings: "Settings",
  partners: "Realtor partners",
  routing: "Where new leads go",
  billing: "Plan and usage",
  gone: "Page gone",
});
