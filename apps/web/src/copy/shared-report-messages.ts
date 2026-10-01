/**
 * What a homeowner reads when a report link will not open.
 *
 * Governed by `library/knowledge/private/standards/user-language-contract.md` (PRD-006b D1 to D4).
 * The reader here is not a loan officer: it is a homeowner who was sent a link, has never seen this
 * product, and knows only that the link did not work.
 *
 * One page answers every link that cannot be shown, and it says the same thing for all of them: a
 * link nobody made, a link that has expired, and a link its sender turned off. Telling them apart
 * would tell a stranger which links exist, so the sentences list what could have happened and
 * confirm none of it.
 */
export const SHARED_REPORT_UNAVAILABLE_TITLE = "This report link isn't available";

/** What could have happened, then the one thing the homeowner can do about it. */
export const SHARED_REPORT_UNAVAILABLE_BODY =
  "The link may have expired, been turned off, or been copied incompletely. Ask the person who sent it to you for a new link.";
