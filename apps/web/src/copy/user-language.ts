import type { CampaignNextActionId } from "@oalo/application";
import type { ApplicationRole, CampaignState } from "@oalo/contracts";

/**
 * The words the product shows a loan officer, in one place.
 *
 * Governed by `library/knowledge/private/standards/user-language-contract.md` (PRD-006b D1 to D4
 * and D8). Every string here is read by a mortgage loan officer who has never seen this codebase,
 * so none of them may carry an internal noun, a reference, a hash, or a code. The contract's
 * forbidden-vocabulary guard scans this file like any other user-facing source.
 *
 * The not-connected strings are shared constants rather than literals in screens on purpose: they
 * are a compliance commitment (PRD-004 RGL-002), and a commitment that lives in nine components
 * drifts. Their meaning is fixed; only their wording moved when PRD-006b landed.
 */

/** One headline for the not-connected banner, used by the shell and by the not-connected screen. */
export const NOT_CONNECTED_HEADLINE = "Not connected yet";

/** The banner body. Names all three accounts and both things that cannot happen without them. */
export const NOT_CONNECTED_DISCLOSURE =
  "HighLevel, Meta, and Stripe aren't connected to this workspace yet, so nothing here is live and nothing can be published.";

/** The banner's accessible name. A screen reader hears the same fact the banner shows. */
export const NOT_CONNECTED_BANNER_LABEL = "Not connected yet: HighLevel, Meta, and Stripe";

/** One region's state, where the region names itself and the detail states the truth. */
export const NOT_CONNECTED_DETAIL = "Not connected yet.";

/** Where a region's value would have come from. */
export const NOT_CONNECTED_SOURCE = "HighLevel, Meta, and Stripe aren't connected.";

/** A metric's source line: what is missing, and what connecting it would show. */
export const NOT_LIVE_METRIC_SOURCE =
  "Not live yet. Connect Meta and HighLevel to see spend and leads here.";

/** A metric's freshness line when there is no reading to be fresh or stale about. */
export const NOT_LIVE_YET = "Not live yet";

/** What the user can do. The second sentence is the promise that nothing changes meanwhile. */
export const NOT_CONNECTED_NEXT_STEP =
  "Connect HighLevel, Meta, and Stripe when you're ready. Nothing here changes until you do.";

/** A navigation item the user cannot open until an account is connected. */
export const NOT_CONNECTED_NAVIGATION_DETAIL = "Available once your accounts are connected.";

/** A setup step that has nothing to check because nothing is connected. */
export const NOT_CONNECTED_SETUP_REASON =
  "Nothing to check yet. This step waits for a connected account.";

/** Who finishes that setup step. */
export const NOT_CONNECTED_SETUP_OWNER = "You, once you connect";

/** The four access groups, named for what the group means to the user. */
export const ACCESS_GROUP_LABELS = Object.freeze({
  required: "Access this app needs",
  granted: "Access this app confirms after you connect",
  missing: "Access this app tells you about when something is blocked",
  optional: "Optional access",
});

/** Short state words for one access group, so the raw group name never renders. */
export const ACCESS_GROUP_STATE_LABELS = Object.freeze({
  required: "Needed",
  granted: "Confirmed",
  missing: "Missing",
  optional: "Optional",
});

export const ACCESS_GROUP_DESCRIPTION =
  "You haven't connected HighLevel yet, so there's nothing to confirm here.";
export const ACCESS_NOTHING_CHECKED = "Nothing checked yet.";
export const ACCESS_NO_EFFECT_YET = "No effect until you connect.";

export const BRAND_PROFILE_SOURCE = "You haven't saved your brand details yet.";
export const BRAND_FIELD_VALUE = "Not saved yet";
export const BRAND_FIELD_SOURCE = "Not confirmed yet";
export const BRAND_MISSING_REASON = "You haven't confirmed this yet.";
export const BRAND_MISSING_NEXT_STEP = "Add it when you're ready.";
export const BRAND_SUGGESTION_VALUE = "No suggestion yet. Add a sample of your marketing first.";
export const BRAND_SUGGESTION_CONFIDENCE = "No suggestion yet";

/** One brand sample slot with nothing in it. The slot number keeps the list countable. */
export function brandSampleSlotLabel(position: number): string {
  return `Sample ${position}: nothing added yet`;
}

/** Plain labels for the brand field and suggestion states, so no raw token renders. */
export const BRAND_FIELD_STATE_LABELS: Readonly<Record<"confirmed" | "missing", string>> =
  Object.freeze({
    confirmed: "Confirmed",
    missing: "Not added yet",
  });

export const BRAND_SUGGESTION_STATE_LABELS: Readonly<Record<"needs_confirmation", string>> =
  Object.freeze({
    needs_confirmation: "Waiting for you",
  });

/**
 * What the product calls each role to the person who holds it (contract section 4).
 *
 * This is the only place a role becomes words. Anything that renders a role renders through here,
 * so `campaign_approver` never reaches a screen.
 */
export const ROLE_LABELS: Readonly<Record<ApplicationRole, string>> = Object.freeze({
  location_admin: "Workspace owner",
  campaign_creator: "Campaign creator",
  campaign_approver: "Approver",
  campaign_publisher: "Publisher",
  viewer: "Viewer",
  platform_support: "Support",
});

/** The lowercase form, for the middle of a sentence ("Only an approver can do this"). */
export function roleLabelInSentence(role: ApplicationRole): string {
  const label = ROLE_LABELS[role];
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/**
 * Who approved a campaign. This is a different, narrower set of roles from `ApplicationRole`: an
 * approval carries the authority the approver signed with, which can be the workspace owner's, a
 * lender's, or a Realtor's. They still render through a map, so no token reaches the record.
 */
export type ApprovalActorRole =
  "approver" | "lender_approver" | "location_admin" | "realtor_approver";

export const APPROVAL_ROLE_LABELS: Readonly<Record<ApprovalActorRole, string>> = Object.freeze({
  approver: "an approver",
  lender_approver: "a lender approver",
  location_admin: "the workspace owner",
  realtor_approver: "a Realtor approver",
});

/** Who can approve, said the same way everywhere it is said. */
export const APPROVER_OR_OWNER = "An approver or the workspace owner";
export const CAMPAIGN_CREATOR_PARTY = "The campaign creator";
export const WORKSPACE_OWNER_PARTY = "Your workspace owner";

/** The signed-in shell's account line. Two facts, neither borrowed from the other. */
export const SIGNED_IN_SOURCE =
  "Signed in with your email. HighLevel, Meta, and Stripe aren't connected yet.";

/** The shell above the workspace name. */
export const WORKSPACE_EYEBROW = "Your workspace";

/**
 * What the shell calls the person and the workspace when the name read yields nothing.
 *
 * D2 forbids an internal reference in anything a person reads, and the references the session
 * carries are exactly that: they begin with a forbidden prefix and mean nothing to anybody outside
 * the database. D3's replacements are "you" for the person and "your workspace" for the tenant, so
 * a shell with no name says those instead of showing a person their own row identifier. Neither
 * string claims a fact the read failed to establish.
 */
export const SESSION_USER_FALLBACK = "You";
export const SESSION_WORKSPACE_FALLBACK = "Your workspace";

export const SIGNED_OUT_HEADING = "You're signed out";
export const SIGNED_OUT_PROMPT = "Sign in to see your workspace";
export const SIGN_OUT_LABEL = "Sign out";

/**
 * The one collapsed region per screen where a reference, a fingerprint, a rule code, or a support
 * reference may appear, with plain labels (contract section 6).
 */
export const SUPPORT_DETAILS_SUMMARY = "Details for support";
export const SUPPORT_DETAILS_LABELS = Object.freeze({
  versionId: "Version ID",
  contentFingerprint: "Content fingerprint",
  checkFingerprint: "Check fingerprint",
  rule: "Rule",
  supportReference: "Support reference",
});

/**
 * What the support-reference row says when the request carried none.
 *
 * A failure that never reached the server, or one whose answer had no reference on it, still has
 * to show the row: a person who is told to contact support and then finds nothing to quote has
 * been sent away empty-handed. Saying so is the honest version of that row.
 */
export const SUPPORT_REFERENCE_NOT_RECORDED = "Not recorded";

/** The two words the campaign check ends in. Never "passed" or "blocked". */
export const CHECK_RESULT_READY = "Ready for approval";
export const CHECK_RESULT_NEEDS_CHANGES = "Needs changes";

/**
 * PRD-006d 006D-AC-011. What a field says when a save comes back naming it.
 *
 * The status line above the form already says what happened and what to do
 * ("Look over the fields marked below and try again."), so the field's own job
 * is to be the mark. One short sentence, connected to the control through the
 * field wrapper's `aria-describedby`, so a screen reader meets it on the field
 * rather than having to go looking for it.
 */
export const CAMPAIGN_FIELD_NEEDS_A_LOOK = "This one needs another look.";

/** What a campaign can and cannot do once it is saved and approved. */
export const CAMPAIGN_NOT_AN_AD_YET =
  "This campaign won't run as an ad yet. HighLevel and Meta aren't connected.";
export const CAMPAIGN_SAVED_NOTICE =
  "Saved to your workspace. This campaign won't run as an ad yet: HighLevel and Meta aren't connected.";

/**
 * Where a campaign stands, in the words a loan officer uses for it (contract sections 3 and 4).
 *
 * The three screens that show this used to make the words out of the stored state by taking the
 * underscores out of it, so `preflight_failed` read "Preflight failed" and put a D2 word in front
 * of the person whose campaign it was. A map keyed by `CampaignState` cannot do that: it is
 * exhaustive, so a new state is a typecheck failure until somebody writes the phrase for it, and
 * it is in this file, so the forbidden-vocabulary guard reads every phrase in it.
 *
 * `awaiting_approval` and `preflight_failed` deliberately borrow the two phrases the campaign
 * check already ends in. A campaign whose check passed and whose approval has not happened is the
 * same fact said twice on the same screen, and saying it two different ways would read as two
 * different facts.
 */
export const CAMPAIGN_STATE_LABELS: Readonly<Record<CampaignState, string>> = Object.freeze({
  draft: "Draft",
  generated: "Not checked yet",
  preflight_failed: CHECK_RESULT_NEEDS_CHANGES,
  awaiting_approval: CHECK_RESULT_READY,
  approved: "Approved",
  publishing: "Going live",
  live: "Live",
  paused: "Paused",
  completed: "Finished",
  archived: "Archived",
});

/**
 * What to do next about one campaign, keyed by the step the application layer named.
 *
 * The application layer used to carry these sentences itself, which put five user-facing lines
 * outside the D1 voice and outside every glob the vocabulary guard reads: "Review persisted
 * version evidence." and "Approve this exact persisted version." went to screens with three D2
 * words between them. It now returns a key and nothing in English, and the words live here with
 * the rest of the product's words.
 *
 * The map is exhaustive over `CampaignNextActionId`, so a new step cannot reach a screen without a
 * sentence.
 */
export const CAMPAIGN_NEXT_ACTION_LABELS: Readonly<Record<CampaignNextActionId, string>> =
  Object.freeze({
    review_evidence: "Look over this version and what the checks found.",
    approve_version: "Approve this version.",
    already_decided: "Someone has already decided on this version.",
    wait_for_approver: "Waiting for an approver to look at this version.",
    remediate_preflight: "Fix what the checks found, then save it again.",
    provider_publish: CAMPAIGN_NOT_AN_AD_YET,
  });
