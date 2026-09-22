/**
 * The words on the boundary-and-notice review page, in a copy module, because PRD-006b D6 says
 * every string a person reads or hears lives in one and the page is a page a person can open.
 *
 * Added by PRD-006d's reopened-row review on 2026-09-20 for the rubric's section 4 "Boundaries"
 * entry and the unverified-email notice, which were in the rubric and in no review and no suite.
 * Nothing here names a person, an address, or a workspace: the page is placeholders only.
 */

/** What the two boundaries call the page they could not finish. Matches the shell's own word. */
export const DESIGN_SURFACE_WORKSPACE_NAME = "your workspace";

export const DESIGN_SURFACE_TITLE = "States you cannot open by hand";

export const DESIGN_SURFACE_LEAD =
  "Each one is shown with placeholder details, so it can be reviewed and photographed like any other screen.";

/** The accessible name of each section, so a screen reader can move between the three. */
export const DESIGN_SURFACE_SECTIONS = Object.freeze({
  failure: "When a page cannot load",
  waiting: "While a page is still loading",
  unconfirmed: "Before an email address is confirmed",
});
